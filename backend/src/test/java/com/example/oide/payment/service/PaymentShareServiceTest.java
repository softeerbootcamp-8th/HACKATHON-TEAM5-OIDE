package com.example.oide.payment.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.payment.domain.Payment;
import com.example.oide.payment.repository.PaymentRepository;
import com.example.oide.payment.repository.PaymentShareRepository;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;
import com.example.oide.splitgroup.repository.SplitGroupMemberRepository;

class PaymentShareServiceTest {

	@Test
	void locksRoomBeforeUpdatingPaymentShares() {
		PaymentRepository paymentRepository = mock(PaymentRepository.class);
		PaymentShareRepository paymentShareRepository = mock(PaymentShareRepository.class);
		RoomMemberRepository roomMemberRepository = mock(RoomMemberRepository.class);
		SettlementRoomRepository roomRepository = mock(SettlementRoomRepository.class);
		SplitGroupMemberRepository groupMemberRepository = mock(SplitGroupMemberRepository.class);
		EqualShareCalculator equalShareCalculator = mock(EqualShareCalculator.class);
		PaymentShareService service = new PaymentShareService(
				paymentRepository,
				paymentShareRepository,
				roomMemberRepository,
				roomRepository,
				groupMemberRepository,
				equalShareCalculator);

		Long roomId = 1L;
		Long paymentId = 2L;
		when(roomRepository.findByIdForUpdate(roomId)).thenReturn(Optional.of(mock(SettlementRoom.class)));
		when(paymentRepository.findByRoomIdAndIdForUpdate(roomId, paymentId)).thenReturn(Optional.empty());

		assertThrows(BusinessException.class, () -> service.saveEqual(roomId, paymentId, 3L));

		InOrder lockOrder = inOrder(roomRepository, paymentRepository);
		lockOrder.verify(roomRepository).findByIdForUpdate(roomId);
		lockOrder.verify(paymentRepository).findByRoomIdAndIdForUpdate(roomId, paymentId);
	}

	@Test
	void rejectsShareUpdateByMemberWhoDidNotRegisterPayment() {
		PaymentRepository paymentRepository = mock(PaymentRepository.class);
		PaymentShareRepository paymentShareRepository = mock(PaymentShareRepository.class);
		RoomMemberRepository roomMemberRepository = mock(RoomMemberRepository.class);
		SettlementRoomRepository roomRepository = mock(SettlementRoomRepository.class);
		SplitGroupMemberRepository groupMemberRepository = mock(SplitGroupMemberRepository.class);
		EqualShareCalculator equalShareCalculator = mock(EqualShareCalculator.class);
		PaymentShareService service = new PaymentShareService(
				paymentRepository,
				paymentShareRepository,
				roomMemberRepository,
				roomRepository,
				groupMemberRepository,
				equalShareCalculator);
		Payment payment = mock(Payment.class);
		RoomMember payer = mock(RoomMember.class);

		when(roomRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mock(SettlementRoom.class)));
		when(paymentRepository.findByRoomIdAndIdForUpdate(1L, 2L)).thenReturn(Optional.of(payment));
		when(payment.getPayer()).thenReturn(payer);
		when(payer.getId()).thenReturn(3L);

		BusinessException exception = assertThrows(
				BusinessException.class,
				() -> service.saveEqual(1L, 2L, 4L));

		assertEquals(ErrorCode.PAYMENT_NOT_OWNER, exception.getErrorCode());
	}
}
