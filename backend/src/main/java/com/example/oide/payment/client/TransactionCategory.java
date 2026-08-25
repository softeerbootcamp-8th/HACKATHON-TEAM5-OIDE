package com.example.oide.payment.client;

/**
 * 거래 내역의 성격. 결제 스크린샷에는 정산 대상이 아닌 거래(충전, 이체 등)도 함께 찍히므로,
 * 결과에서 숨기지 않고 분류만 해서 내려준 뒤 기본 선택 여부로 구분한다.
 */
public enum TransactionCategory {
	PAYMENT,
	TRANSFER,
	TOPUP,
	INTEREST,
	OTHER;

	public boolean isSettlementCandidate() {
		return this == PAYMENT;
	}
}
