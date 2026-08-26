package com.example.oide.settlement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.currency.SupportedCurrency;
import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.payment.domain.Payment;
import com.example.oide.payment.domain.PaymentShare;
import com.example.oide.payment.domain.SplitMethod;
import com.example.oide.payment.repository.PaymentRepository;
import com.example.oide.payment.repository.PaymentShareRepository;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;
import com.example.oide.settlement.dto.ManualRatesRequest;
import com.example.oide.settlement.dto.SettlementPreviewResponse;
import com.example.oide.settlement.dto.SettlementResponse;
import com.example.oide.settlement.repository.SettlementMemberResultRepository;
import com.example.oide.settlement.repository.SettlementRepository;
import com.example.oide.splitgroup.domain.SplitGroup;
import com.example.oide.splitgroup.domain.SplitGroupType;
import com.example.oide.splitgroup.repository.SplitGroupRepository;

@SpringBootTest
@Transactional
class SettlementServiceTest {

	@Autowired
	private SettlementService settlementService;

	@Autowired
	private SettlementRoomRepository roomRepository;

	@Autowired
	private RoomMemberRepository roomMemberRepository;

	@Autowired
	private SplitGroupRepository splitGroupRepository;

	@Autowired
	private PaymentRepository paymentRepository;

	@Autowired
	private PaymentShareRepository paymentShareRepository;

	@Autowired
	private SettlementRepository settlementRepository;

	@Autowired
	private SettlementMemberResultRepository settlementMemberResultRepository;

