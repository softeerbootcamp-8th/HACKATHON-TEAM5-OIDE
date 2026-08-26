package com.example.oide.settlement.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.payment.repository.PaymentRepository;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.repository.SettlementRoomRepository;
import com.example.oide.settlement.dto.SettlementProgressResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SettlementProgressService {

	private final SettlementRoomRepository roomRepository;
	private final RoomMemberRepository roomMemberRepository;
	private final PaymentRepository paymentRepository;

	@Transactional(readOnly = true)
	public SettlementProgressResponse getProgress(Long roomId) {
		roomRepository.findById(roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
		List<RoomMember> members = roomMemberRepository.findAllByRoomIdOrderByDisplayOrder(roomId);
		Set<Long> payerIds = paymentRepository.findAllByRoomIdOrderByPaidAtDescIdDesc(roomId).stream()
				.map(payment -> payment.getPayer().getId())
				.collect(Collectors.toSet());
		List<SettlementProgressResponse.MemberProgressResponse> responses = members.stream()
				.map(member -> new SettlementProgressResponse.MemberProgressResponse(
						member.getId(),
						member.getNickname(),
						member.isSettlementCompleted(),
						payerIds.contains(member.getId())))
				.toList();
		return new SettlementProgressResponse(
				responses,
				responses.stream().allMatch(SettlementProgressResponse.MemberProgressResponse::completed),
				!payerIds.isEmpty());
	}

	@Transactional
	public void completeWithoutPayments(Long roomId, Long memberId) {
		roomRepository.findByIdForUpdate(roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
		RoomMember member = findMember(roomId, memberId);
		if (paymentRepository.existsByRoomIdAndPayerId(roomId, memberId)) {
			throw new BusinessException(ErrorCode.SETTLEMENT_SKIP_NOT_ALLOWED);
		}
		member.completeSettlement(LocalDateTime.now());
	}

	@Transactional
	public void complete(Long roomId, Long memberId, LocalDateTime completedAt) {
		findMember(roomId, memberId).completeSettlement(completedAt);
	}

	@Transactional
	public void uncomplete(Long roomId, Long memberId) {
		findMember(roomId, memberId).uncompleteSettlement();
	}

	private RoomMember findMember(Long roomId, Long memberId) {
		return roomMemberRepository.findByIdAndRoomId(memberId, roomId)
				.orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
	}
}
