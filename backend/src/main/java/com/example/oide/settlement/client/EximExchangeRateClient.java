package com.example.oide.settlement.client;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface EximExchangeRateClient {

	List<ExchangeRateQuote> fetchRates(LocalDate date);

	record ExchangeRateQuote(String currency, BigDecimal rateToKrw, int quotedUnit) {
	}
}

