package com.example.oide.payment.service;

import io.swagger.v3.oas.annotations.media.Schema;

/** 이미지 한 장의 추출 실패. 한 장이 실패해도 나머지 결과는 그대로 내려준다. */
@Schema(description = "이미지 한 장의 추출 실패 정보")
public record ImageFailure(
		@Schema(description = "업로드한 파일 목록에서의 0 기반 이미지 순서", example = "1") int imageIndex,
		@Schema(description = "실패한 원본 파일명", example = "payment-02.png") String filename,
		@Schema(description = "클라이언트에 공개하는 실패 사유") ExtractionFailureReason reason) {}
