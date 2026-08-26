package com.example.oide.global.currency;

import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;

/**
 * 서비스가 지원하는 통화 목록.
 * 선언 순서가 통화 선택 화면의 노출 순서이며, 기준 통화인 KRW가 가장 위에 온다.
 */
public enum SupportedCurrency {

	KRW("원", 0, 1),
	JPY("엔", 0, 100),
	VND("동", 0, 100),
	CNY("위안", 2, 1),
	USD("달러", 2, 1),
	EUR("유로", 2, 1),
	THB("바트", 2, 1),
	PHP("페소", 2, 1),
	TWD("대만달러", 2, 1),
	HKD("홍콩달러", 2, 1),
	SGD("싱가포르달러", 2, 1),
	IDR("루피아", 2, 100),
	MYR("링깃", 2, 1),
	AUD("호주달러", 2, 1),
	GBP("파운드", 2, 1),
	TRY("리라", 2, 1),
	AED("디르함", 2, 1),
	CHF("스위스프랑", 2, 1),
	MNT("투그릭", 2, 1),
	CAD("캐나다달러", 2, 1),
	INR("루피", 2, 1);

	private static final Map<String, SupportedCurrency> BY_CODE =
			Arrays.stream(values()).collect(Collectors.toUnmodifiableMap(Enum::name, Function.identity()));

	private final String koreanName;
	private final int minorUnit;
	private final int quoteUnit;

	SupportedCurrency(String koreanName, int minorUnit, int quoteUnit) {
		this.koreanName = koreanName;
		this.minorUnit = minorUnit;
		this.quoteUnit = quoteUnit;
	}

	/** 코드 문자열을 지원 통화로 변환한다. 지원하지 않는 코드는 INVALID_CURRENCY로 거절한다. */
	public static SupportedCurrency from(String code) {
		if (code == null || code.isBlank()) {
			throw new BusinessException(ErrorCode.INVALID_CURRENCY);
		}
		SupportedCurrency currency = BY_CODE.get(code.trim().toUpperCase(Locale.ROOT));
		if (currency == null) {
			throw new BusinessException(ErrorCode.INVALID_CURRENCY);
		}
		return currency;
	}

	/** 통화 선택 화면에 표시할 한글 통화명. */
	public String getKoreanName() {
		return koreanName;
	}

	/** ISO 4217 소수 자릿수. 금액 입력과 원화 환산 전 반올림 자리수를 결정한다. */
	public int getMinorUnit() {
		return minorUnit;
	}

	/**
	 * 환율이 고시되는 단위. 예를 들어 100단위로 고시되는 통화는 고시 환율을 100으로 나눠야 1단위 환율이 된다.
	 * 실제 값은 사용할 환율 API가 확정된 뒤 조정한다(#37).
	 */
	public int getQuoteUnit() {
		return quoteUnit;
	}
}
