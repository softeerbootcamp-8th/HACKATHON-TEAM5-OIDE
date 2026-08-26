package com.example.oide.payment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.payment.domain.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

	List<Payment> findAllByRoomIdOrderByPaidAtDescIdDesc(Long roomId);

	List<Payment> findAllByRoomIdAndIncludedInSettlementTrueOrderByPaidAtDescIdDesc(Long roomId);

	List<Payment> findAllByRoomIdAndSplitGroupId(Long roomId, Long splitGroupId);

	List<Payment> findAllByRoomIdAndSplitGroupIdAndIncludedInSettlementTrue(Long roomId, Long splitGroupId);

	List<Payment> findAllByRoomIdAndIdIn(Long roomId, List<Long> paymentIds);
}
