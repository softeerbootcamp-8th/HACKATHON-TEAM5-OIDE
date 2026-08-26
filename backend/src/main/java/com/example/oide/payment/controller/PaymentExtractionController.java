package com.example.oide.payment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.oide.global.exception.ErrorResponse;
import com.example.oide.payment.dto.ExtractionJobResponse;
import com.example.oide.payment.dto.ExtractionStartResponse;
import com.example.oide.payment.service.PaymentExtractionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 스크린샷 추출 API.
 *
 * <p>업로드는 202로 즉시 끝내고 결과는 폴링으로 받는다. 20장 추출이 끝날 때까지 커넥션을 붙들면
 * 진행률을 보여줄 수 없고, 중간에 끊기면 이미 올린 이미지까지 전부 다시 올려야 한다.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Payment Extraction", description = "결제 스크린샷 비동기 추출 API")
public class PaymentExtractionController {

	private final PaymentExtractionService paymentExtractionService;

	@PostMapping(value = "/api/rooms/{roomId}/payments/extractions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(
			summary = "결제 스크린샷 추출 시작",
			description = "스크린샷 1~20장을 업로드하고 비동기 추출 작업을 시작한다. 202 응답의 jobId로 진행 상태를 폴링한다.")
	@ApiResponses({
		@ApiResponse(
				responseCode = "202",
				description = "추출 작업 시작 성공",
				content = @Content(schema = @Schema(implementation = ExtractionStartResponse.class))),
		@ApiResponse(
				responseCode = "400",
				description = "파일 없음, 20장 초과, 지원하지 않는 형식, 10MB 초과 (PAYMENT_011~PAYMENT_014)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "404",
				description = "정산방을 찾을 수 없음 (ROOM_001)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "410",
				description = "정산방이 만료됨 (ROOM_003)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<ExtractionStartResponse> start(
			@Parameter(description = "정산방 ID", example = "1") @PathVariable Long roomId,
			@Parameter(description = "추출할 JPEG, PNG 또는 WEBP 이미지. 1~20장, 장당 최대 10MB", required = true)
					@RequestParam(value = "files", required = false)
					List<MultipartFile> files) {

		return ResponseEntity.status(HttpStatus.ACCEPTED)
				.body(ExtractionStartResponse.from(paymentExtractionService.start(roomId, files)));
	}

	@GetMapping("/api/extractions/{jobId}")
	@Operation(
			summary = "결제 스크린샷 추출 상태 조회",
			description = "작업이 COMPLETED가 될 때까지 폴링한다. 일부 이미지가 실패해도 성공한 항목은 items에 유지된다.")
	@ApiResponses({
		@ApiResponse(
				responseCode = "200",
				description = "추출 진행 상태 조회 성공",
				content = @Content(schema = @Schema(implementation = ExtractionJobResponse.class))),
		@ApiResponse(
				responseCode = "404",
				description = "추출 작업을 찾을 수 없음 (PAYMENT_015)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ExtractionJobResponse get(
			@Parameter(description = "추출 시작 응답에서 받은 작업 ID", example = "7d1e91c8-ef5f-47db-b790-bf04ec68a90a")
					@PathVariable String jobId) {
		return ExtractionJobResponse.from(paymentExtractionService.getJob(jobId));
	}
}
