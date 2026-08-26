package com.example.oide.payment.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.oide.global.currency.SupportedCurrency;
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

	// FR-02: 결제처와 결제 시각은 입력하지 않아도 되므로 null을 허용한다.
	@Column
	private String merchant;

	@Column(name = "paid_at")
	private LocalDateTime paidAt;

	// 원 통화 기준 금액을 그대로 보관한다. 원화 환산은 FR-04에서 정산 시점에 수행한다.
	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal amount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 3)
	private SupportedCurrency currency;

	@Enumerated(EnumType.STRING)
	@Column(name = "split_method", length = 20)
	private SplitMethod splitMethod;

	@Column(name = "included_in_settlement", nullable = false)
	private boolean includedInSettlement;

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
			SupportedCurrency currency,
			SplitMethod splitMethod,
			boolean includedInSettlement) {
		this.room = room;
		this.payer = payer;
		this.merchant = merchant;
		this.paidAt = paidAt;
		this.amount = amount;
		this.currency = currency;
		this.splitMethod = splitMethod;
		this.includedInSettlement = includedInSettlement;
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

	public void changeInclusion(boolean includedInSettlement) {
		this.includedInSettlement = includedInSettlement;
	}
}
