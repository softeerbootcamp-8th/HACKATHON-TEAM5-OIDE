package com.example.oide.global.util;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;

@DisplayName("정산방 만료 검증(RoomExpirationValidator) 테스트")
class RoomExpirationValidatorTest {

	@Test
	@DisplayName("생성된 지 7일 이내면 예외를 던지지 않는다")
	void passesWhenCreatedWithinSevenDays() {
		LocalDateTime createdAt = LocalDateTime.now().minusDays(6);

		assertThatCode(() -> RoomExpirationValidator.validateNotExpired(createdAt)).doesNotThrowAnyException();
	}

	@Test
	@DisplayName("생성된 지 7일이 지나면 ROOM_EXPIRED 예외를 던진다")
	void throwsRoomExpiredWhenOlderThanSevenDays() {
		LocalDateTime createdAt = LocalDateTime.now().minusDays(8);

		assertThatThrownBy(() -> RoomExpirationValidator.validateNotExpired(createdAt))
				.isInstanceOf(BusinessException.class)
				.extracting(exception -> ((BusinessException) exception).getErrorCode())
				.isEqualTo(ErrorCode.ROOM_EXPIRED);
	}
}
