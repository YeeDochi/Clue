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

        // 22x22 맵 기준 시작 좌표 (Row-Col)
        // 주의: 자바/JS 배열은 [Row][Col] 순서이므로 "Y-X" 형태가 아니라 "X-Y"로 쓸지 "Y-X"로 쓸지 통일해야 함.
        // 현재 클라이언트는 `tile-X-Y` (Col-Row)로 렌더링하고,
        // 서버 좌표도 "Col-Row" (X-Y) 형식으로 보내야 함.

        Map<String, String> startPos = new HashMap<>();

        // [검증된 좌표 (X-Y format)]
        // WHITE (상단 중앙): Row 0, Col 9 -> "9-0"
        startPos.put("WHITE", "9-0");

        // GREEN (좌측 상단): Row 5, Col 0 -> "0-5"
        startPos.put("GREEN", "0-5");

        // PEACOCK (우측 상단): Row 3, Col 21 -> "21-3" (clue.js 4행 끝부분 3번타일)
        startPos.put("PEACOCK", "21-3");

        // MUSTARD (좌측 하단): Row 14, Col 0 -> "0-14"
        startPos.put("MUSTARD", "0-14");

        // PLUM (우측 하단): Row 18, Col 21 -> "21-18"
        startPos.put("PLUM", "21-18");

        // SCARLET (하단 중앙): Row 21, Col 8 -> "8-21"
        startPos.put("SCARLET", "8-21");

        int idx = 0;
        for (String pid : turnOrder) {
            String charName = characters[idx % characters.length];
            playerCharacters.put(pid, charName);
            // 해당 캐릭터의 시작 좌표로 이동
            playerLocations.put(pid, startPos.getOrDefault(charName, "10-11")); // 기본값 안전지대
            idx++;
        }
    }

    // [핵심 수정] 주사위 굴린 후에도 '전체 상태(Snapshot)'를 보냄
    private GameMessage handleRollDice(String playerId) {
        if (currentPhase != TurnPhase.ROLL) return createSystemMessage("ERROR", "주사위 단계가 아닙니다.");
        this.diceValue = (int)(Math.random() * 6) + (int)(Math.random() * 6) + 2;
        this.movesLeft = this.diceValue;
        this.currentPhase = TurnPhase.MOVE;

        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType("DICE_ROLLED");
        msg.setSender(users.get(playerId).getNickname());

        // 기존 데이터를 스냅샷에 병합하여 전송
        Map<String, Object> data = getGameSnapshot();
        data.put("dice", diceValue);
        data.put("playerId", playerId);
        msg.setData(data);
        return msg;
    }

    // [핵심 수정] 이동 후에도 '전체 상태(Snapshot)'를 보냄
    private GameMessage handleMove(String playerId, String targetLocation) {
        if (currentPhase != TurnPhase.MOVE) return createSystemMessage("ERROR", "이동 단계가 아닙니다.");
        if (movesLeft <= 0) return createSystemMessage("ERROR", "이동력이 부족합니다.");

        String currentLoc = playerLocations.get(playerId);

        // 1. 거리 검증 (서버 측 보안)
        if (currentLoc.contains("-") && targetLocation.contains("-")) {
            String[] c = currentLoc.split("-");
            String[] t = targetLocation.split("-");
            int dist = Math.abs(Integer.parseInt(c[0]) - Integer.parseInt(t[0]))
                    + Math.abs(Integer.parseInt(c[1]) - Integer.parseInt(t[1]));
            if (dist > 1) return createSystemMessage("ERROR", "인접한 칸으로만 이동할 수 있습니다.");
        }

        // 2. 위치 업데이트
        playerLocations.put(playerId, targetLocation);
        movesLeft--;

        // 3. 방 진입 시 처리
        if (targetLocation.startsWith("Room:")) {
            movesLeft = 0;
            currentPhase = TurnPhase.ACTION; // 방에 들어가면 행동 단계로 강제 전환
        } else if (movesLeft == 0) {
            currentPhase = TurnPhase.END; // 복도에서 이동 종료 시 턴 종료 단계로
        }

        GameMessage msg = new GameMessage();
        msg.setType("MOVED");
        msg.setData(getGameSnapshot()); // 최신 상태 전체 전송
        return msg;
    }

    @Override
    public Map<String, Object> getGameSnapshot() {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("roomId", this.roomId);
        snapshot.put("playing", this.playing); // playing 상태 필수
        snapshot.put("users", this.users);
        snapshot.put("turnOrder", this.turnOrder);
        snapshot.put("currentTurn", turnOrder.isEmpty() ? null : turnOrder.get(currentTurnIdx));
        snapshot.put("playerLocations", this.playerLocations);
        snapshot.put("playerCharacters", this.playerCharacters); // 캐릭터 정보 필수
        snapshot.put("currentPhase", this.currentPhase);
        snapshot.put("movesLeft", this.movesLeft);
        return snapshot;
    }

    // --- (이하 나머지 로직은 기존 코드 유지) ---
    private GameMessage createSystemMessage(String type, String content) {
        GameMessage msg = new GameMessage(); msg.setRoomId(roomId); msg.setType(type); msg.setSender("SYSTEM"); msg.setContent(content); return msg;
    }
    private boolean isMyTurn(String playerId) { return playing && !turnOrder.isEmpty() && turnOrder.get(currentTurnIdx).equals(playerId); }
    private GameMessage handleTurnEnd(String playerId) { nextTurn(); GameMessage msg = createSystemMessage("NEXT_TURN", "다음 턴입니다."); msg.setData(getGameSnapshot()); return msg; }
    private void nextTurn() { if (turnOrder.isEmpty()) return; do { currentTurnIdx = (currentTurnIdx + 1) % turnOrder.size(); } while (eliminatedPlayers.contains(turnOrder.get(currentTurnIdx)) && eliminatedPlayers.size() < users.size()); currentPhase = TurnPhase.ROLL; movesLeft = 0; }
    private List<Card> initializeDeck() { List<Card> deck = new ArrayList<>(); String[] suspects = {"MUSTARD", "PLUM", "GREEN", "PEACOCK", "SCARLET", "WHITE"}; for(String s : suspects) deck.add(new Card(Card.CardType.SUSPECT, s, null)); String[] weapons = {"KNIFE", "CANDLESTICK", "REVOLVER", "ROPE", "LEAD_PIPE", "WRENCH"}; for(String w : weapons) deck.add(new Card(Card.CardType.WEAPON, w, null)); String[] rooms = {"HALL", "LOUNGE", "DINING", "KITCHEN", "BALLROOM", "CONSERVATORY", "BILLIARD", "LIBRARY", "STUDY"}; for(String r : rooms) deck.add(new Card(Card.CardType.ROOM, r, null)); return deck; }
    private void extractAnswer(List<Card> deck) { List<Card> sL = deck.stream().filter(c -> c.getType() == Card.CardType.SUSPECT).collect(Collectors.toList()); List<Card> wL = deck.stream().filter(c -> c.getType() == Card.CardType.WEAPON).collect(Collectors.toList()); List<Card> rL = deck.stream().filter(c -> c.getType() == Card.CardType.ROOM).collect(Collectors.toList()); Collections.shuffle(sL); Collections.shuffle(wL); Collections.shuffle(rL); this.answerEnvelope.clear(); this.answerEnvelope.add(sL.get(0)); this.answerEnvelope.add(wL.get(0)); this.answerEnvelope.add(rL.get(0)); deck.remove(sL.get(0)); deck.remove(wL.get(0)); deck.remove(rL.get(0)); }
    private void distributeCards(List<Card> deck) { int idx = 0; Collections.shuffle(deck); while (!deck.isEmpty()) { Card c = deck.remove(0); String pid = turnOrder.get(idx); Player p = users.get(pid); List<Card> hand = (List<Card>) p.getAttribute("hand"); if (hand == null) { hand = new ArrayList<>(); p.setAttribute("hand", hand); } hand.add(c); idx = (idx + 1) % turnOrder.size(); } }
    private GameMessage handleSuggest(String playerId, Map<String, Object> data) { if (currentPhase != TurnPhase.ACTION) return createSystemMessage("ERROR", "추리 단계가 아닙니다."); String s = (String) data.get("suspect"); String w = (String) data.get("weapon"); String r = (String) data.get("room"); moveSuspectToRoom(s, r); String nextRefuter = findFirstRefuter(playerId, s, w, r); GameMessage msg = new GameMessage(); msg.setRoomId(roomId); msg.setType("SUGGESTION_MADE"); msg.setSender(users.get(playerId).getNickname()); msg.setSenderId(playerId); Map<String, Object> payload = new HashMap<>(data); this.suggestorId = playerId; if (nextRefuter != null) { this.refuterId = nextRefuter; payload.put("refuter", users.get(nextRefuter).getNickname()); payload.put("refuterId", nextRefuter); payload.put("status", "WAITING_RESPONSE"); } else { this.refuterId = null; payload.put("status", "NO_ONE_REFUTED"); this.currentPhase = TurnPhase.END; } msg.setData(payload); return msg; }
    private GameMessage handleResponse(String playerId, Map<String, Object> data) { if (!playerId.equals(refuterId)) return null; this.currentPhase = TurnPhase.END; this.refuterId = null; GameMessage msg = new GameMessage(); msg.setRoomId(roomId); msg.setType("SUGGESTION_RESULT"); msg.setSender("SYSTEM"); Map<String, Object> payload = new HashMap<>(); payload.put("success", true); payload.put("refuter", users.get(playerId).getNickname()); payload.put("refuterId", playerId); payload.put("shownCard", data.get("card")); payload.put("suggestorId", this.suggestorId); msg.setData(payload); return msg; }
    private GameMessage handleAccuse(String playerId, Map<String, Object> data) { String s = (String) data.get("suspect"); String w = (String) data.get("weapon"); String r = (String) data.get("room"); boolean isCorrect = isCorrectAccusation(s, w, r); GameMessage msg = new GameMessage(); msg.setRoomId(roomId); if (isCorrect) { msg.setType("GAME_OVER"); msg.setSender("SYSTEM"); Map<String, Object> res = new HashMap<>(); res.put("winner", users.get(playerId).getNickname()); res.put("answer", this.answerEnvelope); msg.setData(res); this.playing = false; } else { msg.setType("ACCUSE_FAILED"); msg.setSender("SYSTEM"); eliminatedPlayers.add(playerId); if (eliminatedPlayers.size() >= users.size()) { msg.setType("GAME_OVER"); msg.setContent("모두 탈락했습니다. 게임 오버!"); Map<String, Object> res = new HashMap<>(); res.put("winner", "NOBODY"); res.put("answer", this.answerEnvelope); msg.setData(res); this.playing = false; } else { handleTurnEnd(playerId); } } return msg; }
    private String findFirstRefuter(String suggestorId, String s, String w, String r) { int startIdx = turnOrder.indexOf(suggestorId); for (int i = 1; i < turnOrder.size(); i++) { int idx = (startIdx + i) % turnOrder.size(); String pid = turnOrder.get(idx); Player p = users.get(pid); List<Card> hand = (List<Card>) p.getAttribute("hand"); if (hand == null) continue; boolean hasCard = hand.stream().anyMatch(c -> c.getName().equals(s) || c.getName().equals(w) || c.getName().equals(r)); if (hasCard) return pid; } return null; }
    private void moveSuspectToRoom(String suspectName, String roomName) { for (Map.Entry<String, String> entry : playerCharacters.entrySet()) { if (entry.getValue().equals(suspectName)) { playerLocations.put(entry.getKey(), "Room:" + roomName); break; } } }
    private boolean isCorrectAccusation(String s, String w, String r) { Set<String> answers = answerEnvelope.stream().map(Card::getName).collect(Collectors.toSet()); return answers.contains(s) && answers.contains(w) && answers.contains(r); }
}