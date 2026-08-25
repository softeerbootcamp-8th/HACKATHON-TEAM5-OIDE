package com.example.oide.room.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.oide.room.dto.RoomCreateRequest;
import com.example.oide.room.dto.RoomResponse;
import com.example.oide.room.service.RoomService;

import lombok.RequiredArgsConstructor;

/** 정산방 생성/조회 API를 노출하는 컨트롤러. 검증과 실제 처리는 RoomService에 위임한다. */
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

	private final RoomService roomService;

	/** 방 이름과 참여자 닉네임 목록을 받아 정산방을 생성하고, 201과 함께 방/멤버 정보를 반환한다. */
	@PostMapping
	public ResponseEntity<RoomResponse> createRoom(@RequestBody RoomCreateRequest request) {
		RoomResponse response = roomService.createRoom(request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	/** 공유 링크의 shareCode로 정산방을 조회한다. 존재하지 않거나 만료된 경우 서비스에서 예외가 던져진다. */
	@GetMapping("/{shareCode}")
	public ResponseEntity<RoomResponse> getRoom(@PathVariable String shareCode) {
		return ResponseEntity.ok(roomService.getRoomByShareCode(shareCode));
	}
}
