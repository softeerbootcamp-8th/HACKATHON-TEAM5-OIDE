package com.example.oide.payment.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.oide.global.exception.ErrorResponse;
import com.example.oide.payment.dto.CustomShareRequest;
import com.example.oide.payment.dto.PaymentShareResponse;
import com.example.oide.payment.service.PaymentShareService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rooms/{roomId}/payments/{paymentId}/shares")
@Tag(name = "Payment Share", description = "결제별 분담 금액 API")
public class PaymentShareController {

	private final PaymentShareService paymentShareService;

	@PutMapping("/equal")
	@Operation(summary = "n빵 분담 저장", description = "현재 그룹 구성원 수로 결제 금액을 균등 분배한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "저장 성공"),
			@ApiResponse(responseCode = "400", description = "그룹 미지정 또는 잘못된 분담 상태", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
			@ApiResponse(responseCode = "404", description = "방, 결제 또는 그룹을 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<PaymentShareResponse> saveEqual(
			@PathVariable Long roomId,
			@PathVariable Long paymentId,
			@RequestHeader("X-Room-Member-Id") Long memberId) {
		return ResponseEntity.ok(paymentShareService.saveEqual(roomId, paymentId, memberId));
	}

	@PutMapping("/custom")
	@Operation(summary = "직접입력 분담 저장", description = "현재 그룹 구성원별 부담 금액을 저장한다. 합계는 결제 금액과 같아야 한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "저장 성공"),
			@ApiResponse(responseCode = "400", description = "요청 구성원·금액 또는 분담 합계가 유효하지 않음", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
			@ApiResponse(responseCode = "404", description = "방, 결제 또는 그룹을 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<PaymentShareResponse> saveCustom(
			@PathVariable Long roomId,
			@PathVariable Long paymentId,
			@RequestHeader("X-Room-Member-Id") Long memberId,
			@Valid @RequestBody CustomShareRequest request) {
		return ResponseEntity.ok(paymentShareService.saveCustom(roomId, paymentId, memberId, request));
	}

	@GetMapping
	@Operation(summary = "결제 분담 조회", description = "결제의 구성원별 부담액과 분담 합계 일치 여부를 조회한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "조회 성공"),
			@ApiResponse(responseCode = "404", description = "방 또는 결제를 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<PaymentShareResponse> getShares(@PathVariable Long roomId, @PathVariable Long paymentId) {
		return ResponseEntity.ok(paymentShareService.getShares(roomId, paymentId));
	}
}
