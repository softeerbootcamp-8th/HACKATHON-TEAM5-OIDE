package com.example.oide.payment.service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.payment.domain.Payment;
import com.example.oide.payment.domain.PaymentShare;
import com.example.oide.payment.domain.SplitMethod;
import com.example.oide.payment.dto.CustomShareRequest;
import com.example.oide.payment.dto.PaymentShareResponse;
import com.example.oide.payment.repository.PaymentRepository;
import com.example.oide.payment.repository.PaymentShareRepository;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;
import com.example.oide.splitgroup.domain.SplitGroup;
import com.example.oide.splitgroup.domain.SplitGroupMember;
import com.example.oide.splitgroup.repository.SplitGroupMemberRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentShareService {

	private final PaymentRepository paymentRepository;
	private final PaymentShareRepository paymentShareRepository;
	private final RoomMemberRepository roomMemberRepository;
	private final SettlementRoomRepository roomRepository;
	private final SplitGroupMemberRepository groupMemberRepository;
	private final EqualShareCalculator equalShareCalculator;

	@Transactional
	public PaymentShareResponse saveEqual(Long roomId, Long paymentId) {
		lockRoom(roomId);
		Payment payment = findPayment(roomId, paymentId);
		List<RoomMember> members = findGroupMembers(requireGroup(payment));
		Map<Long, BigDecimal> shares = equalShareCalculator.calculate(payment.getAmount(), members, payment.getPayer().getId());
		replaceShares(payment, members, shares);
		payment.changeSplitMethod(SplitMethod.EQUAL);
		return toResponse(payment, members, shares);
	}

	@Transactional
	public PaymentShareResponse saveCustom(Long roomId, Long paymentId, CustomShareRequest request) {
		lockRoom(roomId);
		Payment payment = findPayment(roomId, paymentId);
		List<RoomMember> members = findGroupMembers(requireGroup(payment));
		Map<Long, BigDecimal> shares = validateCustomShares(payment, members, request);
		replaceShares(payment, members, shares);
		payment.changeSplitMethod(SplitMethod.CUSTOM);
		return toResponse(payment, members, shares);
	}

	@Transactional(readOnly = true)
	public PaymentShareResponse getShares(Long roomId, Long paymentId) {
		Payment payment = findPayment(roomId, paymentId);
		List<RoomMember> members = findGroupMembers(requireGroup(payment));
		Map<Long, BigDecimal> shares = paymentShareRepository.findAllByPaymentId(paymentId).stream()
				.collect(Collectors.toMap(share -> share.getMember().getId(), PaymentShare::getShareAmount));
		return toResponse(payment, members, shares);
	}

	@Transactional
	public void adjustGroupPayments(SplitGroup group) {
		lockRoom(group.getRoom().getId());
		List<RoomMember> members = findGroupMembers(group);
		for (Payment payment : paymentRepository.findAllByRoomIdAndSplitGroupId(group.getRoom().getId(), group.getId())) {
			if (payment.getSplitMethod() == SplitMethod.EQUAL) {
				replaceShares(payment, members, equalShareCalculator.calculate(payment.getAmount(), members, payment.getPayer().getId()));
			} else if (payment.getSplitMethod() == SplitMethod.CUSTOM) {
				paymentShareRepository.deleteAllByPaymentId(payment.getId());
				payment.clearSplitMethod();
			}
		}
	}

	private Map<Long, BigDecimal> validateCustomShares(Payment payment, List<RoomMember> members, CustomShareRequest request) {
		Set<Long> memberIds = members.stream().map(RoomMember::getId).collect(Collectors.toSet());
		Map<Long, BigDecimal> shares = new HashMap<>();
		for (CustomShareRequest.ShareAmountRequest share : request.shares()) {
			if (!memberIds.contains(share.memberId()) || shares.put(share.memberId(), share.amount()) != null) throw new BusinessException(ErrorCode.INVALID_SHARE_MEMBERS);
			if (share.amount().signum() < 0) throw new BusinessException(ErrorCode.INVALID_SHARE_AMOUNT);
		}
		if (!shares.keySet().equals(memberIds)) throw new BusinessException(ErrorCode.INVALID_SHARE_MEMBERS);
		BigDecimal total = shares.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
		if (total.compareTo(payment.getAmount()) != 0) throw new BusinessException(ErrorCode.UNBALANCED_PAYMENT_SHARE);
		return shares;
	}

	private void replaceShares(Payment payment, List<RoomMember> members, Map<Long, BigDecimal> shares) {
		paymentShareRepository.deleteAllByPaymentId(payment.getId());
		paymentShareRepository.saveAll(members.stream().map(member -> new PaymentShare(payment, member, shares.getOrDefault(member.getId(), BigDecimal.ZERO))).toList());
	}

	private Payment findPayment(Long roomId, Long paymentId) {
		Payment payment = paymentRepository.findById(paymentId).orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));
		if (!payment.getRoom().getId().equals(roomId)) throw new BusinessException(ErrorCode.PAYMENT_NOT_FOUND);
		return payment;
	}

	private void lockRoom(Long roomId) {
		roomRepository.findByIdForUpdate(roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
	}

	private SplitGroup requireGroup(Payment payment) {
		if (payment.getSplitGroup() == null) throw new BusinessException(ErrorCode.PAYMENT_GROUP_REQUIRED);
		return payment.getSplitGroup();
	}

	private List<RoomMember> findGroupMembers(SplitGroup group) {
		if (group.isAll()) return roomMemberRepository.findAllByRoomIdOrderByDisplayOrder(group.getRoom().getId());
		return groupMemberRepository.findAllByGroupIdOrderByDisplayOrderAsc(group.getId()).stream().map(SplitGroupMember::getMember).toList();
	}

	private PaymentShareResponse toResponse(Payment payment, List<RoomMember> members, Map<Long, BigDecimal> shares) {
		BigDecimal allocated = members.stream().map(member -> shares.getOrDefault(member.getId(), BigDecimal.ZERO)).reduce(BigDecimal.ZERO, BigDecimal::add);
		return new PaymentShareResponse(payment.getId(), payment.getAmount(), payment.getCurrency(), payment.getSplitMethod(), allocated,
				payment.getAmount().subtract(allocated), allocated.compareTo(payment.getAmount()) == 0,
				members.stream().map(member -> new PaymentShareResponse.MemberShareResponse(member.getId(), member.getNickname(), shares.getOrDefault(member.getId(), BigDecimal.ZERO))).toList());
	}
}
