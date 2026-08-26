package com.example.oide.splitgroup.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Propagation;
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
import com.example.oide.splitgroup.domain.SplitGroup;
import com.example.oide.splitgroup.domain.SplitGroupType;
import com.example.oide.splitgroup.dto.CreateSplitGroupRequest;
import com.example.oide.splitgroup.dto.SplitGroupResponse;
import com.example.oide.splitgroup.dto.UpdateSplitGroupRequest;
import com.example.oide.splitgroup.repository.SplitGroupRepository;

@SpringBootTest
@Transactional
class SplitGroupServiceTest {

	@Autowired
	private SplitGroupService splitGroupService;

	@Autowired
	private SettlementRoomRepository roomRepository;

	@Autowired
	private RoomMemberRepository roomMemberRepository;

	@Autowired
	private SplitGroupRepository groupRepository;

	@Autowired
	private PaymentRepository paymentRepository;

	@Autowired
	private PaymentShareRepository paymentShareRepository;

	private SettlementRoom room;
	private RoomMember firstMember;
	private RoomMember secondMember;
	private RoomMember thirdMember;
	private SplitGroup allGroup;

	@BeforeEach
	void setUp() {
		String shareCode = UUID.randomUUID().toString().substring(0, 6);
		room = roomRepository.save(new SettlementRoom(shareCode, "테스트 방", SupportedCurrency.KRW));
		firstMember = roomMemberRepository.save(new RoomMember(room, "첫째", 1));
		secondMember = roomMemberRepository.save(new RoomMember(room, "둘째", 2));
		thirdMember = roomMemberRepository.save(new RoomMember(room, "셋째", 3));
		allGroup = groupRepository.save(new SplitGroup(room, "전체", SplitGroupType.ALL));
	}

	@Test
	void createsCustomGroupWithMembersInDisplayOrder() {
		SplitGroupResponse response = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("식사", List.of(thirdMember.getId(), firstMember.getId())));

