package com.example.oide.settlement.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
		name = "settlement_rate",
		uniqueConstraints = @UniqueConstraint(columnNames = {"settlement_id", "currency"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SettlementRate {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "settlement_id", nullable = false)
	private Settlement settlement;

	@Column(nullable = false, length = 3)
	private String currency;

	@Column(name = "rate_to_krw", nullable = false)
	private BigDecimal rateToKrw;

	@Column(name = "rate_source", nullable = false)
	private String rateSource;

	@Column(name = "effective_date", nullable = false)
	private LocalDate effectiveDate;

	@Column(name = "quoted_at", nullable = false)
	private LocalDateTime quotedAt;

	public SettlementRate(
			Settlement settlement,
			String currency,
			BigDecimal rateToKrw,
			String rateSource,
			LocalDate effectiveDate,
			LocalDateTime quotedAt) {
		this.settlement = settlement;
		this.currency = currency;
		this.rateToKrw = rateToKrw;
		this.rateSource = rateSource;
		this.effectiveDate = effectiveDate;
		this.quotedAt = quotedAt;
	}
}
