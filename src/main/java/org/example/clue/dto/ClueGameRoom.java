package org.example.clue.dto;

import java.util.HashMap;
import java.util.Map;

public class ClueGameRoom extends BaseGameRoom {

    public ClueGameRoom(String name) {
        super(name);
    }

    @Override
    public GameMessage handleAction(GameMessage message) {

        return message;
    }

    @Override
    public Map<String, Object> getGameSnapshot() {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("roomId", roomId);
        snapshot.put("roomName", roomName);
        snapshot.put("playing", playing);
        snapshot.put("users", users);
        return snapshot;
    }
}