package com.example.oide.room.domain;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.example.oide.global.currency.SupportedCurrency;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "settlement_room")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SettlementRoom {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "share_code", nullable = false, unique = true)
	private String shareCode;

	@Column(nullable = false)
	private String title;

	@Enumerated(EnumType.STRING)
	@Column(name = "default_currency", nullable = false, length = 3)
	private SupportedCurrency defaultCurrency;

	@CreationTimestamp
	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	public SettlementRoom(String shareCode, String title, SupportedCurrency defaultCurrency) {
		this.shareCode = shareCode;
		this.title = title;
		this.defaultCurrency = defaultCurrency;
	}
}
