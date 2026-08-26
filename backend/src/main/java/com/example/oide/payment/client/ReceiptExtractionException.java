package com.example.oide.payment.client;

/**
 * 스크린샷 한 장의 추출이 실패했다.
 *
 * <p>포트가 실패 타입을 정의해 두면 호출하는 쪽이 구현체(Gemini)의 예외를 알 필요가 없다.
 * 메시지는 진단용이므로 로그에만 남기고 API 응답으로 내보내지 않는다.
 */
public class ReceiptExtractionException extends RuntimeException {

	public ReceiptExtractionException(String message, Throwable cause) {
		super(message, cause);
	}
}
