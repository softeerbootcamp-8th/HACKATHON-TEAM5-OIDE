package com.example.oide.payment.client;

/**
 * 스크린샷에서 읽어낸 거래 한 건. 모델이 화면에 보이는 그대로 옮긴 값이며 어떤 보정도 되어 있지 않다.
 *
 * <p>보정(연도 추론, 통화 폴백, 금액 파싱)은 {@code ExtractionPostProcessor}가 담당한다. 모델에
 * 추론을 시키면 틀린 값을 자신 있게 채워 넣기 때문에, 읽은 것과 추론한 것의 경계를 여기서 지킨다.
 *
 * @param merchant 결제처. 읽지 못했으면 null
 * @param amount 통화 기호와 콤마를 뺀 금액 문자열. 부동소수 오차를 피하려고 문자열로 받는다
 * @param currency ISO 4217 코드. 모호하면 null
 * @param date {@code MM-DD} 또는 연도가 화면에 있을 때만 {@code yyyy-MM-dd}. 없으면 null
 * @param dateSource 날짜를 읽은 위치
 * @param time {@code HH:mm} 또는 {@code HH:mm:ss}. 없으면 null
 * @param direction 출금/입금
 * @param category 거래 성격
 * @param partial 행이 화면 경계에 잘려 일부만 보이는지
 */
public record RawTransaction(
		String merchant,
		String amount,
		String currency,
		String date,
		DateSource dateSource,
		String time,
		TransactionDirection direction,
		TransactionCategory category,
		boolean partial) {}
