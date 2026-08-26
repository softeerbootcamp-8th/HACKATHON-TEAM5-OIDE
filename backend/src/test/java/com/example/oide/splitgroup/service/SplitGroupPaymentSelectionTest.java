package com.example.oide.splitgroup.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.currency.SupportedCurrency;
import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.payment.domain.Payment;
import com.example.oide.payment.domain.SplitMethod;
import com.example.oide.payment.dto.CustomShareRequest;
import com.example.oide.payment.repository.PaymentRepository;
import com.example.oide.payment.repository.PaymentShareRepository;
import com.example.oide.payment.service.PaymentShareService;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;
import com.example.oide.splitgroup.domain.SplitGroup;
import com.example.oide.splitgroup.domain.SplitGroupType;
import com.example.oide.splitgroup.dto.GroupPaymentResponse;
import com.example.oide.splitgroup.dto.GroupPaymentSelectionStatus;
import com.example.oide.splitgroup.dto.SplitGroupDetailResponse;
import com.example.oide.splitgroup.dto.SplitGroupResponse;
import com.example.oide.splitgroup.dto.UpdateGroupPaymentsRequest;
import com.example.oide.splitgroup.dto.CreateSplitGroupRequest;
import com.example.oide.splitgroup.dto.UpdateSplitGroupRequest;
import com.example.oide.splitgroup.repository.SplitGroupRepository;

@SpringBootTest
@Transactional
class SplitGroupPaymentSelectionTest {

	@Autowired
	private SplitGroupService splitGroupService;

	@Autowired
	private SettlementRoomRepository roomRepository;

	@Autowired
	private RoomMemberRepository roomMemberRepository;

	@Autowired
	private PaymentRepository paymentRepository;

	@Autowired
	private PaymentShareRepository paymentShareRepository;

	@Autowired
	private PaymentShareService paymentShareService;

	@Autowired
	private SplitGroupRepository groupRepository;

	private SettlementRoom room;
	private RoomMember firstMember;
	private RoomMember secondMember;
	private RoomMember thirdMember;
	private SplitGroup allGroup;

