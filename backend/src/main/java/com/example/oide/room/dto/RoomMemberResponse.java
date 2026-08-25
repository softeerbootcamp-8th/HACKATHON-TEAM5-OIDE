package com.example.oide.room.dto;

import com.example.oide.room.domain.RoomMember;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 응답에 포함되는 참여자 정보.
 * id는 클라이언트가 프로필 선택 후 localStorage에 저장할 memberId로 쓰인다.
 */
public record RoomMemberResponse(
		@Schema(description = "참여자 ID (클라이언트가 프로필 선택 시 localStorage에 저장)", example = "1") Long id,
		@Schema(description = "참여자 닉네임", example = "민수") String nickname,
		@Schema(description = "등록 순서(0부터 시작)", example = "0") int displayOrder) {

	/** RoomMember 엔티티를 API 응답용 DTO로 변환한다. */
	public static RoomMemberResponse from(RoomMember member) {
		return new RoomMemberResponse(member.getId(), member.getNickname(), member.getDisplayOrder());
	}
}
