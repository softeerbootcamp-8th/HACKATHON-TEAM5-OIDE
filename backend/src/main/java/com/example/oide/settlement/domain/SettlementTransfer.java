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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "settlement_transfer")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SettlementTransfer {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "settlement_id", nullable = false)
	private Settlement settlement;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "sender_member_id", nullable = false)
	private RoomMember sender;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "receiver_member_id", nullable = false)
	private RoomMember receiver;

	@Column(name = "amount_krw", nullable = false)
	private long amountKrw;

	public SettlementTransfer(
			Settlement settlement, RoomMember sender, RoomMember receiver, long amountKrw) {
		this.settlement = settlement;
		this.sender = sender;
		this.receiver = receiver;
		this.amountKrw = amountKrw;
	}
}
