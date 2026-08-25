package com.example.oide.settlement.domain;

import java.time.LocalDateTime;

import org.hibernate.annotations.UpdateTimestamp;

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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "settlement", uniqueConstraints = @UniqueConstraint(columnNames = "room_id"))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Settlement {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "room_id", nullable = false)
	private SettlementRoom room;

	@Column(nullable = false)
	private String status;

	@Column(name = "calculated_at", nullable = false)
	private LocalDateTime calculatedAt;

	@UpdateTimestamp
	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	public Settlement(SettlementRoom room, String status, LocalDateTime calculatedAt) {
		this.room = room;
		this.status = status;
		this.calculatedAt = calculatedAt;
	}

	public void recalculate(LocalDateTime calculatedAt) {
		this.status = "COMPLETED";
		this.calculatedAt = calculatedAt;
	}
}
