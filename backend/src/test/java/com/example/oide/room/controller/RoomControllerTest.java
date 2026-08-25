package com.example.oide.room.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.global.exception.GlobalExceptionHandler;
import com.example.oide.room.dto.RoomCreateRequest;
import com.example.oide.room.dto.RoomMemberResponse;
import com.example.oide.room.dto.RoomResponse;
import com.example.oide.room.service.RoomService;

import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
@DisplayName("RoomController MockMvc 테스트")
class RoomControllerTest {

	@Mock private RoomService roomService;

	private MockMvc mockMvc;
	private final ObjectMapper objectMapper = new ObjectMapper();

	@BeforeEach
	void setUp() {
		mockMvc =
				MockMvcBuilders.standaloneSetup(new RoomController(roomService))
						.setControllerAdvice(new GlobalExceptionHandler())
						.build();
	}

	@Test
	@DisplayName("방 생성에 성공하면 201과 함께 생성된 방/멤버 정보를 반환한다")
	void createsRoomAndReturnsCreated() throws Exception {
		RoomResponse response =
				new RoomResponse(
						1L, "abc123", "여행 정산", "KRW", List.of(new RoomMemberResponse(1L, "민수", 0)));
		given(roomService.createRoom(any())).willReturn(response);

		RoomCreateRequest request = new RoomCreateRequest("여행 정산", List.of("민수", "영희"));

		mockMvc
				.perform(
						post("/api/rooms")
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.shareCode").value("abc123"))
				.andExpect(jsonPath("$.defaultCurrency").value("KRW"))
				.andExpect(jsonPath("$.members[0].nickname").value("민수"));
	}

	@Test
	@DisplayName("서비스가 INVALID_TITLE을 던지면 400과 해당 에러코드를 응답한다")
	void returnsBadRequestWhenServiceRejectsInvalidTitle() throws Exception {
		given(roomService.createRoom(any())).willThrow(new BusinessException(ErrorCode.INVALID_TITLE));

		RoomCreateRequest request = new RoomCreateRequest("", List.of("민수", "영희"));

		mockMvc
				.perform(
						post("/api/rooms")
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("ROOM_004"));
	}

	@Test
	@DisplayName("shareCode로 조회하면 200과 함께 방 정보를 반환한다")
	void returnsRoomByShareCode() throws Exception {
		RoomResponse response = new RoomResponse(1L, "abc123", "여행 정산", "KRW", List.of());
		given(roomService.getRoomByShareCode(eq("abc123"))).willReturn(response);

		mockMvc
				.perform(get("/api/rooms/abc123"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.shareCode").value("abc123"));
	}

	@Test
	@DisplayName("존재하지 않는 shareCode를 조회하면 404를 응답한다")
	void returnsNotFoundWhenShareCodeMissing() throws Exception {
		given(roomService.getRoomByShareCode(eq("missing")))
				.willThrow(new BusinessException(ErrorCode.ROOM_NOT_FOUND));

		mockMvc
				.perform(get("/api/rooms/missing"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("ROOM_001"));
	}

	@Test
	@DisplayName("만료된 방을 조회하면 410을 응답한다")
	void returnsGoneWhenRoomExpired() throws Exception {
		given(roomService.getRoomByShareCode(eq("abc123")))
				.willThrow(new BusinessException(ErrorCode.ROOM_EXPIRED));

		mockMvc
				.perform(get("/api/rooms/abc123"))
				.andExpect(status().isGone())
				.andExpect(jsonPath("$.code").value("ROOM_003"));
	}
}
