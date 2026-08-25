package com.example.oide.room.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import com.example.oide.room.domain.SettlementRoom;

public interface SettlementRoomRepository extends JpaRepository<SettlementRoom, Long> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@org.springframework.data.jpa.repository.Query("select room from SettlementRoom room where room.id = :roomId")
	java.util.Optional<SettlementRoom> findByIdForUpdate(@Param("roomId") Long roomId);
}
