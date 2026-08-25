package com.example.oide.payment.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.oide.payment.dto.CustomShareRequest;
import com.example.oide.payment.dto.PaymentShareResponse;
import com.example.oide.payment.service.PaymentShareService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rooms/{roomId}/payments/{paymentId}/shares")
public class PaymentShareController {

	private final PaymentShareService paymentShareService;

	@PutMapping("/equal")
	public ResponseEntity<PaymentShareResponse> saveEqual(@PathVariable Long roomId, @PathVariable Long paymentId) {
		return ResponseEntity.ok(paymentShareService.saveEqual(roomId, paymentId));
	}

	@PutMapping("/custom")
	public ResponseEntity<PaymentShareResponse> saveCustom(@PathVariable Long roomId, @PathVariable Long paymentId, @Valid @RequestBody CustomShareRequest request) {
		return ResponseEntity.ok(paymentShareService.saveCustom(roomId, paymentId, request));
	}

	@GetMapping
	public ResponseEntity<PaymentShareResponse> getShares(@PathVariable Long roomId, @PathVariable Long paymentId) {
		return ResponseEntity.ok(paymentShareService.getShares(roomId, paymentId));
	}
}
