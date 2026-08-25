package com.example.oide.payment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.oide.payment.dto.PaymentBulkRegisterRequest;
import com.example.oide.payment.dto.PaymentRegisterRequest;
import com.example.oide.payment.dto.PaymentResponse;
import com.example.oide.payment.service.PaymentCommandService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class PaymentController {

	private final PaymentCommandService paymentCommandService;

	/** 추출 결과를 사용자가 확인·수정한 뒤 한 번에 등록한다. */
	@PostMapping("/api/rooms/{roomId}/payments/bulk")
	public ResponseEntity<List<PaymentResponse>> registerBulk(
			@PathVariable Long roomId, @Valid @RequestBody PaymentBulkRegisterRequest request) {

		List<PaymentResponse> responses =
				paymentCommandService.register(roomId, request.toRegistrations()).stream()
						.map(PaymentResponse::from)
						.toList();
		return ResponseEntity.status(HttpStatus.CREATED).body(responses);
	}

	/** 스크린샷 없이 직접 입력한다. 금액과 통화만 필수다. */
	@PostMapping("/api/rooms/{roomId}/payments")
	public ResponseEntity<PaymentResponse> register(
			@PathVariable Long roomId, @Valid @RequestBody PaymentRegisterRequest request) {

		PaymentResponse response =
				PaymentResponse.from(
						paymentCommandService.register(roomId, List.of(request.toRegistration())).getFirst());
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	/** FR-02: 각 참여자가 등록한 결제 내역을 정산방에서 함께 확인한다. */
	@GetMapping("/api/rooms/{roomId}/payments")
	public List<PaymentResponse> findAll(@PathVariable Long roomId) {
		return paymentCommandService.findAll(roomId).stream().map(PaymentResponse::from).toList();
	}
}
