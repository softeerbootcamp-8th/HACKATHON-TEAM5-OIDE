package com.example.oide.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.oide.global.currency.SupportedCurrency;
import com.example.oide.payment.domain.Payment;
import com.example.oide.payment.domain.SplitMethod;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "확정 등록된 결제 내역")
public record PaymentResponse(
			@Schema(description = "결제 내역 ID", example = "101") Long id,
			@Schema(description = "실제로 결제한 정산방 참여자 ID", example = "11") Long payerMemberId,
			@Schema(description = "결제처", example = "이치란 라멘", nullable = true) String merchant,
			@Schema(
					description = "결제 시각. 시간대 없는 ISO-8601 형식",
					example = "2026-08-21T20:14:00",
					nullable = true)
					LocalDateTime paidAt,
			@Schema(description = "원 통화 단위 결제 금액", example = "3200") BigDecimal amount,
			@Schema(description = "지원 통화 코드", example = "JPY") SupportedCurrency currency,
			@Schema(description = "분담 방식. 아직 분담하지 않았으면 null", nullable = true) SplitMethod splitMethod,
			@Schema(description = "정산 대상 포함 여부", example = "true") boolean includedInSettlement) {

	public static PaymentResponse from(Payment payment) {
		return new PaymentResponse(
				payment.getId(),
				payment.getPayer().getId(),
				payment.getMerchant(),
				payment.getPaidAt(),
				payment.getAmount(),
				payment.getCurrency(),
				payment.getSplitMethod(),
				payment.isIncludedInSettlement());
	}
}
