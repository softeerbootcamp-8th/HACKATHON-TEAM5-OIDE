package com.example.oide.payment.service;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 이미지 한 장이 실패한 이유. 클라이언트가 판단할 수 있는 수준까지만 알린다.
 *
 * <p>예외 메시지를 그대로 내보내면 모델 응답 원문이나 HTTP 상태 같은 내부 사정이 함께 새어 나간다.
 * 진단에 필요한 내용은 로그에만 남긴다.
 */
@Schema(description = "이미지 추출 실패 사유: EXTRACTION_FAILED=이미지 추출 실패, UNEXPECTED_ERROR=후처리 중 예상하지 못한 오류")
public enum ExtractionFailureReason {

	/** 스크린샷을 읽지 못했다. 같은 이미지를 다시 올리면 성공할 수 있다. */
	EXTRACTION_FAILED,

	/** 추출 이후 처리에서 예상하지 못한 오류가 났다. */
	UNEXPECTED_ERROR
}
