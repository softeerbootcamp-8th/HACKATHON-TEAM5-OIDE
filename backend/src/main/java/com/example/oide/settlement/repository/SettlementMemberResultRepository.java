package com.example.oide.settlement.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.oide.settlement.domain.SettlementMemberResult;

public interface SettlementMemberResultRepository extends JpaRepository<SettlementMemberResult, Long> {

	@Query("select result from SettlementMemberResult result "
			+ "where result.settlement.id = :settlementId order by result.member.displayOrder")
	List<SettlementMemberResult> findAllBySettlementIdOrderByMemberOrder(@Param("settlementId") Long settlementId);

	@Query("select result from SettlementMemberResult result "
			+ "where result.settlement.id = :settlementId and result.member.id = :memberId")
	Optional<SettlementMemberResult> findBySettlementIdAndMemberId(
			@Param("settlementId") Long settlementId, @Param("memberId") Long memberId);

	@Modifying
	@Query("delete from SettlementMemberResult result where result.settlement.id = :settlementId")
	void deleteAllBySettlementId(@Param("settlementId") Long settlementId);
}
