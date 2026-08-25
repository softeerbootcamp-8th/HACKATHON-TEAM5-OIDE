package com.example.oide.room.dto;

import java.util.List;

import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;

/**
 * 정산방 생성(POST)과 조회(GET) API가 공통으로 사용하는 응답 형태.
 * 생성 응답에도 멤버 목록을 포함해, 프론트가 생성 직후 별도 조회 없이 공유 화면을 그릴 수 있게 한다.
 */
public record RoomResponse(
		Long roomId, String shareCode, String title, String defaultCurrency, List<RoomMemberResponse> members) {

	/** SettlementRoom 엔티티와 그에 속한 RoomMember 목록을 응답 DTO로 조립한다. */
	public static RoomResponse of(SettlementRoom room, List<RoomMember> members) {
		List<RoomMemberResponse> memberResponses = members.stream().map(RoomMemberResponse::from).toList();
		return new RoomResponse(
				room.getId(), room.getShareCode(), room.getTitle(), room.getDefaultCurrency(), memberResponses);
	}
}
