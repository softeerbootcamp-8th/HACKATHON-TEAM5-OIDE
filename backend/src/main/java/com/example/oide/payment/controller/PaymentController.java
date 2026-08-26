package com.example.oide.payment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.oide.global.exception.ErrorResponse;
import com.example.oide.payment.dto.PaymentBulkRegisterRequest;
import com.example.oide.payment.dto.PaymentInclusionRequest;
import com.example.oide.payment.dto.PaymentRegisterRequest;
import com.example.oide.payment.dto.PaymentResponse;
import com.example.oide.payment.service.PaymentCommandService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@Tag(name = "Payment", description = "결제 내역 확정 등록·직접 입력·조회 API")
public class PaymentController {

	private final PaymentCommandService paymentCommandService;

	/** 추출 결과를 사용자가 확인·수정한 뒤 한 번에 등록한다. */
	@PostMapping("/api/rooms/{roomId}/payments/bulk")
	@Operation(
			summary = "결제 내역 일괄 등록",
			description = "스크린샷 추출 결과를 사용자가 확인·수정한 뒤 여러 건을 한 번에 확정 등록한다. 결제처와 결제 시각은 생략할 수 있다.")
	@ApiResponses({
		@ApiResponse(
				responseCode = "201",
				description = "일괄 등록 성공",
				content = @Content(array = @ArraySchema(schema = @Schema(implementation = PaymentResponse.class)))),
		@ApiResponse(
				responseCode = "400",
				description = "빈 목록, 유효하지 않은 금액·통화 또는 요청 형식 (PAYMENT_008~PAYMENT_010, COMMON_001)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "404",
				description = "정산방 또는 결제자를 찾을 수 없음 (ROOM_001, ROOM_002)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "410",
				description = "정산방이 만료됨 (ROOM_003)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<List<PaymentResponse>> registerBulk(
			@Parameter(description = "정산방 ID", example = "1") @PathVariable Long roomId,
			@Valid @RequestBody PaymentBulkRegisterRequest request) {

		List<PaymentResponse> responses =
				paymentCommandService.register(roomId, request.toRegistrations()).stream()
						.map(PaymentResponse::from)
						.toList();
		return ResponseEntity.status(HttpStatus.CREATED).body(responses);
	}

	/** 스크린샷 없이 직접 입력한다. 금액과 통화만 필수다. */
	@PostMapping("/api/rooms/{roomId}/payments")
	@Operation(
			summary = "결제 내역 직접 등록",
			description = "스크린샷 없이 결제 내역 한 건을 직접 등록한다. 금액과 통화만 필수이며 결제처와 결제 시각은 생략할 수 있다.")
	@ApiResponses({
		@ApiResponse(
				responseCode = "201",
				description = "직접 등록 성공",
				content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
		@ApiResponse(
				responseCode = "400",
				description = "유효하지 않은 금액·통화 또는 요청 형식 (PAYMENT_008, PAYMENT_009, COMMON_001)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "404",
				description = "정산방 또는 결제자를 찾을 수 없음 (ROOM_001, ROOM_002)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "410",
				description = "정산방이 만료됨 (ROOM_003)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<PaymentResponse> register(
			@Parameter(description = "정산방 ID", example = "1") @PathVariable Long roomId,
			@Valid @RequestBody PaymentRegisterRequest request) {

		PaymentResponse response =
				PaymentResponse.from(
						paymentCommandService.register(roomId, List.of(request.toRegistration())).getFirst());
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	/** FR-02: 각 참여자가 등록한 결제 내역을 정산방에서 함께 확인한다. */
	@GetMapping("/api/rooms/{roomId}/payments")
	@Operation(
			summary = "정산방 결제 내역 조회",
			description = "정산방의 모든 참여자가 등록한 결제 내역을 결제 시각 내림차순으로 조회한다. 결제 시각이 없는 항목은 뒤에 온다.")
	@ApiResponses({
		@ApiResponse(
				responseCode = "200",
				description = "결제 내역 조회 성공",
				content = @Content(array = @ArraySchema(schema = @Schema(implementation = PaymentResponse.class)))),
		@ApiResponse(
				responseCode = "404",
				description = "정산방을 찾을 수 없음 (ROOM_001)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "410",
				description = "정산방이 만료됨 (ROOM_003)",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public List<PaymentResponse> findAll(
			@Parameter(description = "정산방 ID", example = "1") @PathVariable Long roomId) {
		return paymentCommandService.findAll(roomId).stream().map(PaymentResponse::from).toList();
	}

	@PatchMapping("/api/rooms/{roomId}/payments/{paymentId}/inclusion")
	@Operation(summary = "정산 대상 포함 여부 변경")
	@ApiResponses({
		@ApiResponse(responseCode = "204", description = "변경 성공"),
		@ApiResponse(
				responseCode = "404",
				description = "정산방 또는 결제 내역을 찾을 수 없음",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
		@ApiResponse(
				responseCode = "410",
				description = "정산방이 만료됨",
				content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<Void> updateInclusion(
			@Parameter(description = "정산방 ID", example = "1") @PathVariable Long roomId,
			@Parameter(description = "결제 내역 ID", example = "101") @PathVariable Long paymentId,
			@RequestBody PaymentInclusionRequest request) {
		paymentCommandService.updateInclusion(roomId, paymentId, request.includedInSettlement());
		return ResponseEntity.noContent().build();
	}
}
