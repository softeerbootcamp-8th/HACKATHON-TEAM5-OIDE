package com.example.oide.settlement.dto;

import java.time.LocalDateTime;

public record SettlementResponse(Long settlementId, LocalDateTime calculatedAt, SettlementPreviewResponse result) {
}

