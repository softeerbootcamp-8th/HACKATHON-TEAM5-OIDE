package com.example.oide.payment.service;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 사용자가 확인해봐야 하는 지점. 자동 추출값을 그대로 믿게 하지 않고, 어디를 봐야 하는지 짚어준다.
 */
@Schema(
		description =
				"사용자 확인 필요 사유: YEAR_INFERRED=연도 추론, DATE_MISSING=날짜 누락, TIME_MISSING=시각 누락, "
						+ "MERCHANT_MISSING=결제처 누락, CURRENCY_DEFAULTED=기본 통화 적용, PARTIAL_ROW=잘린 행, "
						+ "NOT_A_PAYMENT=비결제 거래, DUPLICATE_SUSPECTED=중복 의심")
public enum ReviewFlag {

	/** 화면에 연도가 없어 정산방 생성 시점 기준으로 서버가 추론했다. */
	YEAR_INFERRED,

	/** 날짜를 찾지 못했다. */
	DATE_MISSING,

	/** 시각을 찾지 못해 00:00으로 두었다. */
	TIME_MISSING,

	/** 결제처를 읽지 못했다. */
	MERCHANT_MISSING,

	/** 통화를 확정하지 못해 정산방 기본 통화를 적용했다. */
	CURRENCY_DEFAULTED,

	/** 화면 경계에서 잘린 행이라 값이 불완전할 수 있다. */
	PARTIAL_ROW,

	/** 결제가 아닌 거래(충전, 이체, 이자 등)로 보인다. */
	NOT_A_PAYMENT,

	/** 다른 스크린샷에서 같은 거래가 이미 나왔다. 스크롤하며 찍으면 구간이 겹친다. */
	DUPLICATE_SUSPECTED
}
