package com.example.oide.payment.dto;

import java.util.List;

import com.example.oide.payment.service.PaymentRegistration;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

public record PaymentBulkRegisterRequest(
		@NotEmpty @Valid List<PaymentRegisterRequest> payments) {

	public List<PaymentRegistration> toRegistrations() {
		return payments.stream().map(PaymentRegisterRequest::toRegistration).toList();
	}
}
