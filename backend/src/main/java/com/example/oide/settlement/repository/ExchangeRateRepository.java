package com.example.oide.settlement.repository;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.oide.settlement.domain.ExchangeRate;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

	Optional<ExchangeRate> findFirstByProviderAndCurrencyAndAnnouncedDateBetweenOrderByAnnouncedDateDesc(
			String provider, String currency, LocalDate from, LocalDate to);

	boolean existsByProviderAndAnnouncedDateAndCurrency(
			String provider, LocalDate announcedDate, String currency);
}

