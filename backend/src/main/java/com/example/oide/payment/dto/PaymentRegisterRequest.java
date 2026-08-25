package com.example.oide.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.oide.payment.service.PaymentRegistration;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * 결제 내역 한 건. 스크린샷에서 추출한 것을 사용자가 확인한 결과이거나, 직접 입력한 값이다.
 *
 * <p>서버는 둘을 구분하지 않는다. 추출 결과도 사용자가 수정할 수 있으므로 확정된 시점에는 같은
 * 성격의 데이터다.
 */
public record PaymentRegisterRequest(
		@NotNull Long payerMemberId,
		@Size(max = 255) String merchant,
		LocalDateTime paidAt,
		@NotNull @Positive BigDecimal amount,
		String currency) {

	public PaymentRegistration toRegistration() {
		return new PaymentRegistration(payerMemberId, merchant, paidAt, amount, currency);
	}
}