		assertEquals("식사", response.name());
		assertEquals(SplitGroupType.CUSTOM, response.type());
		assertEquals(thirdMember.getId(), response.creatorMemberId());
		assertEquals(List.of(firstMember.getId(), thirdMember.getId()),
				response.members().stream().map(SplitGroupResponse.MemberResponse::id).toList());
	}

	@Test
	void listsAllGroupWithoutCreatingAnotherGroup() {
		List<SplitGroupResponse> firstResponse = splitGroupService.findAll(room.getId());
		List<SplitGroupResponse> secondResponse = splitGroupService.findAll(room.getId());

		assertEquals(1, firstResponse.size());
		assertEquals(1, secondResponse.size());
		assertEquals(SplitGroupType.ALL, firstResponse.getFirst().type());
		assertEquals(3, firstResponse.getFirst().members().size());
		assertEquals(1, groupRepository.findAllByRoomIdOrderByTypeAscIdAsc(room.getId()).size());
	}

	@Test
	void updatesAndDeletesCustomGroup() {
		SplitGroupResponse created = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("식사", List.of(firstMember.getId(), secondMember.getId())));

		SplitGroupResponse updated = splitGroupService.update(
				room.getId(),
				created.id(),
				created.creatorMemberId(),
				new UpdateSplitGroupRequest("교통", List.of(secondMember.getId(), thirdMember.getId())));
		splitGroupService.delete(room.getId(), created.id(), created.creatorMemberId());

		assertEquals("교통", updated.name());
		assertEquals(List.of(secondMember.getId(), thirdMember.getId()),
				updated.members().stream().map(SplitGroupResponse.MemberResponse::id).toList());
		assertTrue(groupRepository.findById(created.id()).isEmpty());
	}

	@Test
	void resetsCustomSharesWhenGroupMembersChange() {
		SplitGroupResponse group = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("식사", List.of(firstMember.getId(), secondMember.getId())));
		Payment payment = paymentRepository.save(new Payment(
				room,
				firstMember,
				"저녁",
				LocalDateTime.now(),
				new BigDecimal("10000"),
				SupportedCurrency.KRW,
				SplitMethod.CUSTOM,
				true));
		payment.assignGroup(groupRepository.findById(group.id()).orElseThrow());
		paymentShareRepository.saveAll(List.of(
				new PaymentShare(payment, firstMember, new BigDecimal("7000")),
				new PaymentShare(payment, secondMember, new BigDecimal("3000"))));
		splitGroupService.update(
				room.getId(),
				group.id(),
				group.creatorMemberId(),
				new UpdateSplitGroupRequest("저녁", List.of(firstMember.getId(), secondMember.getId())));

		assertEquals(SplitMethod.CUSTOM, payment.getSplitMethod());
		assertEquals(2, paymentShareRepository.findAllByPaymentId(payment.getId()).size());

		splitGroupService.update(
				room.getId(),
				group.id(),
				group.creatorMemberId(),
				new UpdateSplitGroupRequest("식사", List.of(firstMember.getId(), thirdMember.getId())));

		assertEquals(SplitMethod.EQUAL, payment.getSplitMethod());
		assertEquals(0, paymentShareRepository.findAllByPaymentId(payment.getId()).stream()
				.map(PaymentShare::getShareAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add)
				.compareTo(payment.getAmount()));
	}

	@Test
	void rejectsAllGroupUpdate() {
		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.update(
				room.getId(),
				allGroup.getId(),
				firstMember.getId(),
				new UpdateSplitGroupRequest("변경", List.of(firstMember.getId(), secondMember.getId()))));

		assertEquals(ErrorCode.ALL_GROUP_IMMUTABLE, exception.getErrorCode());
	}

	@Test
	void rejectsCustomGroupContainingEveryRoomMember() {
		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest(
						"또 다른 전체",
						List.of(firstMember.getId(), secondMember.getId(), thirdMember.getId()))));

		assertEquals(ErrorCode.DUPLICATE_GROUP_MEMBERS, exception.getErrorCode());
	}

	@Test
	void rejectsCustomGroupWithSameMemberSetInDifferentOrder() {
		splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest(
						"식사", List.of(firstMember.getId(), secondMember.getId()), firstMember.getId()));

		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest(
						"교통", List.of(secondMember.getId(), firstMember.getId()), firstMember.getId())));

		assertEquals(ErrorCode.DUPLICATE_GROUP_MEMBERS, exception.getErrorCode());
	}

	@Test
	void allowsPartiallyOverlappingGroups() {
		splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("식사", List.of(firstMember.getId(), secondMember.getId())));

		SplitGroupResponse response = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("교통", List.of(secondMember.getId(), thirdMember.getId())));

		assertEquals(List.of(secondMember.getId(), thirdMember.getId()),
				response.members().stream().map(SplitGroupResponse.MemberResponse::id).toList());
	}

	@Test
	void allowsDifferentCreatorsToUseSameMemberSet() {
		splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest(
						"첫째 그룹", List.of(firstMember.getId(), secondMember.getId()), firstMember.getId()));

		SplitGroupResponse response = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest(
						"둘째 그룹", List.of(firstMember.getId(), secondMember.getId()), secondMember.getId()));

		assertEquals(secondMember.getId(), response.creatorMemberId());
	}

	@Test
	void rejectsUpdateToAnotherGroupsMemberSet() {
		splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest(
						"식사", List.of(firstMember.getId(), secondMember.getId()), firstMember.getId()));
		SplitGroupResponse group = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest(
						"교통", List.of(secondMember.getId(), thirdMember.getId()), firstMember.getId()));

		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.update(
				room.getId(),
				group.id(),
				group.creatorMemberId(),
				new UpdateSplitGroupRequest("중복", List.of(secondMember.getId(), firstMember.getId()))));

		assertEquals(ErrorCode.DUPLICATE_GROUP_MEMBERS, exception.getErrorCode());
	}

	@Test
	void rejectsUpdateContainingEveryRoomMember() {
		SplitGroupResponse group = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("식사", List.of(firstMember.getId(), secondMember.getId())));

		BusinessException exception = assertThrows(BusinessException.class, () -> splitGroupService.update(
				room.getId(),
				group.id(),
				group.creatorMemberId(),
				new UpdateSplitGroupRequest(
						"전체",
						List.of(firstMember.getId(), secondMember.getId(), thirdMember.getId()))));

		assertEquals(ErrorCode.DUPLICATE_GROUP_MEMBERS, exception.getErrorCode());
	}

	@Test
	void allowsUpdateKeepingItsOwnMemberSet() {
		SplitGroupResponse group = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest("식사", List.of(firstMember.getId(), secondMember.getId())));

		SplitGroupResponse response = splitGroupService.update(
				room.getId(),
				group.id(),
				group.creatorMemberId(),
				new UpdateSplitGroupRequest("저녁", List.of(secondMember.getId(), firstMember.getId())));

		assertEquals("저녁", response.name());
		assertEquals(List.of(firstMember.getId(), secondMember.getId()),
				response.members().stream().map(SplitGroupResponse.MemberResponse::id).toList());
	}

	@Test
	void rejectsUpdateAndDeleteByAnotherMember() {
		SplitGroupResponse group = splitGroupService.create(
				room.getId(),
				new CreateSplitGroupRequest(
						"식사", List.of(firstMember.getId(), secondMember.getId()), firstMember.getId()));

		BusinessException updateException = assertThrows(BusinessException.class, () -> splitGroupService.update(
				room.getId(),
				group.id(),
				secondMember.getId(),
				new UpdateSplitGroupRequest("변경", List.of(firstMember.getId(), secondMember.getId()))));
		BusinessException deleteException = assertThrows(BusinessException.class, () -> splitGroupService.delete(
				room.getId(), group.id(), secondMember.getId()));

		assertEquals(ErrorCode.GROUP_NOT_OWNER, updateException.getErrorCode());
		assertEquals(ErrorCode.GROUP_NOT_OWNER, deleteException.getErrorCode());
		assertTrue(groupRepository.findById(group.id()).isPresent());
	}

	@Test
	@Transactional(propagation = Propagation.NOT_SUPPORTED)
	void allowsOnlyOneConcurrentCreationForSameMemberSet() throws Exception {
		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService executor = Executors.newFixedThreadPool(2);

		try {
			List<Future<ErrorCode>> results = List.of(
					executor.submit(() -> createGroupConcurrently("식사", ready, start)),
					executor.submit(() -> createGroupConcurrently("교통", ready, start)));
			ready.await();
			start.countDown();

			List<ErrorCode> errorCodes = results.stream().map(this::getResult).toList();
			assertEquals(1, errorCodes.stream().filter(errorCode -> errorCode == null).count());
			assertEquals(1, errorCodes.stream()
					.filter(ErrorCode.DUPLICATE_GROUP_MEMBERS::equals)
					.count());
		} finally {
			executor.shutdownNow();
		}
	}

	private ErrorCode createGroupConcurrently(String name, CountDownLatch ready, CountDownLatch start)
			throws InterruptedException {
		ready.countDown();
		start.await();
		try {
			splitGroupService.create(
					room.getId(),
					new CreateSplitGroupRequest(name, List.of(firstMember.getId(), secondMember.getId())));
			return null;
		} catch (BusinessException exception) {
			return exception.getErrorCode();
		}
	}

	private ErrorCode getResult(Future<ErrorCode> result) {
		try {
			return result.get();
		} catch (Exception exception) {
			throw new RuntimeException(exception);
		}
	}
}
