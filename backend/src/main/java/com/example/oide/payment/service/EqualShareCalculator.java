package com.example.oide.payment.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.example.oide.room.domain.RoomMember;

@Component
public class EqualShareCalculator {

	// 금액을 균등분배하고 소수점 나머지는 결제자에게 배정한다.
	public Map<Long, BigDecimal> calculate(BigDecimal amount, List<RoomMember> members, Long payerMemberId) {
		BigDecimal divisor = BigDecimal.valueOf(members.size());
		BigDecimal baseAmount = amount.divide(divisor, amount.scale(), RoundingMode.DOWN);
		BigDecimal remainder = amount.subtract(baseAmount.multiply(divisor));
		Long remainderMemberId = members.stream()
				.filter(member -> member.getId().equals(payerMemberId))
				.map(RoomMember::getId)
				.findFirst()
				.orElse(members.getFirst().getId());
		Map<Long, BigDecimal> shares = new LinkedHashMap<>();
		for (RoomMember member : members) {
			shares.put(member.getId(), member.getId().equals(remainderMemberId)
					? baseAmount.add(remainder) : baseAmount);
		}
		return shares;
	}
}
