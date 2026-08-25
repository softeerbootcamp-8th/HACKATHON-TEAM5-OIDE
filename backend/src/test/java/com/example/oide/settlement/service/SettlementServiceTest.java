package com.example.oide.settlement.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.currency.SupportedCurrency;
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
import com.example.oide.settlement.dto.SettlementResponse;
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

	@Test
	void confirmsMixedCurrencySettlementWithBalancedTransfers() {
		SettlementRoom room = roomRepository.save(new SettlementRoom("code", "여행", SupportedCurrency.KRW));
		RoomMember memberA = roomMemberRepository.save(new RoomMember(room, "A", 1));
		RoomMember memberB = roomMemberRepository.save(new RoomMember(room, "B", 2));
		SplitGroup group = splitGroupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));

		Payment dinner = paymentRepository.save(new Payment(
				room, memberA, "저녁", LocalDateTime.now(), new BigDecimal("15"), SupportedCurrency.USD, SplitMethod.EQUAL));
		dinner.assignGroup(group);
		paymentShareRepository.saveAll(List.of(
				new PaymentShare(dinner, memberA, new BigDecimal("10")),
				new PaymentShare(dinner, memberB, new BigDecimal("5"))));

		Payment transport = paymentRepository.save(new Payment(
				room, memberB, "교통", LocalDateTime.now(), new BigDecimal("1000"), SupportedCurrency.JPY, SplitMethod.EQUAL));
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
}
