package com.example.oide.payment.domain;

import java.math.BigDecimal;

import com.example.oide.room.domain.RoomMember;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
		name = "payment_share",
		uniqueConstraints = @UniqueConstraint(columnNames = {"payment_id", "member_id"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentShare {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "payment_id", nullable = false)
	private Payment payment;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "member_id", nullable = false)
	private RoomMember member;

	@Column(name = "share_amount", nullable = false)
	private BigDecimal shareAmount;

	public PaymentShare(Payment payment, RoomMember member, BigDecimal shareAmount) {
		this.payment = payment;
		this.member = member;
		this.shareAmount = shareAmount;
	}
}
