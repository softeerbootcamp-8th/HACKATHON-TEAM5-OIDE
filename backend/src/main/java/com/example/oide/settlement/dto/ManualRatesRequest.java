package com.example.oide.settlement.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ManualRatesRequest(List<@Valid ManualRateRequest> manualRates) {

	public record ManualRateRequest(
			@NotBlank String currency,
			@NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal rateToKrw) {
	}
}

