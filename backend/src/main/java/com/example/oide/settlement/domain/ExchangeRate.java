package com.example.oide.settlement.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
		name = "exchange_rate",
		uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "announced_date", "currency"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExchangeRate {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 20)
	private String provider;

	@Column(name = "announced_date", nullable = false)
	private LocalDate announcedDate;

	@Column(nullable = false, length = 3)
	private String currency;

	@Column(name = "rate_to_krw", nullable = false, precision = 19, scale = 8)
	private BigDecimal rateToKrw;

	@Column(name = "quoted_unit", nullable = false)
	private int quotedUnit;

	@Column(name = "fetched_at", nullable = false)
	private LocalDateTime fetchedAt;

	public ExchangeRate(
			String provider,
			LocalDate announcedDate,
			String currency,
			BigDecimal rateToKrw,
			int quotedUnit,
			LocalDateTime fetchedAt) {
		this.provider = provider;
		this.announcedDate = announcedDate;
		this.currency = currency;
		this.rateToKrw = rateToKrw;
		this.quotedUnit = quotedUnit;
		this.fetchedAt = fetchedAt;
	}
}

