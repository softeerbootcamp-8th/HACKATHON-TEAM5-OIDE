package com.example.oide.payment.service;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "추출 작업 상태: RUNNING=이미지 처리 중, COMPLETED=전체 이미지 처리와 중복 후처리 완료")
public enum ExtractionStatus {
	RUNNING,
	COMPLETED
}
