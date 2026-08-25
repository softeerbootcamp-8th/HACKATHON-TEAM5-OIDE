package com.example.oide.global.currency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;

@DisplayName("SupportedCurrency 단위 테스트")
class SupportedCurrencyTest {

	@Test
	@DisplayName("지원 통화는 KRW를 가장 앞에 둔 21개이며 선언 순서가 화면 노출 순서다")
	void definesTwentyOneCurrenciesInDisplayOrder() {
		SupportedCurrency[] currencies = SupportedCurrency.values();

		assertThat(currencies).hasSize(21);
		assertThat(currencies[0]).isEqualTo(SupportedCurrency.KRW);
		assertThat(currencies)
				.startsWith(
						SupportedCurrency.KRW,
						SupportedCurrency.JPY,
						SupportedCurrency.VND,
						SupportedCurrency.CNY,
						SupportedCurrency.USD,
						SupportedCurrency.EUR)
				.endsWith(SupportedCurrency.MNT, SupportedCurrency.CAD, SupportedCurrency.INR);
	}

	@Test
	@DisplayName("통화 코드로 변환하면 한글명과 소수 자릿수를 함께 얻는다")
	void convertsCodeToCurrency() {
		SupportedCurrency currency = SupportedCurrency.from("JPY");

		assertThat(currency).isEqualTo(SupportedCurrency.JPY);
		assertThat(currency.getKoreanName()).isEqualTo("엔");
		assertThat(currency.getMinorUnit()).isZero();
	}

	@ParameterizedTest
	@ValueSource(strings = {"usd", "Usd", " USD "})
	@DisplayName("소문자와 앞뒤 공백이 섞인 코드도 같은 통화로 변환한다")
	void convertsCodeIgnoringCaseAndPadding(String code) {
		assertThat(SupportedCurrency.from(code)).isEqualTo(SupportedCurrency.USD);
	}

	@ParameterizedTest
	@ValueSource(strings = {"XYZ", "KR", "KRWW", "RUB"})
	@DisplayName("지원하지 않는 코드는 INVALID_CURRENCY 예외를 던진다")
	void rejectsUnsupportedCode(String code) {
		assertThatThrownBy(() -> SupportedCurrency.from(code))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_CURRENCY);
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = {"   "})
	@DisplayName("코드가 없거나 공백뿐이면 INVALID_CURRENCY 예외를 던진다")
	void rejectsMissingCode(String code) {
		assertThatThrownBy(() -> SupportedCurrency.from(code))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_CURRENCY);
	}

	@Test
	@DisplayName("소수 자릿수가 없는 통화와 있는 통화를 구분한다")
	void keepsIsoMinorUnitPerCurrency() {
		assertThat(SupportedCurrency.KRW.getMinorUnit()).isZero();
		assertThat(SupportedCurrency.JPY.getMinorUnit()).isZero();
		assertThat(SupportedCurrency.VND.getMinorUnit()).isZero();
		assertThat(SupportedCurrency.USD.getMinorUnit()).isEqualTo(2);
		assertThat(SupportedCurrency.IDR.getMinorUnit()).isEqualTo(2);
	}

	@Test
	@DisplayName("100단위로 고시되는 통화만 환율 고시 단위가 100이다")
	void keepsQuoteUnitPerCurrency() {
		assertThat(SupportedCurrency.JPY.getQuoteUnit()).isEqualTo(100);
		assertThat(SupportedCurrency.VND.getQuoteUnit()).isEqualTo(100);
		assertThat(SupportedCurrency.IDR.getQuoteUnit()).isEqualTo(100);
		assertThat(SupportedCurrency.KRW.getQuoteUnit()).isEqualTo(1);
		assertThat(SupportedCurrency.USD.getQuoteUnit()).isEqualTo(1);
	}
}
