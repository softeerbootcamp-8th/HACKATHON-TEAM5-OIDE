package com.example.oide.payment.client;

/** 출금(지출)인지 입금인지. 화면마다 부호 표기가 달라 금액에서 분리해 받는다. */
public enum TransactionDirection {
	OUT,
	IN
}
