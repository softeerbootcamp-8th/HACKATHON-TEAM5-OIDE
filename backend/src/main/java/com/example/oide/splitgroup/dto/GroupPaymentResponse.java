package com.example.oide.splitgroup.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.oide.global.currency.SupportedCurrency;
import com.example.oide.payment.domain.SplitMethod;

public record GroupPaymentResponse(
		Long id,
		String merchant,
		LocalDateTime paidAt,
		BigDecimal amount,
		SupportedCurrency currency,
		GroupPaymentSelectionStatus selectionStatus,
		SplitMethod splitMethod) {
}
