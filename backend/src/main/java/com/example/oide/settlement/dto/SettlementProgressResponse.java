package com.example.oide.settlement.dto;

import java.util.List;

public record SettlementProgressResponse(
		List<MemberProgressResponse> members,
		boolean allCompleted,
		boolean hasAnyPayments) {

	public record MemberProgressResponse(
			Long memberId,
			String nickname,
			boolean completed,
			boolean hasPayments) {
	}
}
