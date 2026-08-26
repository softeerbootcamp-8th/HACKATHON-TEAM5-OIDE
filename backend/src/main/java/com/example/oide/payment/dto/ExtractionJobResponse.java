package com.example.oide.payment.dto;

import java.util.List;

import com.example.oide.payment.service.ExtractedPayment;
import com.example.oide.payment.service.ExtractionJob;
import com.example.oide.payment.service.ExtractionStatus;
import com.example.oide.payment.service.ImageFailure;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 폴링 응답.
 *
 * <p>실패한 이미지가 있어도 성공한 결과는 그대로 내려간다. 프론트는 {@code failures}에 있는 것만
 * 다시 올리면 된다.
 */
@Schema(description = "결제 스크린샷 추출 작업의 현재 상태와 누적 결과")
public record ExtractionJobResponse(
			@Schema(description = "추출 작업 ID", example = "7d1e91c8-ef5f-47db-b790-bf04ec68a90a")
					String jobId,
			@Schema(description = "작업 상태. COMPLETED가 되면 전체 이미지 후처리까지 끝난 상태") ExtractionStatus status,
			@Schema(description = "전체 이미지 수", example = "3") int totalImages,
			@Schema(description = "성공 또는 실패 처리가 끝난 이미지 수", example = "2") int finishedImages,
			@Schema(description = "현재까지 추출된 거래. COMPLETED 응답에서는 이미지 간 중복 표시까지 반영됨")
					List<ExtractedPayment> items,
			@Schema(description = "추출에 실패한 이미지. 실패한 이미지가 있어도 성공한 items는 유지됨")
					List<ImageFailure> failures) {

	public static ExtractionJobResponse from(ExtractionJob job) {
		List<ExtractedPayment> items = job.items();
		return new ExtractionJobResponse(
				job.id(), job.status(), job.totalImages(), job.finishedImages(), items, job.failures());
	}
}
