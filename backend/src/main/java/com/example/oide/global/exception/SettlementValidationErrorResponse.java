package com.example.oide.global.exception;

import java.util.List;

public record SettlementValidationErrorResponse(
		String code,
		String message,
		List<Long> invalidPaymentIds,
		List<String> missingCurrencies) {

	public static SettlementValidationErrorResponse from(SettlementValidationException exception) {
		ErrorCode errorCode = exception.getErrorCode();
		return new SettlementValidationErrorResponse(
				errorCode.getCode(),
				errorCode.getMessage(),
				exception.getInvalidPaymentIds(),
				exception.getMissingCurrencies());
	}
}

