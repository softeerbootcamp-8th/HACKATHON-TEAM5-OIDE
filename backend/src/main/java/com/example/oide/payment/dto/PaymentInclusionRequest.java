package com.example.oide.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "결제 내역의 정산 대상 포함 여부 변경 요청")
public record PaymentInclusionRequest(
		@Schema(description = "정산 대상 포함 여부", example = "true") boolean includedInSettlement) {
}
