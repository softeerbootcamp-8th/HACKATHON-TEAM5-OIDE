package com.example.oide.payment.dto;

import com.example.oide.payment.service.ExtractionJob;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "결제 스크린샷 비동기 추출 시작 응답")
public record ExtractionStartResponse(
		@Schema(description = "추출 상태를 폴링할 작업 ID", example = "7d1e91c8-ef5f-47db-b790-bf04ec68a90a")
				String jobId,
		@Schema(description = "업로드가 승인된 전체 이미지 수", example = "3") int totalImages) {

	public static ExtractionStartResponse from(ExtractionJob job) {
		return new ExtractionStartResponse(job.id(), job.totalImages());
	}
}
