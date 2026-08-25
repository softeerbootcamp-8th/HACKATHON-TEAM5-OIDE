package com.example.oide.global.util;

import java.time.LocalDateTime;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;

/**
 * 정산방(SettlementRoom)의 7일 만료 규칙을 검사하는 유틸리티.
 * room 도메인과 payment 도메인(#17) 양쪽에서 동일한 만료 규칙을 써야 하므로 global에 둔다.
 */
public final class RoomExpirationValidator {

	private static final int EXPIRATION_DAYS = 7;

	private RoomExpirationValidator() {
	}

	/**
	 * 방 생성 시각(createdAt) 기준으로 7일이 지났는지 확인하고, 지났다면 ROOM_EXPIRED 예외를 던진다.
	 * 만료 여부는 별도 컬럼 없이 매 호출 시 createdAt + 7일과 현재 시각을 비교해 계산한다.
	 */
	public static void validateNotExpired(LocalDateTime createdAt) {
		LocalDateTime expiresAt = createdAt.plusDays(EXPIRATION_DAYS);
		if (expiresAt.isBefore(LocalDateTime.now())) {
			throw new BusinessException(ErrorCode.ROOM_EXPIRED);
		}
	}
}
