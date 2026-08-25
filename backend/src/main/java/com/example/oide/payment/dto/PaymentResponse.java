package com.example.oide.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.oide.payment.domain.Payment;
import com.example.oide.payment.domain.SplitMethod;

public record PaymentResponse(
		Long id,
		Long payerMemberId,
		String merchant,
		LocalDateTime paidAt,
		BigDecimal amount,
		String currency,
		SplitMethod splitMethod) {

	public static PaymentResponse from(Payment payment) {
		return new PaymentResponse(
				payment.getId(),
				payment.getPayer().getId(),
				payment.getMerchant(),
				payment.getPaidAt(),
				payment.getAmount(),
				payment.getCurrency(),
				payment.getSplitMethod());
	}
}
