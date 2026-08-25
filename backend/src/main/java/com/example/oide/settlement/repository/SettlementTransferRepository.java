package com.example.oide.settlement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.oide.settlement.domain.SettlementTransfer;

public interface SettlementTransferRepository extends JpaRepository<SettlementTransfer, Long> {

	List<SettlementTransfer> findAllBySettlementIdOrderByIdAsc(Long settlementId);

	@Modifying
	@Query("delete from SettlementTransfer transfer where transfer.settlement.id = :settlementId")
	void deleteAllBySettlementId(@Param("settlementId") Long settlementId);
}

