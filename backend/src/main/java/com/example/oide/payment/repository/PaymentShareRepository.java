package com.example.oide.payment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.oide.payment.domain.PaymentShare;

public interface PaymentShareRepository extends JpaRepository<PaymentShare, Long> {

	@Modifying
	@Query("delete from PaymentShare share where share.payment.id = :paymentId")
	void deleteAllByPaymentId(@Param("paymentId") Long paymentId);
}
