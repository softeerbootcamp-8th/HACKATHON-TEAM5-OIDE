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
import com.example.oide.payment.service.PaymentCommandService;
import com.example.oide.payment.service.PaymentRegistration;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;

@SpringBootTest
@Transactional
class SettlementProgressServiceTest {

	@Autowired private SettlementProgressService settlementProgressService;
	@Autowired private PaymentCommandService paymentCommandService;
	@Autowired private SettlementRoomRepository roomRepository;
	@Autowired private RoomMemberRepository roomMemberRepository;

	@Test
	void completesMemberWithoutPaymentsBeforeSettlementExists() {
		TestRoom testRoom = createRoom("skip-code");

		settlementProgressService.completeWithoutPayments(
				testRoom.room().getId(), testRoom.firstMember().getId());

		var progress = settlementProgressService.getProgress(testRoom.room().getId());
		assertThat(progress.members())
				.extracting(member -> member.nickname() + ":" + member.completed() + ":" + member.hasPayments())
				.containsExactly("A:true:false", "B:false:false");
		assertThat(progress.allCompleted()).isFalse();
		assertThat(progress.hasAnyPayments()).isFalse();
	}

	@Test
	void rejectsSkipWhenMemberAlreadyRegisteredPayment() {
		TestRoom testRoom = createRoom("skip-rejected-code");
		registerPayment(testRoom);

		assertThatThrownBy(() -> settlementProgressService.completeWithoutPayments(
				testRoom.room().getId(), testRoom.firstMember().getId()))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.SETTLEMENT_SKIP_NOT_ALLOWED);
	}

	@Test
	void registeringPaymentCancelsPreviousSkipCompletion() {
		TestRoom testRoom = createRoom("skip-cancelled-code");
		settlementProgressService.completeWithoutPayments(
				testRoom.room().getId(), testRoom.firstMember().getId());

		registerPayment(testRoom);

		var firstMember = settlementProgressService.getProgress(testRoom.room().getId()).members().getFirst();
		assertThat(firstMember.completed()).isFalse();
		assertThat(firstMember.hasPayments()).isTrue();
	}

	private void registerPayment(TestRoom testRoom) {
		paymentCommandService.register(testRoom.room().getId(), List.of(new PaymentRegistration(
				testRoom.firstMember().getId(),
				"식사",
				LocalDateTime.now(),
				new BigDecimal("30000"),
				"KRW",
				true)));
	}

	private TestRoom createRoom(String shareCode) {
		SettlementRoom room = roomRepository.save(
				new SettlementRoom(shareCode, "여행", SupportedCurrency.KRW));
		RoomMember firstMember = roomMemberRepository.save(new RoomMember(room, "A", 1));
		roomMemberRepository.save(new RoomMember(room, "B", 2));
		return new TestRoom(room, firstMember);
	}

	private record TestRoom(SettlementRoom room, RoomMember firstMember) {
	}
}
