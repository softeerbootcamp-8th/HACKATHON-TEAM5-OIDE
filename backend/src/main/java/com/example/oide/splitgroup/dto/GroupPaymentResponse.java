package com.example.oide.splitgroup.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.oide.payment.domain.SplitMethod;

public record GroupPaymentResponse(
		Long id,
		String merchant,
		LocalDateTime paidAt,
		BigDecimal amount,
		String currency,
		GroupPaymentSelectionStatus selectionStatus,
		SplitMethod splitMethod) {
}
