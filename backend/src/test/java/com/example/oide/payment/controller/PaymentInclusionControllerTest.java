package com.example.oide.payment.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
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
import com.example.oide.splitgroup.domain.SplitGroup;
import com.example.oide.splitgroup.domain.SplitGroupType;
import com.example.oide.splitgroup.repository.SplitGroupRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PaymentInclusionControllerTest {

	@Autowired
	private MockMvc mockMvc;

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

	@Test
	void excludesPaymentAndClearsPreviousSplit() throws Exception {
		SettlementRoom room = roomRepository.save(
				new SettlementRoom("inclusion-controller", "여행", SupportedCurrency.KRW));
		RoomMember member = roomMemberRepository.save(new RoomMember(room, "민서", 1));
		SplitGroup group = splitGroupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));
		Payment payment = paymentRepository.save(new Payment(
				room, member, "식사", LocalDateTime.now(), BigDecimal.valueOf(10_000),
				SupportedCurrency.KRW, SplitMethod.EQUAL, true));
		payment.assignGroup(group);
		paymentShareRepository.save(new PaymentShare(payment, member, BigDecimal.valueOf(10_000)));

		mockMvc.perform(patch("/api/rooms/{roomId}/payments/{paymentId}/inclusion", room.getId(), payment.getId())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"includedInSettlement\":false}"))
				.andExpect(status().isNoContent());

		Payment updated = paymentRepository.findById(payment.getId()).orElseThrow();
		assertThat(updated.isIncludedInSettlement()).isFalse();
		assertThat(updated.getSplitGroup()).isNull();
		assertThat(paymentShareRepository.findAllByPaymentId(payment.getId())).isEmpty();
		mockMvc.perform(get("/api/rooms/{roomId}/payments", room.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].includedInSettlement").value(false));
	}
}
