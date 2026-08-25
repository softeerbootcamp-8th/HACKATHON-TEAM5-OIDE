package com.example.oide.payment.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.payment.domain.Payment;
import com.example.oide.payment.repository.PaymentRepository;
import com.example.oide.room.service.RoomAccessService;
import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.repository.RoomMemberRepository;
import com.example.oide.room.domain.SettlementRoom;

import lombok.RequiredArgsConstructor;

/**
 * 결제 내역을 실제로 저장한다.
 *
 * <p>추출 결과는 사용자가 수정·선택한 뒤에야 여기로 들어온다. 그래서 이 서비스는 추출을 전혀 알지
 * 못하고, 스크린샷 등록과 직접 입력이 같은 경로를 쓴다.
 *
 * <p>분담({@code PaymentShare})은 만들지 않는다. 누가 얼마를 부담할지는 FR-03에서 정하며, 그때까지
 * {@code splitMethod}는 null로 남아 "분담 미설정 = 정산 대상 아님"을 뜻한다.
 */
@Service
@RequiredArgsConstructor
public class PaymentCommandService {

	private static final Pattern CURRENCY_CODE = Pattern.compile("[A-Z]{3}");

	private final PaymentRepository paymentRepository;
	private final RoomMemberRepository roomMemberRepository;
	private final RoomAccessService roomAccessService;

	@Transactional
	public List<Payment> register(Long roomId, List<PaymentRegistration> registrations) {
		if (registrations == null || registrations.isEmpty()) {
			throw new BusinessException(ErrorCode.NO_PAYMENT_TO_REGISTER);
		}
		SettlementRoom room = roomAccessService.getActiveRoom(roomId);
		Map<Long, RoomMember> members =
				roomMemberRepository.findAllByRoomIdOrderByDisplayOrder(room.getId()).stream()
						.collect(Collectors.toMap(RoomMember::getId, Function.identity()));

		List<Payment> payments =
				registrations.stream()
						.map(registration -> toPayment(room, members, registration))
						.toList();
		return paymentRepository.saveAll(payments);
	}

	@Transactional(readOnly = true)
	public List<Payment> findAll(Long roomId) {
		SettlementRoom room = roomAccessService.getActiveRoom(roomId);
		return paymentRepository.findAllByRoomIdOrderByPaidAtDescIdDesc(room.getId());
	}

	private Payment toPayment(
			SettlementRoom room, Map<Long, RoomMember> members, PaymentRegistration registration) {

		RoomMember payer = members.get(registration.payerMemberId());
		if (payer == null) {
			throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
		}
		BigDecimal amount = registration.amount();
		if (amount == null || amount.signum() <= 0) {
			throw new BusinessException(ErrorCode.INVALID_PAYMENT_AMOUNT);
		}
		String currency = registration.currency();
		if (currency == null || !CURRENCY_CODE.matcher(currency.toUpperCase()).matches()) {
			throw new BusinessException(ErrorCode.INVALID_CURRENCY);
		}
		String merchant = registration.merchant() == null ? null : registration.merchant().trim();

		return new Payment(
				room,
				payer,
				(merchant == null || merchant.isEmpty()) ? null : merchant,
				registration.paidAt(),
				amount,
				currency.toUpperCase(),
				null);
	}
}
