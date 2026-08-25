package com.example.oide.global.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(BusinessException.class)
	public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException exception) {
		return createResponse(exception.getErrorCode());
	}

	@ExceptionHandler(SettlementValidationException.class)
	public ResponseEntity<SettlementValidationErrorResponse> handleSettlementValidationException(
			SettlementValidationException exception) {
		return ResponseEntity.status(exception.getErrorCode().getStatus())
				.body(SettlementValidationErrorResponse.from(exception));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException exception) {
		return createResponse(ErrorCode.INVALID_REQUEST);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleUnexpectedException(Exception exception) {
		log.error("Unhandled exception", exception);
		return createResponse(ErrorCode.INTERNAL_SERVER_ERROR);
	}

	private ResponseEntity<ErrorResponse> createResponse(ErrorCode errorCode) {
		return ResponseEntity.status(errorCode.getStatus()).body(ErrorResponse.from(errorCode));
	}
}
