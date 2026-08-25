package com.example.oide.room.dto;

import com.example.oide.room.domain.RoomMember;

/**
 * 응답에 포함되는 참여자 정보.
 * id는 클라이언트가 프로필 선택 후 localStorage에 저장할 memberId로 쓰인다.
 */
public record RoomMemberResponse(Long id, String nickname, int displayOrder) {

	/** RoomMember 엔티티를 API 응답용 DTO로 변환한다. */
	public static RoomMemberResponse from(RoomMember member) {
		return new RoomMemberResponse(member.getId(), member.getNickname(), member.getDisplayOrder());
	}
}
