package com.example.oide.payment.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.MonthDay;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.example.oide.payment.client.RawTransaction;
import com.example.oide.payment.client.TransactionDirection;
import lombok.extern.slf4j.Slf4j;

/**
 * 모델이 읽은 값을 실제로 쓸 수 있는 값으로 바꾼다.
 *
 * <p>연도 추론과 통화 폴백을 모델이 아니라 여기서 하는 것이 이 클래스의 존재 이유다. 모델에
 * 추론을 맡기면 근거 없이 그럴듯한 값을 채워 넣고, 그게 틀렸는지 사용자도 알 수 없게 된다.
 * 서버가 규칙으로 보정하면 보정했다는 사실 자체를 {@link ReviewFlag}로 남길 수 있다.
 */
@Slf4j
@Component
public class ExtractionPostProcessor {

	private static final Pattern FULL_DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
	private static final Pattern MONTH_DAY = Pattern.compile("\\d{2}-\\d{2}");
	private static final Pattern AMOUNT_NOISE = Pattern.compile("[^0-9.]");
	private static final Pattern CURRENCY_CODE = Pattern.compile("[A-Z]{3}");

	/**
	 * 정산방은 7일만 유지되므로 결제는 방 생성 시점 근처에 몰린다. 후보 날짜가 이 범위보다 더 미래로
	 * 계산되면 지난해 거래로 본다. 연말연시에 걸친 여행에서도 이 규칙이 맞는 연도를 고른다.
	 */
	private static final int ROOM_LIFETIME_DAYS = 7;

	public List<ExtractedPayment> process(
			List<RawTransaction> transactions,
			RoomContext room,
			int imageIndex,
			String filename) {

		List<ExtractedPayment> results = new ArrayList<>();
		for (RawTransaction raw : transactions) {
			Set<ReviewFlag> flags = EnumSet.noneOf(ReviewFlag.class);

			BigDecimal amount = parseAmount(raw.amount());
			if (amount == null) {
				// 금액 없는 결제 내역은 정산에 쓸 수 없다. 사용자가 고칠 근거도 없으므로 버린다.
				log.warn("금액을 파싱하지 못해 행을 버린다. raw={}", raw.amount());
				continue;
			}

			LocalDateTime paidAt = resolvePaidAt(raw, room.createdAt(), flags);
			String currency = resolveCurrency(raw.currency(), room.defaultCurrency(), flags);

			if (raw.merchant() == null) {
				flags.add(ReviewFlag.MERCHANT_MISSING);
			}
			if (raw.partial()) {
				flags.add(ReviewFlag.PARTIAL_ROW);
			}
			boolean payment =
					raw.category().isSettlementCandidate() && raw.direction() == TransactionDirection.OUT;
			if (!payment) {
				flags.add(ReviewFlag.NOT_A_PAYMENT);
			}

			results.add(
					new ExtractedPayment(
							UUID.randomUUID().toString(),
							imageIndex,
							filename,
							raw.merchant(),
							amount,
							currency,
							paidAt,
							raw.category(),
							payment && !raw.partial(),
							flags));
		}
		return results;
	}

	/**
	 * 스크롤하며 찍은 스크린샷은 구간이 겹쳐 같은 거래가 여러 장에 나온다. 자동으로 지우지 않고
	 * 두 번째 것부터 선택만 해제한다. 실제로 같은 금액을 같은 가게에서 두 번 결제했을 수도 있어서,
	 * 판단은 사용자에게 남긴다.
	 */
	public List<ExtractedPayment> markDuplicates(List<ExtractedPayment> items) {
		Set<String> seen = new HashSet<>();
		List<ExtractedPayment> results = new ArrayList<>(items.size());
		for (ExtractedPayment item : items) {
			String key =
					"%s|%s|%s|%s"
							.formatted(item.merchant(), item.amount(), item.currency(), item.paidAt());
			results.add(seen.add(key) ? item : item.deselectAs(ReviewFlag.DUPLICATE_SUSPECTED));
		}
		return results;
	}

	private LocalDateTime resolvePaidAt(
			RawTransaction raw, LocalDateTime roomCreatedAt, Set<ReviewFlag> flags) {

		LocalDate date = resolveDate(raw.date(), roomCreatedAt, flags);
		if (date == null) {
			flags.add(ReviewFlag.DATE_MISSING);
			return null;
		}
		LocalTime time = parseTime(raw.time());
		if (time == null) {
			flags.add(ReviewFlag.TIME_MISSING);
			time = LocalTime.MIDNIGHT;
		}
		return LocalDateTime.of(date, time);
	}

	private LocalDate resolveDate(String date, LocalDateTime roomCreatedAt, Set<ReviewFlag> flags) {
		if (date == null) {
			return null;
		}
		try {
			if (FULL_DATE.matcher(date).matches()) {
				// 화면에 연도가 그대로 있었던 경우다. 보정할 것이 없으니 플래그도 붙이지 않는다.
				return LocalDate.parse(date);
			}
			if (MONTH_DAY.matcher(date).matches()) {
				flags.add(ReviewFlag.YEAR_INFERRED);
				return inferYear(MonthDay.parse("--" + date), roomCreatedAt);
			}
		} catch (RuntimeException exception) {
			log.warn("날짜를 해석하지 못했다. raw={}", date);
		}
		return null;
	}

	private LocalDate inferYear(MonthDay monthDay, LocalDateTime roomCreatedAt) {
		LocalDate reference =
				(roomCreatedAt == null ? LocalDateTime.now() : roomCreatedAt).toLocalDate();
		LocalDate candidate = monthDay.atYear(reference.getYear());
		if (candidate.isAfter(reference.plusDays(ROOM_LIFETIME_DAYS))) {
			candidate = monthDay.atYear(reference.getYear() - 1);
		}
		return candidate;
	}

	private LocalTime parseTime(String time) {
		if (time == null) {
			return null;
		}
		try {
			return LocalTime.parse(time.length() == 5 ? time + ":00" : time);
		} catch (RuntimeException exception) {
			log.warn("시각을 해석하지 못했다. raw={}", time);
			return null;
		}
	}

	private String resolveCurrency(String currency, String roomDefault, Set<ReviewFlag> flags) {
		if (currency != null) {
			String normalized = currency.trim().toUpperCase();
			if (CURRENCY_CODE.matcher(normalized).matches()) {
				return normalized;
			}
		}
		// "$"처럼 여러 통화가 공유하는 기호는 모델이 null로 두게 되어 있다. 방 기본 통화로 채우고
		// 사용자가 확인하게 한다.
		flags.add(ReviewFlag.CURRENCY_DEFAULTED);
		return roomDefault;
	}

	private BigDecimal parseAmount(String amount) {
		if (amount == null) {
			return null;
		}
		String digits = AMOUNT_NOISE.matcher(amount).replaceAll("");
		if (digits.isEmpty()) {
			return null;
		}
		try {
			BigDecimal parsed = new BigDecimal(digits);
			return parsed.signum() < 0 ? parsed.negate() : parsed;
		} catch (NumberFormatException exception) {
			return null;
		}
	}
}
