package com.example.oide.room.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.oide.global.exception.ErrorResponse;
import com.example.oide.room.dto.RoomCreateRequest;
import com.example.oide.room.dto.RoomResponse;
import com.example.oide.room.service.RoomService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** 정산방 생성/조회 API를 노출하는 컨트롤러. 검증과 실제 처리는 RoomService에 위임한다. */
@Tag(name = "Room", description = "정산방 생성/조회 API")
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

	private final RoomService roomService;

	/** 방 이름과 참여자 닉네임 목록을 받아 정산방을 생성하고, 201과 함께 방/멤버 정보를 반환한다. */
	@Operation(summary = "정산방 생성", description = "방 이름과 참여자 닉네임 목록으로 정산방을 만들고 공유용 shareCode를 발급한다.")
	@ApiResponses({
		@ApiResponse(responseCode = "201", description = "생성 성공"),
		@ApiResponse(
				responseCode = "400",
				description = "방 이름/인원수/닉네임 검증 실패 (INVALID_TITLE, INVALID_MEMBER_COUNT, INVALID_NICKNAME, DUPLICATE_NICKNAME)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	@PostMapping
	public ResponseEntity<RoomResponse> createRoom(@RequestBody RoomCreateRequest request) {
		RoomResponse response = roomService.createRoom(request);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	/** 공유 링크의 shareCode로 정산방을 조회한다. 존재하지 않거나 만료된 경우 서비스에서 예외가 던져진다. */
	@Operation(summary = "정산방 조회", description = "공유 링크에 포함된 shareCode로 방 정보와 참여자 목록을 조회한다.")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "조회 성공"),
		@ApiResponse(
				responseCode = "404",
				description = "shareCode에 해당하는 방이 없음 (ROOM_NOT_FOUND)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "410",
				description = "생성 후 7일이 지나 만료된 방 (ROOM_EXPIRED)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	@GetMapping("/{shareCode}")
	public ResponseEntity<RoomResponse> getRoom(
			@Parameter(description = "공유 링크에 포함된 방 식별 코드") @PathVariable String shareCode) {
		return ResponseEntity.ok(roomService.getRoomByShareCode(shareCode));
	}
}
