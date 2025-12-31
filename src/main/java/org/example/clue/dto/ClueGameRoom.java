package org.example.clue.dto;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class ClueGameRoom extends BaseGameRoom {

    private List<Card> answerEnvelope = new ArrayList<>();
    private List<String> turnOrder = new ArrayList<>();
    private int currentTurnIdx = 0;

    // 위치 정보: "12-4" (좌표) 또는 "Room:STUDY" (방)
    private Map<String, String> playerLocations = new ConcurrentHashMap<>();

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

        switch (actionType) {
            case "START": return startGame();
            case "ROLL_DICE": return handleRollDice(senderId);
            case "MOVE": return handleMove(senderId, (String) data.get("location"));
            case "SUGGEST": return handleSuggest(senderId, data);
            case "RESPONSE": return handleResponse(senderId, data);
            case "ACCUSE": return handleAccuse(senderId, data);
            case "TURN_END": return handleTurnEnd(senderId);
        }
        return message;
    }

    private GameMessage startGame() {
        if (users.size() < 2) return createSystemMessage("ERROR", "최소 2명이 필요합니다.");
        this.playing = true;
        this.turnOrder = new ArrayList<>(users.keySet());
        Collections.shuffle(turnOrder);
        this.currentTurnIdx = 0;
        this.currentPhase = TurnPhase.ROLL;

        List<Card> deck = initializeDeck();
        extractAnswer(deck);
        distributeCards(deck);

        // 초기 시작 위치 (대기실 혹은 특정 좌표)
        // 실제 게임에선 캐릭터별 시작 위치가 다르지만, 편의상 특정 좌표 근처로 배정하거나 클라이언트가 처리
        for (String pid : turnOrder) playerLocations.put(pid, "Start_Hall");

        GameMessage msg = createSystemMessage("GAME_STARTED", "게임 시작! 주사위를 굴려주세요.");
        msg.setData(getGameSnapshot());
        return msg;
    }

    private GameMessage handleRollDice(String playerId) {
        if (!isMyTurn(playerId)) return null;
        if (currentPhase != TurnPhase.ROLL) return createSystemMessage("ERROR", "주사위 단계가 아닙니다.");

        this.diceValue = (int)(Math.random() * 6) + 1;
        // 디버깅용: 이동 편하게 하려면 +6 하거나 조정 가능
        // this.diceValue = (int)(Math.random() * 6) + 1 + 3;

        this.movesLeft = this.diceValue;
        this.currentPhase = TurnPhase.MOVE;

        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType("DICE_ROLLED");
        msg.setSender(users.get(playerId).getNickname());
        msg.setContent(msg.getSender() + "님이 주사위 " + diceValue + "을(를) 굴렸습니다!");

        Map<String, Object> data = new HashMap<>();
        data.put("dice", diceValue);
        data.put("playerId", playerId);
        msg.setData(data);
        return msg;
    }

    private GameMessage handleMove(String playerId, String targetLocation) {
        if (!isMyTurn(playerId)) return null;
        if (currentPhase != TurnPhase.MOVE) return createSystemMessage("ERROR", "이동할 단계가 아닙니다.");
        if (movesLeft <= 0) return createSystemMessage("ERROR", "이동 횟수가 부족합니다.");

        // targetLocation 예시: "12-5" (좌표) or "Room:HALL" (방)
        playerLocations.put(playerId, targetLocation);
        movesLeft--;

        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType("MOVED");

        Map<String, Object> data = new HashMap<>();
        data.put("playerId", playerId);
        data.put("location", targetLocation);
        data.put("movesLeft", movesLeft);
        msg.setData(data);

        // 방에 들어갔는지 확인 (클라이언트가 "Room:" 접두사를 붙여 보냄)
        boolean isEnteredRoom = targetLocation.startsWith("Room:");

        if (isEnteredRoom) {
            movesLeft = 0; // 방에 들어가면 이동 즉시 종료
            currentPhase = TurnPhase.ACTION; // 추리 가능
            msg.setContent("방에 도착했습니다! 추리를 진행하세요.");
        } else if (movesLeft == 0) {
            currentPhase = TurnPhase.END; // 복도에서 멈춤 -> 턴 종료만 가능
        }

        return msg;
    }

    private GameMessage handleSuggest(String playerId, Map<String, Object> data) {
        if (!isMyTurn(playerId)) return null;
        if (currentPhase != TurnPhase.ACTION) return createSystemMessage("ERROR", "추리 단계가 아닙니다.");

        String suspect = (String) data.get("suspect");
        String weapon = (String) data.get("weapon");
        String room = (String) data.get("room");

        String nextRefuter = findNextRefuter(playerId, suspect, weapon, room);

        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType("SUGGESTION_MADE");
        msg.setSender(users.get(playerId).getNickname());
        msg.setSenderId(playerId);

        Map<String, Object> payload = new HashMap<>(data);
        this.suggestorId = playerId;

        if (nextRefuter != null) {
            this.refuterId = nextRefuter;
            payload.put("refuter", users.get(nextRefuter).getNickname());
            payload.put("refuterId", nextRefuter);
            payload.put("status", "WAITING_RESPONSE");
        } else {
            this.refuterId = null;
            payload.put("status", "NO_ONE_REFUTED");
            this.currentPhase = TurnPhase.END;
        }
        msg.setData(payload);
        return msg;
    }

    private GameMessage handleResponse(String playerId, Map<String, Object> data) {
        if (!playerId.equals(refuterId)) return null;
        this.currentPhase = TurnPhase.END;

        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType("SUGGESTION_RESULT");
        msg.setSender("SYSTEM");

        Map<String, Object> payload = new HashMap<>();
        payload.put("success", true);
        payload.put("refuter", users.get(playerId).getNickname());
        payload.put("shownCard", data.get("card"));
        payload.put("refuterId", playerId);
        msg.setData(payload);

        this.refuterId = null;
        return msg;
    }

    private GameMessage handleAccuse(String playerId, Map<String, Object> data) {
        if (!isMyTurn(playerId)) return null;

        String s = (String) data.get("suspect");
        String w = (String) data.get("weapon");
        String r = (String) data.get("room");

        boolean isCorrect = isCorrectAccusation(s, w, r);
        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);

        if (isCorrect) {
            msg.setType("GAME_OVER");
            msg.setSender("SYSTEM");
            Map<String, Object> resultData = new HashMap<>();
            resultData.put("winner", users.get(playerId).getNickname());
            resultData.put("answer", this.answerEnvelope);
            msg.setData(resultData);
            this.playing = false;
        } else {
            msg.setType("ACCUSE_FAILED");
            msg.setSender("SYSTEM");
            msg.setSenderId(playerId);
            currentPhase = TurnPhase.END;
        }
        return msg;
    }

    private GameMessage handleTurnEnd(String playerId) {
        if (!isMyTurn(playerId)) return null;
        nextTurn();
        GameMessage msg = createSystemMessage("NEXT_TURN", "다음 턴으로 넘어갑니다.");
        msg.setData(getGameSnapshot());
        return msg;
    }

    private void nextTurn() {
        if (turnOrder.isEmpty()) return;
        currentTurnIdx = (currentTurnIdx + 1) % turnOrder.size();
        currentPhase = TurnPhase.ROLL;
        movesLeft = 0;
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
        snapshot.put("currentPhase", this.currentPhase);
        snapshot.put("movesLeft", this.movesLeft);
        return snapshot;
    }

    private GameMessage createSystemMessage(String type, String content) {
        GameMessage msg = new GameMessage();
        msg.setRoomId(roomId);
        msg.setType(type);
        msg.setSender("SYSTEM");
        msg.setContent(content);
        return msg;
    }

    // --- Helpers (Deck, Answer, FindRefuter 등은 기존 로직 유지) ---
    private void extractAnswer(List<Card> deck) {
        List<Card> suspects = deck.stream().filter(c -> c.getType() == Card.CardType.SUSPECT).collect(Collectors.toList());
        List<Card> weapons = deck.stream().filter(c -> c.getType() == Card.CardType.WEAPON).collect(Collectors.toList());
        List<Card> rooms = deck.stream().filter(c -> c.getType() == Card.CardType.ROOM).collect(Collectors.toList());
        Collections.shuffle(suspects); Collections.shuffle(weapons); Collections.shuffle(rooms);
        Card s = suspects.get(0); Card w = weapons.get(0); Card r = rooms.get(0);
        this.answerEnvelope.clear();
        this.answerEnvelope.add(s); this.answerEnvelope.add(w); this.answerEnvelope.add(r);
        deck.remove(s); deck.remove(w); deck.remove(r);
    }

    private void distributeCards(List<Card> deck) {
        int idx = 0;
        Collections.shuffle(deck);
        while (!deck.isEmpty()) {
            Card c = deck.remove(0);
            String pid = turnOrder.get(idx);
            Player p = users.get(pid);
            List<Card> hand = (List<Card>) p.getAttribute("hand");
            if (hand == null) { hand = new ArrayList<>(); p.setAttribute("hand", hand); }
            hand.add(c);
            idx = (idx + 1) % turnOrder.size();
        }
    }

    private List<Card> initializeDeck() {
        List<Card> deck = new ArrayList<>();
        String[] suspects = {"MUSTARD", "PLUM", "GREEN", "PEACOCK", "SCARLET", "WHITE"};
        for(String s : suspects) deck.add(new Card(Card.CardType.SUSPECT, s, null));
        String[] weapons = {"KNIFE", "CANDLESTICK", "REVOLVER", "ROPE", "LEAD_PIPE", "WRENCH"};
        for(String w : weapons) deck.add(new Card(Card.CardType.WEAPON, w, null));
        String[] rooms = {"HALL", "LOUNGE", "DINING", "KITCHEN", "BALLROOM", "CONSERVATORY", "BILLIARD", "LIBRARY", "STUDY"};
        for(String r : rooms) deck.add(new Card(Card.CardType.ROOM, r, null));
        return deck;
    }

    private String findNextRefuter(String suggestorId, String s, String w, String r) {
        int startIdx = turnOrder.indexOf(suggestorId);
        for (int i = 1; i < turnOrder.size(); i++) {
            int idx = (startIdx + i) % turnOrder.size();
            String pid = turnOrder.get(idx);
            Player p = users.get(pid);
            List<Card> hand = (List<Card>) p.getAttribute("hand");
            if (hand == null) continue;
            boolean hasCard = hand.stream().anyMatch(c -> c.getName().equals(s) || c.getName().equals(w) || c.getName().equals(r));
            if (hasCard) return pid;
        }
        return null;
    }

    private boolean isCorrectAccusation(String s, String w, String r) {
        Set<String> answers = answerEnvelope.stream().map(Card::getName).collect(Collectors.toSet());
        return answers.contains(s) && answers.contains(w) && answers.contains(r);
    }

    private boolean isMyTurn(String playerId) {
        return !turnOrder.isEmpty() && turnOrder.get(currentTurnIdx).equals(playerId);
    }
}