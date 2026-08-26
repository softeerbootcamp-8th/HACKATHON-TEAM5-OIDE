package com.example.oide.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.oide.payment.service.PaymentRegistration;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 결제 내역 한 건. 스크린샷에서 추출한 것을 사용자가 확인한 결과이거나, 직접 입력한 값이다.
 *
 * <p>서버는 둘을 구분하지 않는다. 추출 결과도 사용자가 수정할 수 있으므로 확정된 시점에는 같은
 * 성격의 데이터다.
 */
@Schema(description = "결제 내역 한 건의 확정 등록 요청. 결제처와 결제 시각은 생략할 수 있다.")
public record PaymentRegisterRequest(
			@Schema(description = "실제로 결제한 정산방 참여자 ID", example = "11") @NotNull Long payerMemberId,
			@Schema(description = "결제처. 알 수 없으면 null", example = "이치란 라멘", nullable = true)
					@Size(max = 255)
					String merchant,
			@Schema(
					description = "결제 시각. 알 수 없으면 null이며 시간대 없는 ISO-8601 형식",
					example = "2026-08-21T20:14:00",
					nullable = true)
					LocalDateTime paidAt,
			@Schema(description = "원 통화 단위 결제 금액. 0보다 커야 함", example = "3200")
					@NotNull @Positive BigDecimal amount,
			@Schema(description = "ISO 4217 세 자리 통화 코드", example = "JPY", minLength = 3, maxLength = 3)
					@NotNull @Size(min = 3, max = 3)
					String currency) {

	public PaymentRegistration toRegistration() {
		return new PaymentRegistration(payerMemberId, merchant, paidAt, amount, currency);
	}
}
