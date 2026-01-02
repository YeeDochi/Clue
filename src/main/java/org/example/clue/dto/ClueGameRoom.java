package org.example.clue.dto;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class ClueGameRoom extends BaseGameRoom {

    private List<Card> answerEnvelope = new ArrayList<>();
    private List<String> turnOrder = new ArrayList<>();
    private int currentTurnIdx = 0;

    // 플레이어 캐릭터 및 위치 정보
    private Map<String, String> playerCharacters = new ConcurrentHashMap<>();
    private Map<String, String> playerLocations = new ConcurrentHashMap<>();
    private Set<String> eliminatedPlayers = new HashSet<>();

    private enum TurnPhase { ROLL, MOVE, ACTION, END }
    private TurnPhase currentPhase = TurnPhase.ROLL;
    private int diceValue = 0;
    private int movesLeft = 0;

    private String suggestorId = null;
    private String refuterId = null;

    public ClueGameRoom(String name) {
        super(name);
    }

    @Override
    public GameMessage handleAction(GameMessage message) {
        Map<String, Object> data = message.getData();
        String actionType = (String) data.getOrDefault("actionType", "");
        String senderId = message.getSenderId();

        if (actionType.equals("START")) {
            return startGame();
        }

        if (!playing) {
            return createSystemMessage("ERROR", "게임이 시작되지 않았습니다.");
        }

        if (eliminatedPlayers.contains(senderId) && !actionType.equals("RESPONSE")) {
            return createSystemMessage("ERROR", "탈락자는 반박만 가능합니다.");
        }
        if (!actionType.equals("RESPONSE") && !isMyTurn(senderId)) {
            return createSystemMessage("ERROR", "당신의 차례가 아닙니다.");
        }

        switch (actionType) {
            case "ROLL_DICE": return handleRollDice(senderId);
            case "MOVE": return handleMove(senderId, (String) data.get("location"));
            case "MOVE_PATH": return handleMovePath(senderId, (List<String>) data.get("path"));
            case "SECRET_PASSAGE": return handleSecretPassage(senderId, (String) data.get("location"));
            case "SUGGEST": return handleSuggest(senderId, data);
            case "RESPONSE": return handleResponse(senderId, data);
            case "ACCUSE": return handleAccuse(senderId, data);
            case "TURN_END": return handleTurnEnd(senderId);
        }
        return null;
    }

    private GameMessage startGame() {
        if (users.isEmpty()) return createSystemMessage("ERROR", "유저가 없습니다.");

        this.playing = true;
        this.turnOrder = new ArrayList<>(users.keySet());
        Collections.shuffle(turnOrder);
        this.currentTurnIdx = 0;
        this.currentPhase = TurnPhase.ROLL;
        this.eliminatedPlayers.clear();
        this.playerCharacters.clear();
        this.playerLocations.clear();

        List<Card> deck = initializeDeck();
        extractAnswer(deck);
        distributeCards(deck);
        assignCharactersAndPositions();

        GameMessage msg = createSystemMessage("GAME_STARTED", "게임 시작! 캐릭터가 배정되었습니다.");
        msg.setData(getGameSnapshot());
        return msg;
    }

    private void assignCharactersAndPositions() {
        String[] characters = {"SCARLET", "MUSTARD", "WHITE", "GREEN", "PEACOCK", "PLUM"};
        Map<String, String> startPos = new HashMap<>();
        startPos.put("WHITE", "9-0");
        startPos.put("GREEN", "0-5");
        startPos.put("PEACOCK", "21-3");
        startPos.put("MUSTARD", "0-14");
        startPos.put("PLUM", "21-18");
        startPos.put("SCARLET", "8-21");

        int idx = 0;
        for (String pid : turnOrder) {
            String charName = characters[idx % characters.length];
            playerCharacters.put(pid, charName);
            playerLocations.put(pid, startPos.getOrDefault(charName, "10-11"));
            idx++;
        }
    }

    private GameMessage handleRollDice(String playerId) {
        if (currentPhase != TurnPhase.ROLL) return createSystemMessage("ERROR", "주사위 단계가 아닙니다.");
        this.diceValue = (int)(Math.random() * 6) + (int)(Math.random() * 6) + 2;
        this.movesLeft = this.diceValue;
        this.currentPhase = TurnPhase.MOVE;

        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType("DICE_ROLLED");
        msg.setSender(users.get(playerId).getNickname());

        Map<String, Object> data = getGameSnapshot();
        data.put("dice", diceValue);
        data.put("playerId", playerId);
        msg.setData(data);
        return msg;
    }

    private GameMessage handleMove(String playerId, String targetLocation) {
        if (currentPhase != TurnPhase.MOVE) return createSystemMessage("ERROR", "이동 단계가 아닙니다.");
        if (movesLeft <= 0) return createSystemMessage("ERROR", "이동력이 부족합니다.");

        String currentLoc = playerLocations.get(playerId);

        if (currentLoc.contains("-") && targetLocation.contains("-")) {
            String[] c = currentLoc.split("-");
            String[] t = targetLocation.split("-");
            int dist = Math.abs(Integer.parseInt(c[0]) - Integer.parseInt(t[0]))
                    + Math.abs(Integer.parseInt(c[1]) - Integer.parseInt(t[1]));
            if (dist > 1) return createSystemMessage("ERROR", "인접한 칸으로만 이동할 수 있습니다.");
        }

        playerLocations.put(playerId, targetLocation);
        movesLeft--;

        if (targetLocation.startsWith("Room:")) {
            movesLeft = 0;
            currentPhase = TurnPhase.ACTION;
        } else if (movesLeft == 0) {
            currentPhase = TurnPhase.END;
        }

        GameMessage msg = new GameMessage();
        msg.setType("MOVED");
        msg.setData(getGameSnapshot());
        return msg;
    }

    private GameMessage handleSecretPassage(String playerId, String targetLocation) {
        if (currentPhase != TurnPhase.ROLL && currentPhase != TurnPhase.MOVE) {
            return createSystemMessage("ERROR", "비밀 통로는 턴 시작 시 또는 이동 단계에서만 사용 가능합니다.");
        }

        String currentLoc = playerLocations.get(playerId);
        if (!checkSecretPassage(currentLoc, targetLocation)) {
            return createSystemMessage("ERROR", "연결된 비밀 통로가 없습니다.");
        }

        playerLocations.put(playerId, targetLocation);
        this.movesLeft = 0;
        this.currentPhase = TurnPhase.ACTION;

        GameMessage msg = new GameMessage();
        msg.setType("MOVED");
        msg.setSender(users.get(playerId).getNickname());
        msg.setContent(users.get(playerId).getNickname() + "님이 비밀 통로를 이용했습니다.");
        msg.setData(getGameSnapshot());
        return msg;
    }

    private boolean checkSecretPassage(String current, String target) {
        if (!current.startsWith("Room:") || !target.startsWith("Room:")) return false;
        String r1 = current.split(":")[1];
        String r2 = target.split(":")[1];
        if ((r1.equals("KITCHEN") && r2.equals("STUDY")) || (r1.equals("STUDY") && r2.equals("KITCHEN"))) return true;
        if ((r1.equals("CONSERVATORY") && r2.equals("LOUNGE")) || (r1.equals("LOUNGE") && r2.equals("CONSERVATORY"))) return true;
        return false;
    }

    @Override
    public Map<String, Object> getGameSnapshot() {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("roomId", this.roomId);
        snapshot.put("playing", this.playing);
        snapshot.put("users", this.users);
        snapshot.put("turnOrder", this.turnOrder);
        snapshot.put("currentTurn", turnOrder.isEmpty() ? null : turnOrder.get(currentTurnIdx));
        snapshot.put("playerLocations", this.playerLocations);
        snapshot.put("playerCharacters", this.playerCharacters);
        snapshot.put("currentPhase", this.currentPhase);
        snapshot.put("movesLeft", this.movesLeft);
        return snapshot;
    }

    private GameMessage createSystemMessage(String type, String content) {
        GameMessage msg = new GameMessage(); msg.setRoomId(roomId); msg.setType(type); msg.setSender("SYSTEM"); msg.setContent(content); return msg;
    }
    private boolean isMyTurn(String playerId) { return playing && !turnOrder.isEmpty() && turnOrder.get(currentTurnIdx).equals(playerId); }
    private GameMessage handleTurnEnd(String playerId) { nextTurn(); GameMessage msg = createSystemMessage("NEXT_TURN", "다음 턴입니다."); msg.setData(getGameSnapshot()); return msg; }
    private void nextTurn() { if (turnOrder.isEmpty()) return; do { currentTurnIdx = (currentTurnIdx + 1) % turnOrder.size(); } while (eliminatedPlayers.contains(turnOrder.get(currentTurnIdx)) && eliminatedPlayers.size() < users.size()); currentPhase = TurnPhase.ROLL; movesLeft = 0; }

    private List<Card> initializeDeck() { List<Card> deck = new ArrayList<>(); String[] suspects = {"MUSTARD", "PLUM", "GREEN", "PEACOCK", "SCARLET", "WHITE"}; for(String s : suspects) deck.add(new Card(Card.CardType.SUSPECT, s, null)); String[] weapons = {"KNIFE", "CANDLESTICK", "REVOLVER", "ROPE", "LEAD_PIPE", "WRENCH"}; for(String w : weapons) deck.add(new Card(Card.CardType.WEAPON, w, null)); String[] rooms = {"HALL", "LOUNGE", "DINING", "KITCHEN", "BALLROOM", "CONSERVATORY", "BILLIARD", "LIBRARY", "STUDY"}; for(String r : rooms) deck.add(new Card(Card.CardType.ROOM, r, null)); return deck; }
    private void extractAnswer(List<Card> deck) { List<Card> sL = deck.stream().filter(c -> c.getType() == Card.CardType.SUSPECT).collect(Collectors.toList()); List<Card> wL = deck.stream().filter(c -> c.getType() == Card.CardType.WEAPON).collect(Collectors.toList()); List<Card> rL = deck.stream().filter(c -> c.getType() == Card.CardType.ROOM).collect(Collectors.toList()); Collections.shuffle(sL); Collections.shuffle(wL); Collections.shuffle(rL); this.answerEnvelope.clear(); this.answerEnvelope.add(sL.get(0)); this.answerEnvelope.add(wL.get(0)); this.answerEnvelope.add(rL.get(0)); deck.remove(sL.get(0)); deck.remove(wL.get(0)); deck.remove(rL.get(0)); }
    private void distributeCards(List<Card> deck) { int idx = 0; Collections.shuffle(deck); while (!deck.isEmpty()) { Card c = deck.remove(0); String pid = turnOrder.get(idx); Player p = users.get(pid); List<Card> hand = (List<Card>) p.getAttribute("hand"); if (hand == null) { hand = new ArrayList<>(); p.setAttribute("hand", hand); } hand.add(c); idx = (idx + 1) % turnOrder.size(); } }

    private GameMessage handleSuggest(String playerId, Map<String, Object> data) {
        if (currentPhase != TurnPhase.ACTION) return createSystemMessage("ERROR", "추리 단계가 아닙니다.");
        String s = (String) data.get("suspect");
        String w = (String) data.get("weapon");
        String r = (String) data.get("room");

        moveSuspectToRoom(s, r);

        String nextRefuter = findFirstRefuter(playerId, s, w, r);
        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType("SUGGESTION_MADE");
        msg.setSender(users.get(playerId).getNickname());
        msg.setSenderId(playerId);

        Map<String, Object> payload = new HashMap<>(data);
        payload.putAll(getGameSnapshot());
        this.suggestorId = playerId;

        if (nextRefuter != null) {
            this.refuterId = nextRefuter;
            payload.put("refuter", users.get(nextRefuter).getNickname());
            payload.put("refuterId", nextRefuter);
            payload.put("status", "WAITING_RESPONSE");
        } else {
            this.refuterId = null;
            payload.put("status", "NO_ONE_REFUTED");
            this.currentPhase = TurnPhase.END; // 아무도 반박 못하면 턴 종료 단계로
            payload.putAll(getGameSnapshot()); // [중요] 상태 변경 업데이트
        }
        msg.setData(payload);
        return msg;
    }

    // [수정] 반박 처리 후 상태 동기화 추가
    private GameMessage handleResponse(String playerId, Map<String, Object> data) {
        if (!playerId.equals(refuterId)) return null;

        // 반박이 끝났으므로 턴 종료 단계(END)로 변경 (플레이어가 턴 종료 버튼 누를 수 있게)
        this.currentPhase = TurnPhase.END;
        this.refuterId = null;

        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType("SUGGESTION_RESULT");
        msg.setSender("SYSTEM");

        Map<String, Object> payload = new HashMap<>();
        payload.put("success", true);
        payload.put("refuter", users.get(playerId).getNickname());
        payload.put("refuterId", playerId);
        payload.put("shownCard", data.get("card"));
        payload.put("suggestorId", this.suggestorId);

        // [핵심 수정] 변경된 Phase(END) 정보를 클라이언트에 전송해야 버튼이 활성화됨
        payload.putAll(getGameSnapshot());

        msg.setData(payload);
        return msg;
    }
    private GameMessage handleMovePath(String playerId, List<String> path) {
        if (currentPhase != TurnPhase.MOVE) return createSystemMessage("ERROR", "이동 단계가 아닙니다.");
        if (path == null || path.isEmpty()) return null;

        String currentLoc = playerLocations.get(playerId);

        for (String target : path) {
            if (movesLeft <= 0) return createSystemMessage("ERROR", "이동력이 부족합니다.");

            // 인접 체크 (기존 handleMove와 동일한 검증)
            if (currentLoc.contains("-") && target.contains("-")) {
                String[] c = currentLoc.split("-");
                String[] t = target.split("-");
                int dist = Math.abs(Integer.parseInt(c[0]) - Integer.parseInt(t[0]))
                        + Math.abs(Integer.parseInt(c[1]) - Integer.parseInt(t[1]));
                if (dist > 1) return createSystemMessage("ERROR", "유효하지 않은 이동 경로입니다.");
            }

            // 위치 업데이트 및 이동력 차감
            playerLocations.put(playerId, target);
            movesLeft--;
            currentLoc = target; // 다음 스텝을 위해 갱신

            // 방에 도착했으면 즉시 종료
            if (target.startsWith("Room:")) {
                movesLeft = 0;
                currentPhase = TurnPhase.ACTION;
                break;
            }
        }

        // 이동력이 0이 되면 턴 종료 단계로 (방에 안 들어간 경우)
        if (movesLeft == 0 && currentPhase == TurnPhase.MOVE) {
            currentPhase = TurnPhase.END;
        }

        GameMessage msg = new GameMessage();
        msg.setType("MOVED");
        msg.setData(getGameSnapshot());
        return msg;
    }
    private GameMessage handleAccuse(String playerId, Map<String, Object> data) {
        String s = (String) data.get("suspect");
        String w = (String) data.get("weapon");
        String r = (String) data.get("room");

        boolean isCorrect = isCorrectAccusation(s, w, r);
        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);

        if (isCorrect) {
            // [1] 정답 -> 게임 종료 (승리)
            msg.setType("GAME_OVER");
            msg.setSender("SYSTEM");

            this.playing = false; // 서버 상태 종료

            Map<String, Object> res = new HashMap<>();
            res.put("winnerName", users.get(playerId).getNickname());
            res.put("answer", this.answerEnvelope);
            // [추가] 종료된 상태 정보도 함께 전송
            res.putAll(getGameSnapshot());

            msg.setData(res);

        } else {
            // [2] 오답
            msg.setType("ACCUSE_FAILED");
            msg.setSender(users.get(playerId).getNickname());
            msg.setSenderId(playerId);

            eliminatedPlayers.add(playerId);

            if (eliminatedPlayers.size() >= users.size()) {
                // [2-1] 전원 탈락 -> 게임 종료
                msg.setType("GAME_OVER");
                msg.setContent("모두 탈락했습니다. 게임 오버!");

                this.playing = false; // 서버 상태 종료

                Map<String, Object> res = new HashMap<>();
                res.put("winnerName", "NOBODY");
                res.put("answer", this.answerEnvelope);
                // [추가] 종료된 상태 정보도 함께 전송
                res.putAll(getGameSnapshot());

                msg.setData(res);

            } else {
                // [2-2] 게임 계속 진행 (다음 턴으로 넘김)
                handleTurnEnd(playerId);

                // 상태 동기화
                msg.setData(getGameSnapshot());
            }
        }
        return msg;
    }
    private String findFirstRefuter(String suggestorId, String s, String w, String r) { int startIdx = turnOrder.indexOf(suggestorId); for (int i = 1; i < turnOrder.size(); i++) { int idx = (startIdx + i) % turnOrder.size(); String pid = turnOrder.get(idx); Player p = users.get(pid); List<Card> hand = (List<Card>) p.getAttribute("hand"); if (hand == null) continue; boolean hasCard = hand.stream().anyMatch(c -> c.getName().equals(s) || c.getName().equals(w) || c.getName().equals(r)); if (hasCard) return pid; } return null; }
    private void moveSuspectToRoom(String suspectName, String roomName) { for (Map.Entry<String, String> entry : playerCharacters.entrySet()) { if (entry.getValue().equals(suspectName)) { playerLocations.put(entry.getKey(), "Room:" + roomName); break; } } }
    private boolean isCorrectAccusation(String s, String w, String r) { Set<String> answers = answerEnvelope.stream().map(Card::getName).collect(Collectors.toSet()); return answers.contains(s) && answers.contains(w) && answers.contains(r); }
}