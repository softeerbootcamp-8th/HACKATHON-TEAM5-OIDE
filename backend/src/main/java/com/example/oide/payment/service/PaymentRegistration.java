package com.example.oide.payment.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 확정 등록할 결제 내역 한 건.
 *
 * <p>결제처와 결제 시각은 FR-02에 따라 비어 있을 수 있다. 금액과 통화만 필수다.
 *
 * <p>통화는 아직 검증되지 않은 코드 문자열이다. 지원 통화 여부는 등록 시점에 확인한다.
 *
 * @param payerMemberId 실제로 돈을 낸 참여자. 로그인이 없으므로 클라이언트가 자기 memberId를 담아 보낸다
 */
public record PaymentRegistration(
		Long payerMemberId,
		String merchant,
		LocalDateTime paidAt,
		BigDecimal amount,
		String currency) {}
