package com.example.oide.room.dto;

import java.util.List;

/**
 * 정산방 생성 요청(POST /api/rooms)의 요청 본문.
 * title은 방 이름, nicknames는 방장이 미리 등록하는 참여자 닉네임 목록(순서가 displayOrder가 된다).
 */
public record RoomCreateRequest(String title, List<String> nicknames) {
}