	@BeforeEach
	void setUp() {
		room = roomRepository.save(new SettlementRoom("payment-test", "결제 선택 방", SupportedCurrency.KRW));
		firstMember = roomMemberRepository.save(new RoomMember(room, "첫째", 1));
		secondMember = roomMemberRepository.save(new RoomMember(room, "둘째", 2));
		thirdMember = roomMemberRepository.save(new RoomMember(room, "셋째", 3));
		allGroup = groupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));
	}

	@Test
	void returnsSelectedAvailableAndLockedPaymentsForGroupDetail() {
		SplitGroupResponse firstGroup = createGroup("식사", firstMember, secondMember);
		SplitGroupResponse secondGroup = createGroup("교통", secondMember, thirdMember);
		Payment selectedPayment = createPayment("식당", 1);
		Payment lockedPayment = createPayment("택시", 2, secondMember);
		Payment availablePayment = createPayment("카페", 3);

		splitGroupService.updatePayments(
				room.getId(), firstGroup.id(), new UpdateGroupPaymentsRequest(firstMember.getId(), List.of(selectedPayment.getId())));
		splitGroupService.updatePayments(
				room.getId(), secondGroup.id(), new UpdateGroupPaymentsRequest(secondMember.getId(), List.of(lockedPayment.getId())));

		SplitGroupDetailResponse detail = splitGroupService.findDetail(room.getId(), firstGroup.id());
		Map<Long, GroupPaymentSelectionStatus> statuses = detail.payments().stream()
				.collect(Collectors.toMap(GroupPaymentResponse::id, GroupPaymentResponse::selectionStatus));

		assertEquals(GroupPaymentSelectionStatus.SELECTED, statuses.get(selectedPayment.getId()));
		assertEquals(GroupPaymentSelectionStatus.LOCKED, statuses.get(lockedPayment.getId()));
		assertEquals(GroupPaymentSelectionStatus.AVAILABLE, statuses.get(availablePayment.getId()));
	}

	@Test
	void rejectsPaymentAlreadySelectedByAnotherGroup() {
		SplitGroupResponse firstGroup = createGroupBy("식사", secondMember, firstMember, secondMember);
		SplitGroupResponse secondGroup = createGroupBy("교통", secondMember, secondMember, thirdMember);
		Payment payment = createPayment("식당", 1, secondMember);
		splitGroupService.updatePayments(
				room.getId(), firstGroup.id(), new UpdateGroupPaymentsRequest(secondMember.getId(), List.of(payment.getId())));

		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.updatePayments(
				room.getId(), secondGroup.id(), new UpdateGroupPaymentsRequest(secondMember.getId(), List.of(payment.getId()))));

		assertEquals(ErrorCode.PAYMENT_ALREADY_ASSIGNED, exception.getErrorCode());
	}

	@Test
	void rejectsPaymentRegisteredByAnotherMember() {
		SplitGroupResponse group = createGroup("식사", firstMember, secondMember);
		Payment payment = createPayment("식당", 1, secondMember);

		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.updatePayments(
				room.getId(), group.id(), new UpdateGroupPaymentsRequest(firstMember.getId(), List.of(payment.getId()))));

		assertEquals(ErrorCode.INVALID_PAYMENT_SELECTION, exception.getErrorCode());
	}

	@Test
	void allowsPayerToAssignPaymentToGroupTheyAreNotIn() {
		SplitGroupResponse group = createGroupBy("식사", firstMember, secondMember, thirdMember);
		Payment payment = createPayment("식당", 1, firstMember);

		splitGroupService.updatePayments(
				room.getId(), group.id(), new UpdateGroupPaymentsRequest(firstMember.getId(), List.of(payment.getId())));

		assertEquals(group.id(), payment.getSplitGroup().getId());
		assertEquals(SplitMethod.EQUAL, payment.getSplitMethod());
		assertEquals(
				List.of(secondMember.getId(), thirdMember.getId()),
				paymentShareRepository.findAllByPaymentId(payment.getId()).stream()
						.map(share -> share.getMember().getId())
						.sorted()
						.toList());
	}

	@Test
	void rejectsAssigningPaymentToAnotherMembersGroup() {
		SplitGroupResponse group = createGroupBy("식사", secondMember, secondMember, thirdMember);
		Payment payment = createPayment("식당", 1, firstMember);

		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.updatePayments(
				room.getId(), group.id(), new UpdateGroupPaymentsRequest(firstMember.getId(), List.of(payment.getId()))));

		assertEquals(ErrorCode.INVALID_PAYMENT_SELECTION, exception.getErrorCode());
	}

	@Test
	void keepsOtherMembersPaymentsWhenSelectionIsReplaced() {
		Payment firstPayment = createPayment("식당", 1, firstMember);
		Payment secondPayment = createPayment("택시", 2, secondMember);
		splitGroupService.updatePayments(
				room.getId(),
				allGroup.getId(),
				new UpdateGroupPaymentsRequest(firstMember.getId(), List.of(firstPayment.getId())));
		splitGroupService.updatePayments(
				room.getId(),
				allGroup.getId(),
				new UpdateGroupPaymentsRequest(secondMember.getId(), List.of(secondPayment.getId())));

		splitGroupService.updatePayments(
				room.getId(),
				allGroup.getId(),
				new UpdateGroupPaymentsRequest(firstMember.getId(), List.of()));

		assertNull(firstPayment.getSplitGroup());
		assertEquals(allGroup.getId(), secondPayment.getSplitGroup().getId());
	}

	@Test
	void excludesPaymentsNotIncludedInSettlementFromGroupDetail() {
		SplitGroupResponse group = createGroup("식사", firstMember, secondMember);
		Payment includedPayment = createPayment("식당", 1);
		Payment excludedPayment = createPayment("기념품", 2);
		excludedPayment.changeInclusion(false);

		SplitGroupDetailResponse detail = splitGroupService.findDetail(room.getId(), group.id());

		List<Long> paymentIds = detail.payments().stream().map(GroupPaymentResponse::id).toList();
		assertTrue(paymentIds.contains(includedPayment.getId()));
		assertFalse(paymentIds.contains(excludedPayment.getId()));
	}

	@Test
	void clearsGroupAndPaymentSharesWhenPaymentIsDeselected() {
		SplitGroupResponse group = createGroup("식사", firstMember, secondMember);
		Payment payment = createPayment("식당", 1);
		splitGroupService.updatePayments(
				room.getId(), group.id(), new UpdateGroupPaymentsRequest(firstMember.getId(), List.of(payment.getId())));

		splitGroupService.updatePayments(
				room.getId(), group.id(), new UpdateGroupPaymentsRequest(firstMember.getId(), List.of()));

		assertNull(payment.getSplitGroup());
		assertNull(payment.getSplitMethod());
		assertTrue(paymentShareRepository.findAll().isEmpty());
	}

	@Test
	void initializesEqualSharesWhenPaymentIsAssignedToGroup() {
		SplitGroupResponse group = createGroup("식사", firstMember, secondMember);
		Payment payment = createPayment("식당", 1);

		splitGroupService.updatePayments(
				room.getId(), group.id(), new UpdateGroupPaymentsRequest(firstMember.getId(), List.of(payment.getId())));

		assertEquals(SplitMethod.EQUAL, payment.getSplitMethod());
		assertEquals(2, paymentShareRepository.findAllByPaymentId(payment.getId()).size());
		BigDecimal total = paymentShareRepository.findAllByPaymentId(payment.getId()).stream()
				.map(share -> share.getShareAmount())
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		assertEquals(0, payment.getAmount().compareTo(total));
	}

	@Test
	void resetsUnbalancedCustomSharesWhenGroupMembersChange() {
		SplitGroupResponse group = createGroup("식사", firstMember, secondMember);
		Payment payment = createPayment("식당", 1);
		splitGroupService.updatePayments(
				room.getId(), group.id(), new UpdateGroupPaymentsRequest(firstMember.getId(), List.of(payment.getId())));
		paymentShareService.saveCustom(room.getId(), payment.getId(), firstMember.getId(), new CustomShareRequest(List.of(
				new CustomShareRequest.ShareAmountRequest(firstMember.getId(), BigDecimal.valueOf(8_000)),
				new CustomShareRequest.ShareAmountRequest(secondMember.getId(), BigDecimal.valueOf(2_000)))));

		splitGroupService.update(room.getId(), group.id(), group.creatorMemberId(), new UpdateSplitGroupRequest(
				"식사", List.of(firstMember.getId(), thirdMember.getId())));

		assertEquals(SplitMethod.EQUAL, payment.getSplitMethod());
		BigDecimal total = paymentShareRepository.findAllByPaymentId(payment.getId()).stream()
				.map(share -> share.getShareAmount())
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		assertEquals(0, payment.getAmount().compareTo(total));
	}

	private SplitGroupResponse createGroup(String name, RoomMember first, RoomMember second) {
		return createGroupBy(name, first, first, second);
	}

	private SplitGroupResponse createGroupBy(
			String name, RoomMember creator, RoomMember first, RoomMember second) {
		return splitGroupService.create(
				room.getId(), new CreateSplitGroupRequest(
						name, List.of(first.getId(), second.getId()), creator.getId()));
	}

	private Payment createPayment(String merchant, int day) {
		return createPayment(merchant, day, firstMember);
	}

	private Payment createPayment(String merchant, int day, RoomMember payer) {
		return paymentRepository.save(new Payment(
				room,
				payer,
				merchant,
				LocalDateTime.of(2026, 8, day, 12, 0),
				BigDecimal.valueOf(10_000),
				SupportedCurrency.KRW,
				null,
				true));
	}
}
