package com.example.oide.payment.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.payment.repository.PaymentRepository;
import com.example.oide.payment.repository.PaymentShareRepository;
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
		when(paymentRepository.findById(paymentId)).thenReturn(Optional.empty());

		assertThrows(BusinessException.class, () -> service.saveEqual(roomId, paymentId));

		InOrder lockOrder = inOrder(roomRepository, paymentRepository);
		lockOrder.verify(roomRepository).findByIdForUpdate(roomId);
		lockOrder.verify(paymentRepository).findById(paymentId);
	}
}
