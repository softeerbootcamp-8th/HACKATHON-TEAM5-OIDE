package com.example.oide.settlement.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record SettlementPreviewResponse(
		boolean settlementAvailable,
		List<Long> invalidPaymentIds,
		List<String> missingCurrencies,
		List<RateResponse> rates,
		List<MemberResultResponse> memberResults,
		List<TransferResponse> transfers) {

	public record RateResponse(
			String currency,
			BigDecimal rateToKrw,
			String source,
			LocalDate effectiveDate,
			LocalDateTime quotedAt,
			boolean requiresManual) {
	}

	public record MemberResultResponse(
			Long memberId, String nickname, long paidKrw, long owedKrw, long netKrw) {
	}

	public record TransferResponse(
			Long senderMemberId,
			String senderNickname,
			Long receiverMemberId,
			String receiverNickname,
			long amountKrw) {
	}
}

