package com.example.oide.payment.dto;

import java.util.List;

import com.example.oide.payment.service.PaymentRegistration;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "사용자가 확인·수정한 결제 내역 일괄 등록 요청")
public record PaymentBulkRegisterRequest(
		@Schema(description = "등록할 결제 내역. 최소 한 건 이상이어야 함")
				@NotEmpty @Valid List<PaymentRegisterRequest> payments) {

	public List<PaymentRegistration> toRegistrations() {
		return payments.stream().map(PaymentRegisterRequest::toRegistration).toList();
	}
}
