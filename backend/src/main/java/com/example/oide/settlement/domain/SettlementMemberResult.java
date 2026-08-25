package com.example.oide.settlement.domain;

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
		name = "settlement_member_result",
		uniqueConstraints = @UniqueConstraint(columnNames = {"settlement_id", "member_id"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SettlementMemberResult {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "settlement_id", nullable = false)
	private Settlement settlement;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "member_id", nullable = false)
	private RoomMember member;

	@Column(name = "paid_krw", nullable = false)
	private long paidKrw;

	@Column(name = "owed_krw", nullable = false)
	private long owedKrw;

	public SettlementMemberResult(
			Settlement settlement, RoomMember member, long paidKrw, long owedKrw) {
		this.settlement = settlement;
		this.member = member;
		this.paidKrw = paidKrw;
		this.owedKrw = owedKrw;
	}
}
