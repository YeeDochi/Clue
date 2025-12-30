package org.example.clue.service;

import org.example.clue.dto.BaseGameRoom;
import org.example.clue.dto.ClueGameRoom;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {
    private final Map<String, BaseGameRoom> rooms = new ConcurrentHashMap<>();

    public BaseGameRoom createRoom(String name) {
        ClueGameRoom room = new ClueGameRoom(name);
        rooms.put(room.getRoomId(), room);
        return room;
    }

    public BaseGameRoom findRoom(String roomId) {
        return rooms.get(roomId);
    }

    public List<BaseGameRoom> findAll() {
        return new ArrayList<>(rooms.values());
    }

    public void deleteRoom(String roomId) {
        rooms.remove(roomId);
    }
}