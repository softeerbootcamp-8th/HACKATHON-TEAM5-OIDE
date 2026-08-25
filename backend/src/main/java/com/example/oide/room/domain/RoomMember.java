package com.example.oide.room.domain;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

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
@Table(name = "room_member")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoomMember {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "room_id", nullable = false)
	private SettlementRoom room;

	@Column(nullable = false)
	private String nickname;

	@Column(name = "display_order", nullable = false)
	private int displayOrder;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	public RoomMember(SettlementRoom room, String nickname, int displayOrder) {
		this.room = room;
		this.nickname = nickname;
		this.displayOrder = displayOrder;
	}
}
