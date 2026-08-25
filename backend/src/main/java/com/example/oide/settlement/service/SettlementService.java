package com.example.oide.settlement.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.currency.SupportedCurrency;
import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.payment.domain.Payment;
import com.example.oide.payment.domain.PaymentShare;
import com.example.oide.payment.repository.PaymentRepository;
import com.example.oide.payment.repository.PaymentShareRepository;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;
import com.example.oide.settlement.client.EximExchangeRateClient;
import com.example.oide.settlement.domain.ExchangeRate;
import com.example.oide.settlement.domain.Settlement;
import com.example.oide.settlement.domain.SettlementMemberResult;
import com.example.oide.settlement.domain.SettlementRate;
import com.example.oide.settlement.domain.SettlementTransfer;
import com.example.oide.settlement.dto.ManualRatesRequest;
import com.example.oide.settlement.dto.SettlementPreviewResponse;
import com.example.oide.settlement.dto.SettlementResponse;
import com.example.oide.settlement.repository.ExchangeRateRepository;
import com.example.oide.settlement.repository.SettlementMemberResultRepository;
import com.example.oide.settlement.repository.SettlementRateRepository;
import com.example.oide.settlement.repository.SettlementRepository;
import com.example.oide.settlement.repository.SettlementTransferRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SettlementService {

	private static final String EXIM = "EXIM";
	private static final String MANUAL = "MANUAL";
	private static final String FIXED = "FIXED";
	private static final int MAX_LOOKBACK_DAYS = 10;

	private final SettlementRoomRepository roomRepository;
	private final RoomMemberRepository roomMemberRepository;
	private final PaymentRepository paymentRepository;
	private final PaymentShareRepository paymentShareRepository;
	private final ExchangeRateRepository exchangeRateRepository;
	private final SettlementRepository settlementRepository;
	private final SettlementRateRepository settlementRateRepository;
	private final SettlementMemberResultRepository settlementMemberResultRepository;
	private final SettlementTransferRepository settlementTransferRepository;
	private final EximExchangeRateClient eximExchangeRateClient;

	@Transactional
	public SettlementPreviewResponse getPreview(Long roomId) {
		SettlementRoom room = findRoom(roomId);
		List<Payment> payments = paymentRepository.findAllByRoomIdOrderByPaidAtDescIdDesc(roomId);
		Map<String, ResolvedRate> rates = loadAutomaticRates(room, getCurrencies(payments), true);
		return createPreview(room, payments, Map.of(), rates);
	}

	@Transactional(readOnly = true)
	public SettlementPreviewResponse previewWithManualRates(Long roomId, ManualRatesRequest request) {
		SettlementRoom room = findRoom(roomId);
		List<Payment> payments = paymentRepository.findAllByRoomIdOrderByPaidAtDescIdDesc(roomId);
		Map<String, ResolvedRate> automaticRates = loadAutomaticRates(room, getCurrencies(payments), false);
		return createPreview(room, payments, getManualRates(room, request, getCurrencies(payments)), automaticRates);
	}

	@Transactional
	public SettlementResponse confirm(Long roomId, ManualRatesRequest request) {
		SettlementRoom room = roomRepository.findByIdForUpdate(roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
		List<Payment> payments = paymentRepository.findAllByRoomIdOrderByPaidAtDescIdDesc(roomId);
		Map<String, ResolvedRate> automaticRates = loadAutomaticRates(room, getCurrencies(payments), false);
		Map<String, ResolvedRate> manualRates = getManualRates(room, request, getCurrencies(payments));
		SettlementPreviewResponse preview = createPreview(room, payments, manualRates, automaticRates);
		if (!preview.settlementAvailable()) {
			throw new BusinessException(ErrorCode.SETTLEMENT_VALIDATION_FAILED);
		}

		LocalDateTime calculatedAt = LocalDateTime.now();
		Settlement settlement = settlementRepository.findByRoomId(roomId)
				.map(existing -> {
					existing.recalculate(calculatedAt);
					clearSettlementDetails(existing.getId());
					return existing;
				})
				.orElseGet(() -> settlementRepository.save(new Settlement(room, "COMPLETED", calculatedAt)));

		Map<String, ResolvedRate> usedRates = mergeRates(automaticRates, manualRates);
		settlementRateRepository.saveAll(usedRates.values().stream()
				.map(rate -> new SettlementRate(
						settlement,
						SupportedCurrency.from(rate.currency()),
						rate.rateToKrw(),
						rate.source(),
						rate.effectiveDate(),
						rate.quotedAt()))
				.toList());
		settlementMemberResultRepository.saveAll(preview.memberResults().stream()
				.map(result -> new SettlementMemberResult(
						settlement,
						findMember(roomId, result.memberId()),
						result.paidKrw(),
						result.owedKrw()))
				.toList());
		settlementTransferRepository.saveAll(preview.transfers().stream()
				.map(transfer -> new SettlementTransfer(
						settlement,
						findMember(roomId, transfer.senderMemberId()),
						findMember(roomId, transfer.receiverMemberId()),
						transfer.amountKrw()))
				.toList());

		return new SettlementResponse(settlement.getId(), settlement.getCalculatedAt(), preview);
	}

	@Transactional(readOnly = true)
	public SettlementResponse getSettlement(Long roomId) {
		Settlement settlement = settlementRepository.findByRoomId(roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.SETTLEMENT_NOT_FOUND));
		List<SettlementPreviewResponse.RateResponse> rates = settlementRateRepository
				.findAllBySettlementIdOrderByCurrencyAsc(settlement.getId()).stream()
				.map(rate -> new SettlementPreviewResponse.RateResponse(
						rate.getCurrency().name(), rate.getRateToKrw(), rate.getRateSource(), rate.getEffectiveDate(),
						rate.getQuotedAt(), false))
				.toList();
		List<SettlementPreviewResponse.MemberResultResponse> memberResults = settlementMemberResultRepository
				.findAllBySettlementIdOrderByMemberOrder(settlement.getId()).stream()
				.map(result -> new SettlementPreviewResponse.MemberResultResponse(
						result.getMember().getId(), result.getMember().getNickname(), result.getPaidKrw(),
						result.getOwedKrw(), result.getPaidKrw() - result.getOwedKrw()))
				.toList();
		List<SettlementPreviewResponse.TransferResponse> transfers = settlementTransferRepository
				.findAllBySettlementIdOrderByIdAsc(settlement.getId()).stream()
				.map(transfer -> new SettlementPreviewResponse.TransferResponse(
						transfer.getSender().getId(), transfer.getSender().getNickname(),
						transfer.getReceiver().getId(), transfer.getReceiver().getNickname(), transfer.getAmountKrw()))
				.toList();
		SettlementPreviewResponse result = new SettlementPreviewResponse(true, List.of(), List.of(), rates, memberResults, transfers);
		return new SettlementResponse(settlement.getId(), settlement.getCalculatedAt(), result);
	}

	private SettlementPreviewResponse createPreview(
			SettlementRoom room,
			List<Payment> payments,
			Map<String, ResolvedRate> manualRates,
			Map<String, ResolvedRate> automaticRates) {
		List<Long> invalidPaymentIds = findInvalidPaymentIds(payments);
		Map<String, ResolvedRate> rates = mergeRates(automaticRates, manualRates);
		List<String> missingCurrencies = getCurrencies(payments).stream()
				.filter(currency -> !rates.containsKey(currency))
				.sorted()
				.toList();
		List<SettlementPreviewResponse.RateResponse> rateResponses = getCurrencies(payments).stream()
				.sorted()
				.map(currency -> toRateResponse(currency, rates.get(currency)))
				.toList();
		if (!invalidPaymentIds.isEmpty() || !missingCurrencies.isEmpty()) {
			return new SettlementPreviewResponse(false, invalidPaymentIds, missingCurrencies, rateResponses, List.of(), List.of());
		}

		Calculation calculation = calculate(room.getId(), payments, rates);
		return new SettlementPreviewResponse(true, List.of(), List.of(), rateResponses, calculation.memberResults(), calculation.transfers());
	}

	private List<Long> findInvalidPaymentIds(List<Payment> payments) {
		List<Long> invalidPaymentIds = new ArrayList<>();
		for (Payment payment : payments) {
			List<PaymentShare> shares = paymentShareRepository.findAllByPaymentId(payment.getId());
			BigDecimal allocated = shares.stream().map(PaymentShare::getShareAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
			if (payment.getSplitGroup() == null
					|| payment.getSplitMethod() == null
					|| shares.isEmpty()
					|| allocated.compareTo(payment.getAmount()) != 0) {
				invalidPaymentIds.add(payment.getId());
			}
		}
		return invalidPaymentIds;
	}

	private Calculation calculate(Long roomId, List<Payment> payments, Map<String, ResolvedRate> rates) {
		List<RoomMember> members = roomMemberRepository.findAllByRoomIdOrderByDisplayOrder(roomId);
		Map<Long, Long> paidAmounts = new HashMap<>();
		Map<Long, Long> owedAmounts = new HashMap<>();
		members.forEach(member -> {
			paidAmounts.put(member.getId(), 0L);
			owedAmounts.put(member.getId(), 0L);
		});

		for (Payment payment : payments) {
			ResolvedRate rate = rates.get(payment.getCurrency().name());
			long paymentAmountKrw = toWholeWon(payment.getAmount().multiply(rate.rateToKrw()), RoundingMode.HALF_UP);
			paidAmounts.merge(payment.getPayer().getId(), paymentAmountKrw, Long::sum);
			allocatePaymentShares(payment, rate.rateToKrw(), paymentAmountKrw, owedAmounts);
		}

		List<SettlementPreviewResponse.MemberResultResponse> memberResults = members.stream()
				.map(member -> new SettlementPreviewResponse.MemberResultResponse(
						member.getId(), member.getNickname(), paidAmounts.get(member.getId()), owedAmounts.get(member.getId()),
						paidAmounts.get(member.getId()) - owedAmounts.get(member.getId())))
				.toList();
		return new Calculation(memberResults, createTransfers(memberResults, members));
	}

	private void allocatePaymentShares(
			Payment payment, BigDecimal rateToKrw, long paymentAmountKrw, Map<Long, Long> owedAmounts) {
		List<ShareAllocation> allocations = paymentShareRepository.findAllByPaymentId(payment.getId()).stream()
				.map(share -> {
					BigDecimal exactAmount = share.getShareAmount().multiply(rateToKrw);
					long floorAmount = toWholeWon(exactAmount, RoundingMode.DOWN);
					return new ShareAllocation(share.getMember(), floorAmount, exactAmount.remainder(BigDecimal.ONE));
				})
				.sorted(Comparator.comparing(ShareAllocation::fractionalPart).reversed()
						.thenComparing(allocation -> allocation.member().getDisplayOrder()))
				.toList();
		long floorTotal = allocations.stream().mapToLong(ShareAllocation::amountKrw).sum();
		long remainingWon = paymentAmountKrw - floorTotal;
		for (int index = 0; index < allocations.size(); index++) {
			ShareAllocation allocation = allocations.get(index);
			long amountKrw = allocation.amountKrw() + (index < remainingWon ? 1 : 0);
			owedAmounts.merge(allocation.member().getId(), amountKrw, Long::sum);
		}
	}

	private List<SettlementPreviewResponse.TransferResponse> createTransfers(
			List<SettlementPreviewResponse.MemberResultResponse> memberResults, List<RoomMember> members) {
		Map<Long, Integer> displayOrders = new HashMap<>();
		members.forEach(member -> displayOrders.put(member.getId(), member.getDisplayOrder()));
		List<Balance> debtors = memberResults.stream()
				.filter(result -> result.netKrw() < 0)
				.map(result -> new Balance(result.memberId(), result.nickname(), -result.netKrw()))
				.sorted(Comparator.comparing(balance -> displayOrders.get(balance.memberId())))
				.toList();
		List<Balance> creditors = memberResults.stream()
				.filter(result -> result.netKrw() > 0)
				.map(result -> new Balance(result.memberId(), result.nickname(), result.netKrw()))
				.sorted(Comparator.comparing(balance -> displayOrders.get(balance.memberId())))
				.toList();
		List<Balance> remainingDebtors = debtors.stream().map(Balance::copy).toList();
		List<Balance> remainingCreditors = creditors.stream().map(Balance::copy).toList();
		List<SettlementPreviewResponse.TransferResponse> transfers = new ArrayList<>();
		int debtorIndex = 0;
		int creditorIndex = 0;
		while (debtorIndex < remainingDebtors.size() && creditorIndex < remainingCreditors.size()) {
			Balance debtor = remainingDebtors.get(debtorIndex);
			Balance creditor = remainingCreditors.get(creditorIndex);
			long amountKrw = Math.min(debtor.remainingKrw, creditor.remainingKrw);
			transfers.add(new SettlementPreviewResponse.TransferResponse(
					debtor.memberId, debtor.nickname, creditor.memberId, creditor.nickname, amountKrw));
			debtor.remainingKrw -= amountKrw;
			creditor.remainingKrw -= amountKrw;
			if (debtor.remainingKrw == 0) {
				debtorIndex++;
			}
			if (creditor.remainingKrw == 0) {
				creditorIndex++;
			}
		}
		return transfers;
	}

	private Map<String, ResolvedRate> loadAutomaticRates(
			SettlementRoom room, Set<String> currencies, boolean shouldFetch) {
		LocalDate baseDate = room.getCreatedAt().toLocalDate();
		Map<String, ResolvedRate> rates = new LinkedHashMap<>();
		for (String currency : currencies) {
			if ("KRW".equals(currency)) {
				rates.put(currency, new ResolvedRate(currency, BigDecimal.ONE, FIXED, baseDate, LocalDateTime.now()));
				continue;
			}
			findCachedRate(currency, baseDate).ifPresent(rate -> rates.put(currency, toResolvedRate(rate)));
		}
		if (!shouldFetch || rates.keySet().containsAll(currencies)) {
			return rates;
		}

		for (int offset = 0; offset <= MAX_LOOKBACK_DAYS && !rates.keySet().containsAll(currencies); offset++) {
			LocalDate date = baseDate.minusDays(offset);
			for (EximExchangeRateClient.ExchangeRateQuote quote : eximExchangeRateClient.fetchRates(date)) {
				if (!exchangeRateRepository.existsByProviderAndAnnouncedDateAndCurrency(EXIM, date, quote.currency())) {
					exchangeRateRepository.save(new ExchangeRate(
							EXIM, date, quote.currency(), quote.rateToKrw(), quote.quotedUnit(), LocalDateTime.now()));
				}
			}
			for (String currency : currencies) {
				if (!rates.containsKey(currency)) {
					findCachedRate(currency, baseDate).ifPresent(rate -> rates.put(currency, toResolvedRate(rate)));
				}
			}
		}
		return rates;
	}

	private java.util.Optional<ExchangeRate> findCachedRate(String currency, LocalDate baseDate) {
		return exchangeRateRepository.findFirstByProviderAndCurrencyAndAnnouncedDateBetweenOrderByAnnouncedDateDesc(
				EXIM, currency, baseDate.minusDays(MAX_LOOKBACK_DAYS), baseDate);
	}

	private Map<String, ResolvedRate> getManualRates(
			SettlementRoom room, ManualRatesRequest request, Set<String> paymentCurrencies) {
		if (request.manualRates() == null) {
			return Map.of();
		}
		Set<String> currencies = new HashSet<>();
		Map<String, ResolvedRate> rates = new LinkedHashMap<>();
		for (ManualRatesRequest.ManualRateRequest manualRate : request.manualRates()) {
			String currency = manualRate.currency().trim().toUpperCase();
			if (!currencies.add(currency) || "KRW".equals(currency) || !paymentCurrencies.contains(currency)) {
				throw new BusinessException(ErrorCode.INVALID_REQUEST);
			}
			rates.put(currency, new ResolvedRate(
					currency, manualRate.rateToKrw(), MANUAL, room.getCreatedAt().toLocalDate(), LocalDateTime.now()));
		}
		return rates;
	}

	private Map<String, ResolvedRate> mergeRates(
			Map<String, ResolvedRate> automaticRates, Map<String, ResolvedRate> manualRates) {
		Map<String, ResolvedRate> rates = new LinkedHashMap<>(automaticRates);
		rates.putAll(manualRates);
		return rates;
	}

	private Set<String> getCurrencies(List<Payment> payments) {
		return payments.stream().map(payment -> payment.getCurrency().name())
				.collect(java.util.stream.Collectors.toSet());
	}

	private SettlementPreviewResponse.RateResponse toRateResponse(String currency, ResolvedRate rate) {
		if (rate == null) {
			return new SettlementPreviewResponse.RateResponse(currency, null, null, null, null, true);
		}
		return new SettlementPreviewResponse.RateResponse(
				rate.currency(), rate.rateToKrw(), rate.source(), rate.effectiveDate(), rate.quotedAt(), false);
	}

	private ResolvedRate toResolvedRate(ExchangeRate rate) {
		return new ResolvedRate(
				rate.getCurrency(), rate.getRateToKrw(), EXIM, rate.getAnnouncedDate(), rate.getFetchedAt());
	}

	private long toWholeWon(BigDecimal amount, RoundingMode roundingMode) {
		return amount.setScale(0, roundingMode).longValueExact();
	}

	private SettlementRoom findRoom(Long roomId) {
		return roomRepository.findById(roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
	}

	private RoomMember findMember(Long roomId, Long memberId) {
		return roomMemberRepository.findAllByIdInAndRoomId(List.of(memberId), roomId).stream()
				.findFirst()
				.orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
	}

	private void clearSettlementDetails(Long settlementId) {
		settlementTransferRepository.deleteAllBySettlementId(settlementId);
		settlementMemberResultRepository.deleteAllBySettlementId(settlementId);
		settlementRateRepository.deleteAllBySettlementId(settlementId);
	}

	private record ResolvedRate(
			String currency,
			BigDecimal rateToKrw,
			String source,
			LocalDate effectiveDate,
			LocalDateTime quotedAt) {
	}

	private record ShareAllocation(RoomMember member, long amountKrw, BigDecimal fractionalPart) {
	}

	private record Calculation(
			List<SettlementPreviewResponse.MemberResultResponse> memberResults,
			List<SettlementPreviewResponse.TransferResponse> transfers) {
	}

	private static class Balance {

		private final Long memberId;
		private final String nickname;
		private long remainingKrw;

		private Balance(Long memberId, String nickname, long remainingKrw) {
			this.memberId = memberId;
			this.nickname = nickname;
			this.remainingKrw = remainingKrw;
		}

		private Balance copy() {
			return new Balance(memberId, nickname, remainingKrw);
		}

		private Long memberId() {
			return memberId;
		}
	}
}