	@Test
	void confirmsMixedCurrencySettlementWithBalancedTransfers() {
		SettlementRoom room = roomRepository.save(new SettlementRoom("code", "여행", SupportedCurrency.KRW));
		RoomMember memberA = roomMemberRepository.save(new RoomMember(room, "A", 1));
		RoomMember memberB = roomMemberRepository.save(new RoomMember(room, "B", 2));
		SplitGroup group = splitGroupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));

		Payment dinner = paymentRepository.save(new Payment(
				room, memberA, "저녁", LocalDateTime.now(), new BigDecimal("15"), SupportedCurrency.USD,
				SplitMethod.EQUAL, true));
		dinner.assignGroup(group);
		paymentShareRepository.saveAll(List.of(
				new PaymentShare(dinner, memberA, new BigDecimal("10")),
				new PaymentShare(dinner, memberB, new BigDecimal("5"))));

		Payment transport = paymentRepository.save(new Payment(
				room, memberB, "교통", LocalDateTime.now(), new BigDecimal("1000"), SupportedCurrency.JPY,
				SplitMethod.EQUAL, true));
		transport.assignGroup(group);
		paymentShareRepository.saveAll(List.of(
				new PaymentShare(transport, memberA, new BigDecimal("333")),
				new PaymentShare(transport, memberB, new BigDecimal("667"))));

		SettlementResponse response = settlementService.confirm(room.getId(), new ManualRatesRequest(List.of(
				new ManualRatesRequest.ManualRateRequest("USD", new BigDecimal("1350.25")),
				new ManualRatesRequest.ManualRateRequest("JPY", new BigDecimal("9.1034")))));

		assertThat(response.result().settlementAvailable()).isTrue();
		assertThat(response.result().memberResults())
				.extracting(result -> result.nickname() + ":" + result.paidKrw() + ":" + result.owedKrw())
				.containsExactly("A:20254:16534", "B:9103:12823");
		assertThat(response.result().transfers())
				.extracting(transfer -> transfer.senderNickname() + "->" + transfer.receiverNickname() + ":" + transfer.amountKrw())
				.containsExactly("B->A:3720");
		assertThat(settlementRepository.findByRoomId(room.getId())).isPresent();
	}

	@Test
	void completesMemberSettlementIdempotently() {
		ConfirmedSettlement confirmed = createConfirmedSettlement("completion-code");

		settlementService.completeMemberSettlement(confirmed.room().getId(), confirmed.memberA().getId());
		LocalDateTime completedAt = settlementMemberResultRepository
				.findBySettlementIdAndMemberId(confirmed.settlementId(), confirmed.memberA().getId())
				.orElseThrow()
				.getCompletedAt();

		settlementService.completeMemberSettlement(confirmed.room().getId(), confirmed.memberA().getId());

		SettlementResponse response = settlementService.getSettlement(confirmed.room().getId());
		assertThat(response.completedMemberIds()).containsExactly(confirmed.memberA().getId());
		assertThat(settlementMemberResultRepository
				.findBySettlementIdAndMemberId(confirmed.settlementId(), confirmed.memberA().getId())
				.orElseThrow()
				.getCompletedAt()).isEqualTo(completedAt);
	}

	@Test
	void ignoresPaymentsExcludedFromSettlement() {
		SettlementRoom room = roomRepository.save(
				new SettlementRoom("inclusion-code", "여행", SupportedCurrency.KRW));
		RoomMember memberA = roomMemberRepository.save(new RoomMember(room, "A", 1));
		RoomMember memberB = roomMemberRepository.save(new RoomMember(room, "B", 2));
		SplitGroup group = splitGroupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));

		Payment included = paymentRepository.save(new Payment(
				room, memberA, "식사", LocalDateTime.now(), new BigDecimal("10000"),
				SupportedCurrency.KRW, SplitMethod.EQUAL, true));
		included.assignGroup(group);
		paymentShareRepository.saveAll(List.of(
				new PaymentShare(included, memberA, new BigDecimal("5000")),
				new PaymentShare(included, memberB, new BigDecimal("5000"))));
		paymentRepository.save(new Payment(
				room, memberB, "제외 항목", LocalDateTime.now(), new BigDecimal("30000"),
				SupportedCurrency.KRW, null, false));

		SettlementResponse response = settlementService.confirm(
				room.getId(), new ManualRatesRequest(List.of()));

		assertThat(response.result().settlementAvailable()).isTrue();
		assertThat(response.result().memberResults())
				.extracting(result -> result.nickname() + ":" + result.paidKrw() + ":" + result.owedKrw())
				.containsExactly("A:10000:5000", "B:0:5000");
	}

	@Test
	void repairsIncompleteSharesBeforeCreatingPreview() {
		SettlementRoom room = roomRepository.save(
				new SettlementRoom("repair-code", "여행", SupportedCurrency.KRW));
		RoomMember memberA = roomMemberRepository.save(new RoomMember(room, "A", 1));
		RoomMember memberB = roomMemberRepository.save(new RoomMember(room, "B", 2));
		SplitGroup group = splitGroupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));
		Payment payment = paymentRepository.save(new Payment(
				room, memberA, "식사", LocalDateTime.now(), new BigDecimal("10000"),
				SupportedCurrency.KRW, null, true));
		payment.assignGroup(group);

		SettlementPreviewResponse response = settlementService.getPreview(room.getId());

		assertThat(response.settlementAvailable()).isTrue();
		assertThat(payment.getSplitMethod()).isEqualTo(SplitMethod.EQUAL);
		assertThat(paymentShareRepository.findAllByPaymentId(payment.getId()))
				.extracting(PaymentShare::getShareAmount)
				.containsExactly(new BigDecimal("5000"), new BigDecimal("5000"));
	}

	@Test
	void appliesManualRateToKrwPayments() {
		SettlementRoom room = roomRepository.save(
				new SettlementRoom("krw-rate-code", "여행", SupportedCurrency.KRW));
		RoomMember memberA = roomMemberRepository.save(new RoomMember(room, "A", 1));
		RoomMember memberB = roomMemberRepository.save(new RoomMember(room, "B", 2));
		SplitGroup group = splitGroupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));
		Payment payment = paymentRepository.save(new Payment(
				room, memberA, "식사", LocalDateTime.now(), new BigDecimal("10000"),
				SupportedCurrency.KRW, SplitMethod.EQUAL, true));
		payment.assignGroup(group);
		paymentShareRepository.saveAll(List.of(
				new PaymentShare(payment, memberA, new BigDecimal("5000")),
				new PaymentShare(payment, memberB, new BigDecimal("5000"))));

		SettlementResponse response = settlementService.confirm(
				room.getId(), new ManualRatesRequest(List.of(
						new ManualRatesRequest.ManualRateRequest("KRW", new BigDecimal("2")))));

		assertThat(response.result().memberResults())
				.extracting(result -> result.nickname() + ":" + result.paidKrw() + ":" + result.owedKrw())
				.containsExactly("A:20000:10000", "B:0:10000");
	}

	@Test
	void uncompletesMemberSettlement() {
		ConfirmedSettlement confirmed = createConfirmedSettlement("uncompletion-code");
		settlementService.completeMemberSettlement(confirmed.room().getId(), confirmed.memberA().getId());

		settlementService.uncompleteMemberSettlement(confirmed.room().getId(), confirmed.memberA().getId());

		assertThat(settlementMemberResultRepository
				.findBySettlementIdAndMemberId(confirmed.settlementId(), confirmed.memberA().getId())
				.orElseThrow()
				.getCompletedAt()).isNull();
		assertThat(settlementService.getSettlement(confirmed.room().getId()).completedMemberIds()).isEmpty();
	}

	@Test
	void rejectsMemberFromAnotherRoom() {
		ConfirmedSettlement confirmed = createConfirmedSettlement("member-room-code");
		SettlementRoom anotherRoom = roomRepository.save(
				new SettlementRoom("another-code", "다른 여행", SupportedCurrency.KRW));
		RoomMember anotherMember = roomMemberRepository.save(new RoomMember(anotherRoom, "C", 1));

		assertThatThrownBy(() -> settlementService.completeMemberSettlement(
				confirmed.room().getId(), anotherMember.getId()))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
	}

	@Test
	void preservesMemberCompletionWhenSettlementIsRecalculated() {
		ConfirmedSettlement confirmed = createConfirmedSettlement("recalculation-code");
		settlementService.completeMemberSettlement(confirmed.room().getId(), confirmed.memberA().getId());

		SettlementResponse recalculated = settlementService.confirm(
				confirmed.room().getId(), new ManualRatesRequest(List.of()));

		assertThat(recalculated.completedMemberIds()).containsExactly(confirmed.memberA().getId());
		assertThat(settlementService.getSettlement(confirmed.room().getId()).completedMemberIds())
				.containsExactly(confirmed.memberA().getId());
	}

	@Test
	void resetsPayerCompletionWhenExchangeRateChanges() {
		ConfirmedSettlement confirmed = createConfirmedSettlement("rate-change-code");
		settlementService.completeMemberSettlement(confirmed.room().getId(), confirmed.memberA().getId());

		SettlementResponse recalculated = settlementService.confirm(
				confirmed.room().getId(),
				new ManualRatesRequest(List.of(
						new ManualRatesRequest.ManualRateRequest("KRW", new BigDecimal("2")))));

		assertThat(recalculated.completedMemberIds()).isEmpty();
		assertThat(settlementService.getSettlement(confirmed.room().getId()).completedMemberIds()).isEmpty();
	}

	private ConfirmedSettlement createConfirmedSettlement(String shareCode) {
		SettlementRoom room = roomRepository.save(
				new SettlementRoom(shareCode, "여행", SupportedCurrency.KRW));
		RoomMember memberA = roomMemberRepository.save(new RoomMember(room, "A", 1));
		RoomMember memberB = roomMemberRepository.save(new RoomMember(room, "B", 2));
		SplitGroup group = splitGroupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));
		Payment payment = paymentRepository.save(new Payment(
				room, memberA, "식사", LocalDateTime.now(), new BigDecimal("10000"),
				SupportedCurrency.KRW, SplitMethod.EQUAL, true));
		payment.assignGroup(group);
		paymentShareRepository.saveAll(List.of(
				new PaymentShare(payment, memberA, new BigDecimal("5000")),
				new PaymentShare(payment, memberB, new BigDecimal("5000"))));
		SettlementResponse response = settlementService.confirm(room.getId(), new ManualRatesRequest(List.of()));
		return new ConfirmedSettlement(room, memberA, response.settlementId());
	}

	private record ConfirmedSettlement(SettlementRoom room, RoomMember memberA, Long settlementId) {
	}
}
