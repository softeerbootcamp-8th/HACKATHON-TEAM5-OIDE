package com.example.oide.payment.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "payment")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "room_id", nullable = false)
	private SettlementRoom room;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "payer_member_id", nullable = false)
	private RoomMember payer;

	@Column(nullable = false)
	private String merchant;

	@Column(name = "paid_at", nullable = false)
	private LocalDateTime paidAt;

	@Column(nullable = false)
	private BigDecimal amount;

	@Column(nullable = false, length = 3)
	private String currency;

	@Column(name = "split_method", nullable = false)
	private String splitMethod;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	public Payment(
			SettlementRoom room,
			RoomMember payer,
			String merchant,
			LocalDateTime paidAt,
			BigDecimal amount,
			String currency,
			String splitMethod) {
		this.room = room;
		this.payer = payer;
		this.merchant = merchant;
		this.paidAt = paidAt;
		this.amount = amount;
		this.currency = currency;
		this.splitMethod = splitMethod;
	}
}
