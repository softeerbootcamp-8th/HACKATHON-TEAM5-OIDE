package com.example.oide.splitgroup.dto;

import java.util.List;

import com.example.oide.splitgroup.domain.SplitGroupType;

public record SplitGroupResponse(
		Long id,
		String name,
		SplitGroupType type,
		List<MemberResponse> members,
		long paymentCount) {

	public record MemberResponse(Long id, String nickname, int displayOrder) {
	}
}
