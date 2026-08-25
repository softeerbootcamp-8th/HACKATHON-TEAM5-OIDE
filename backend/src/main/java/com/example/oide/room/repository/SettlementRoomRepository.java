package com.example.oide.room.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.example.oide.room.domain.SettlementRoom;

/** SettlementRoom(정산방) 엔티티의 영속성 조회/저장을 담당한다. */
public interface SettlementRoomRepository extends JpaRepository<SettlementRoom, Long> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select room from SettlementRoom room where room.id = :roomId")
	Optional<SettlementRoom> findByIdForUpdate(@Param("roomId") Long roomId);
  
	/** share_code 발급 시 충돌 여부를 확인하기 위한 존재 여부 조회. */
	boolean existsByShareCode(String shareCode);

	/** 공유 링크에 포함된 share_code로 방을 조회한다. */
	Optional<SettlementRoom> findByShareCode(String shareCode);
}
