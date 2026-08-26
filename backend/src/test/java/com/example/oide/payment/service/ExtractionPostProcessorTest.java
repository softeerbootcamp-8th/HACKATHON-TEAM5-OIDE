package com.example.oide.payment.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;

import com.example.oide.payment.client.DateSource;
import com.example.oide.payment.client.RawTransaction;
import com.example.oide.payment.client.TransactionCategory;
import com.example.oide.payment.client.TransactionDirection;

class ExtractionPostProcessorTest {

	private static final RoomContext ROOM =
			new RoomContext(1L, LocalDateTime.of(2026, 8, 25, 12, 0), "KRW");

	private final ExtractionPostProcessor postProcessor = new ExtractionPostProcessor();

	@Test
	void 화면에_연도가_없으면_정산방_생성_시점_기준으로_추론하고_표시한다() {
		List<ExtractedPayment> results = process(transaction("맥도날드 서초뱅뱅점", "7700", "KRW", "08-19", "19:42"));

		assertThat(results).hasSize(1);
		assertThat(results.getFirst().paidAt()).isEqualTo(LocalDateTime.of(2026, 8, 19, 19, 42));
		assertThat(results.getFirst().reviewFlags()).contains(ReviewFlag.YEAR_INFERRED);
	}

	@Test
	void 연도가_바뀌는_경계에서는_지난해로_본다() {
		// 1월 3일에 만든 정산방에서 12월 28일 결제를 보면 올해가 아니라 지난해다.
		RoomContext newYearRoom = new RoomContext(1L, LocalDateTime.of(2026, 1, 3, 9, 0), "KRW");

		List<ExtractedPayment> results =
				postProcessor.process(
						List.of(transaction("스타벅스", "7900", "KRW", "12-28", "16:51")), newYearRoom, 0, "a.jpg");

		assertThat(results.getFirst().paidAt()).isEqualTo(LocalDateTime.of(2025, 12, 28, 16, 51));
	}

	@Test
	void 화면에_연도가_있으면_그대로_쓰고_추론했다고_표시하지_않는다() {
		List<ExtractedPayment> results =
				process(transaction("구글페이먼트코리아", "29000", "KRW", "2026-08-13", "08:02"));

		assertThat(results.getFirst().paidAt()).isEqualTo(LocalDateTime.of(2026, 8, 13, 8, 2));
		assertThat(results.getFirst().reviewFlags()).doesNotContain(ReviewFlag.YEAR_INFERRED);
	}

	@Test
	void 통화를_확정하지_못하면_정산방_기본_통화를_넣고_표시한다() {
		List<ExtractedPayment> results = process(transaction("어딘가", "3.50", null, "08-19", "19:42"));

		assertThat(results.getFirst().currency()).isEqualTo("KRW");
		assertThat(results.getFirst().reviewFlags()).contains(ReviewFlag.CURRENCY_DEFAULTED);
	}

	@Test
	void 외화는_원_통화_단위를_그대로_보존한다() {
		List<ExtractedPayment> results = process(transaction("STARBUCKS", "3.50", "USD", "08-19", "19:42"));

		assertThat(results.getFirst().amount()).isEqualByComparingTo(new BigDecimal("3.50"));
		assertThat(results.getFirst().currency()).isEqualTo("USD");
	}

	@Test
	void 시각이_없으면_자정으로_두고_표시한다() {
		List<ExtractedPayment> results = process(transaction("어딘가", "5000", "KRW", "08-19", null));

		assertThat(results.getFirst().paidAt()).isEqualTo(LocalDateTime.of(2026, 8, 19, 0, 0));
		assertThat(results.getFirst().reviewFlags()).contains(ReviewFlag.TIME_MISSING);
	}

	@Test
	void 날짜가_없으면_결제_시각을_비워둔다() {
		List<ExtractedPayment> results = process(transaction("어딘가", "5000", "KRW", null, null));

		assertThat(results.getFirst().paidAt()).isNull();
		assertThat(results.getFirst().reviewFlags()).contains(ReviewFlag.DATE_MISSING);
	}

	@Test
	void 결제가_아닌_거래는_기본_선택에서_빼고_이유를_남긴다() {
		RawTransaction topUp =
				new RawTransaction(
						"네이버페이충전",
						"30000",
						"KRW",
						"08-18",
						DateSource.HEADER,
						"17:03",
						TransactionDirection.OUT,
						TransactionCategory.TOPUP,
						false);

		List<ExtractedPayment> results = process(topUp);

		assertThat(results.getFirst().selected()).isFalse();
		assertThat(results.getFirst().reviewFlags()).contains(ReviewFlag.NOT_A_PAYMENT);
	}

	@Test
	void 잘린_행은_읽되_기본_선택에서_뺀다() {
		RawTransaction partial =
				new RawTransaction(
						null,
						"367579",
						"KRW",
						null,
						DateSource.NONE,
						"08:54",
						TransactionDirection.OUT,
						TransactionCategory.PAYMENT,
						true);

		List<ExtractedPayment> results = process(partial);

		assertThat(results.getFirst().selected()).isFalse();
		assertThat(results.getFirst().reviewFlags())
				.contains(ReviewFlag.PARTIAL_ROW, ReviewFlag.MERCHANT_MISSING);
	}

	@Test
	void 금액을_읽지_못한_행은_버린다() {
		List<ExtractedPayment> results = process(transaction("어딘가", "읽을수없음", "KRW", "08-19", "19:42"));

		assertThat(results).isEmpty();
	}

	@Test
	void 스크롤_캡처로_겹친_거래는_두_번째부터_선택을_해제한다() {
		List<ExtractedPayment> first = process(transaction("맥도날드 서초뱅뱅점", "7700", "KRW", "08-19", "19:42"));
		List<ExtractedPayment> second = process(transaction("맥도날드 서초뱅뱅점", "7700", "KRW", "08-19", "19:42"));

		List<ExtractedPayment> merged =
				postProcessor.markDuplicates(
						Stream.concat(first.stream(), second.stream()).toList());

		assertThat(merged.get(0).selected()).isTrue();
		assertThat(merged.get(1).selected()).isFalse();
		assertThat(merged.get(1).reviewFlags()).contains(ReviewFlag.DUPLICATE_SUSPECTED);
	}

	private List<ExtractedPayment> process(RawTransaction raw) {
		return postProcessor.process(List.of(raw), ROOM, 0, "screenshot.jpg");
	}

	private static RawTransaction transaction(
			String merchant, String amount, String currency, String date, String time) {
		return new RawTransaction(
				merchant,
				amount,
				currency,
				date,
				date == null ? DateSource.NONE : DateSource.HEADER,
				time,
				TransactionDirection.OUT,
				TransactionCategory.PAYMENT,
				false);
	}
}
