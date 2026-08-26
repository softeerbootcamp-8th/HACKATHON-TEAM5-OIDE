package com.example.oide.settlement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.oide.settlement.domain.SettlementRate;

public interface SettlementRateRepository extends JpaRepository<SettlementRate, Long> {

	List<SettlementRate> findAllBySettlementIdOrderByCurrencyAsc(Long settlementId);

	@Modifying
	@Query("delete from SettlementRate rate where rate.settlement.id = :settlementId")
	void deleteAllBySettlementId(@Param("settlementId") Long settlementId);
}

