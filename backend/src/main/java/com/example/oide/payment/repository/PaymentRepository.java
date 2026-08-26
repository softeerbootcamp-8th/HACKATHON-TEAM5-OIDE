package com.example.oide.payment.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.oide.payment.domain.Payment;

import jakarta.persistence.LockModeType;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select payment from Payment payment "
			+ "where payment.room.id = :roomId and payment.id = :paymentId")
	Optional<Payment> findByRoomIdAndIdForUpdate(
			@Param("roomId") Long roomId, @Param("paymentId") Long paymentId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select payment from Payment payment where payment.room.id = :roomId order by payment.id")
	List<Payment> findAllByRoomIdForUpdate(@Param("roomId") Long roomId);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select payment from Payment payment "
			+ "where payment.room.id = :roomId and payment.splitGroup.id = :groupId order by payment.id")
	List<Payment> findAllByRoomIdAndSplitGroupIdForUpdate(
			@Param("roomId") Long roomId, @Param("groupId") Long groupId);

	List<Payment> findAllByRoomIdOrderByPaidAtDescIdDesc(Long roomId);

	List<Payment> findAllByRoomIdAndIncludedInSettlementTrueOrderByPaidAtDescIdDesc(Long roomId);

	List<Payment> findAllByRoomIdAndSplitGroupId(Long roomId, Long splitGroupId);

	List<Payment> findAllByRoomIdAndSplitGroupIdAndIncludedInSettlementTrue(Long roomId, Long splitGroupId);

	List<Payment> findAllByRoomIdAndIdIn(Long roomId, List<Long> paymentIds);
}
