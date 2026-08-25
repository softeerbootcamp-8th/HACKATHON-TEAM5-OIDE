package com.example.oide.global.currency;

import io.swagger.v3.oas.annotations.media.Schema;

/** 통화 선택 화면이 사용하는 지원 통화 한 건. */
public record CurrencyResponse(
		@Schema(description = "ISO 4217 통화 코드", example = "JPY") String code,
		@Schema(description = "한글 통화명", example = "엔") String name,
		@Schema(description = "소수 자릿수 (금액 입력 자리수)", example = "0") int minorUnit) {

	public static CurrencyResponse from(SupportedCurrency currency) {
		return new CurrencyResponse(currency.name(), currency.getKoreanName(), currency.getMinorUnit());
	}
}
