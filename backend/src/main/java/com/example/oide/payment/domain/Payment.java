package com.example.oide.payment.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.oide.room.domain.RoomMember;
import com.example.oide.room.domain.SettlementRoom;
import com.example.oide.splitgroup.domain.SplitGroup;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

	@Enumerated(EnumType.STRING)
	@Column(name = "split_method", length = 20)
	private SplitMethod splitMethod;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "split_group_id")
	private SplitGroup splitGroup;

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
			SplitMethod splitMethod) {
		this.room = room;
		this.payer = payer;
		this.merchant = merchant;
		this.paidAt = paidAt;
		this.amount = amount;
		this.currency = currency;
		this.splitMethod = splitMethod;
	}

	// 결제를 분담할 그룹을 지정한다.
	public void assignGroup(SplitGroup splitGroup) {
		this.splitGroup = splitGroup;
	}

	// 결제의 그룹 지정과 분담 방식을 함께 초기화한다.
	public void clearSplit() {
		this.splitGroup = null;
		this.splitMethod = null;
	}

	// 다음 분담 저장 단계에서 선택한 방식을 기록한다.
	public void changeSplitMethod(SplitMethod splitMethod) {
		this.splitMethod = splitMethod;
	}
}
