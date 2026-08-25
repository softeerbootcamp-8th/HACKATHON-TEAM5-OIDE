package com.example.oide.room.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 정산방 생성 요청(POST /api/rooms)의 요청 본문.
 * title은 방 이름, nicknames는 방장이 미리 등록하는 참여자 닉네임 목록(순서가 displayOrder가 된다).
 */
public record RoomCreateRequest(
		@Schema(description = "방 이름 (공백 불가, 10자 이내)", example = "제주 여행") String title,
		@Schema(description = "참여자 닉네임 목록 (2명 이상, 각 1~10자, 공백 불가, 중복 불가)", example = "[\"민수\", \"영희\"]")
				List<String> nicknames) {
}
