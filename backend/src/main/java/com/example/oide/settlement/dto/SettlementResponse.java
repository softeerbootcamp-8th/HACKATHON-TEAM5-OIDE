package com.example.oide.settlement.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SettlementResponse(
		Long settlementId,
		LocalDateTime calculatedAt,
		List<Long> completedMemberIds,
		SettlementPreviewResponse result) {
}
