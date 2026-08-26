package com.example.oide.payment.service;

import java.time.LocalDateTime;

import com.example.oide.room.domain.SettlementRoom;

/**
 * 후처리에 필요한 정산방 정보만 복사한 스냅샷.
 *
 * <p>추출은 요청 스레드 밖에서 진행되므로 영속성 컨텍스트가 닫힌 엔티티를 들고 다니지 않는다.
 *
 * @param createdAt 화면에 연도가 없을 때 어느 연도로 볼지 판단하는 기준
 * @param defaultCurrency 통화를 확정하지 못했을 때 적용할 기본값
 */
public record RoomContext(Long roomId, LocalDateTime createdAt, String defaultCurrency) {

	public static RoomContext from(SettlementRoom room) {
		return new RoomContext(room.getId(), room.getCreatedAt(), room.getDefaultCurrency().name());
	}
}
