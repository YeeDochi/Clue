package org.example.clue.controller;

import org.example.clue.dto.BaseGameRoom;
import org.example.clue.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {
    private final RoomService roomService;

    // 0. 상태 확인용 (HEAD /api/rooms)
    // 방 목록 조회 로직 없이 즉시 응답하여 타임아웃 방지
    @RequestMapping(method = RequestMethod.HEAD)
    public void healthCheck() {
    }

    // 1. 방 목록 조회 (GET /api/rooms)
    @GetMapping
    public List<BaseGameRoom> findAllRooms() {
        return roomService.findAll();
    }

    // 2. 방 생성 (POST /api/rooms?name=...)
    @PostMapping
    public BaseGameRoom createRoom(@RequestParam String name) {
        return roomService.createRoom(name);
    }

    // 3. 특정 방 조회 (GET /api/rooms/{roomId})
    @GetMapping("/{roomId}")
    public BaseGameRoom getRoom(@PathVariable String roomId) {
        return roomService.findRoom(roomId);
    }
}