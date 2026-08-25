package com.example.oide.settlement.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.settlement.domain.Settlement;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

	Optional<Settlement> findByRoomId(Long roomId);
}

