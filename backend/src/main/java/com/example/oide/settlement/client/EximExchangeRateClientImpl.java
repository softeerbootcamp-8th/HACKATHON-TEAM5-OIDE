package com.example.oide.settlement.client;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class EximExchangeRateClientImpl implements EximExchangeRateClient {

	private final RestClient restClient;
	private final String apiKey;

	public EximExchangeRateClientImpl(
			@Value("${exim.base-url:https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON}") String baseUrl,
			@Value("${exim.api-key:}") String apiKey) {
		this.restClient = RestClient.builder().baseUrl(baseUrl).build();
		this.apiKey = apiKey;
	}

	@Override
	public List<ExchangeRateQuote> fetchRates(LocalDate date) {
		List<?> response;
		try {
			response = restClient.get()
					.uri(uriBuilder -> uriBuilder
							.queryParam("authkey", apiKey)
							.queryParam("searchdate", date.format(DateTimeFormatter.BASIC_ISO_DATE))
							.queryParam("data", "AP01")
							.build())
					.retrieve()
					.body(List.class);
		} catch (RestClientException exception) {
			return List.of();
		}
		if (response == null) {
			return List.of();
		}

		List<ExchangeRateQuote> quotes = new ArrayList<>();
		for (Object item : response) {
			if (!(item instanceof Map<?, ?> row) || !isSuccessful(row)) {
				continue;
			}
			String curUnit = String.valueOf(row.get("cur_unit"));
			String dealBaseRate = String.valueOf(row.get("deal_bas_r"));
			if ("null".equals(dealBaseRate)) {
				continue;
			}
			int unit = getQuotedUnit(curUnit);
			String currency = curUnit.substring(0, curUnit.indexOf('(') < 0 ? curUnit.length() : curUnit.indexOf('('));
			BigDecimal rateToKrw = new BigDecimal(dealBaseRate.replace(",", ""))
					.divide(BigDecimal.valueOf(unit));
			quotes.add(new ExchangeRateQuote(currency, rateToKrw, unit));
		}
		return quotes;
	}

	private boolean isSuccessful(Map<?, ?> row) {
		Object result = row.get("result");
		return result != null && "1".equals(String.valueOf(result));
	}

	private int getQuotedUnit(String curUnit) {
		int start = curUnit.indexOf('(');
		if (start < 0) {
			return 1;
		}
		return Integer.parseInt(curUnit.substring(start + 1, curUnit.length() - 1));
	}
}

