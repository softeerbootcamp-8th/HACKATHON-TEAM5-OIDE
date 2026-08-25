package com.example.oide.payment.dto;

import java.math.BigDecimal;
import java.util.List;

import com.example.oide.global.currency.SupportedCurrency;
import com.example.oide.payment.domain.SplitMethod;

public record PaymentShareResponse(
		Long paymentId,
		BigDecimal paymentAmount,
		SupportedCurrency currency,
		SplitMethod splitMethod,
		BigDecimal allocatedAmount,
		BigDecimal remainingAmount,
		boolean balanced,
		List<MemberShareResponse> shares) {

	public record MemberShareResponse(Long memberId, String nickname, BigDecimal shareAmount) {
	}
}
