package com.example.oide.room.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.global.util.RoomExpirationValidator;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.room.repository.SettlementRoomRepository;

import lombok.RequiredArgsConstructor;

/**
 * roomId로 방을 찾고 아직 쓸 수 있는지 확인한다.
 *
 * <p>공유 링크로 들어오는 {@link RoomService}와 달리 결제·정산 API는 roomId로 방을 찾는다. "조회 +
 * 만료 확인"을 기능마다 각자 하면 반드시 어느 한쪽이 빠지므로 한곳에 둔다. 7일 만료 규칙 자체는
 * {@link RoomExpirationValidator}가 가진다.
 */
@Service
@RequiredArgsConstructor
public class RoomAccessService {

	private final SettlementRoomRepository settlementRoomRepository;

	@Transactional(readOnly = true)
	public SettlementRoom getActiveRoom(Long roomId) {
		SettlementRoom room =
				settlementRoomRepository
						.findById(roomId)
						.orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
		RoomExpirationValidator.validateNotExpired(room.getCreatedAt());
		return room;
	}
}
