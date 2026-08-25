package com.example.oide.global.exception;

import java.util.List;

import lombok.Getter;

@Getter
public class SettlementValidationException extends BusinessException {

	private final List<Long> invalidPaymentIds;
	private final List<String> missingCurrencies;

	public SettlementValidationException(List<Long> invalidPaymentIds, List<String> missingCurrencies) {
		super(ErrorCode.SETTLEMENT_VALIDATION_FAILED);
		this.invalidPaymentIds = invalidPaymentIds;
		this.missingCurrencies = missingCurrencies;
	}
}

