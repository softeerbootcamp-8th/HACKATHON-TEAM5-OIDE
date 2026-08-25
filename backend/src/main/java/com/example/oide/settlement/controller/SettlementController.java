package com.example.oide.settlement.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.oide.settlement.dto.ManualRatesRequest;
import com.example.oide.settlement.dto.SettlementPreviewResponse;
import com.example.oide.settlement.dto.SettlementResponse;
import com.example.oide.settlement.service.SettlementService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rooms/{roomId}")
public class SettlementController {

	private final SettlementService settlementService;

	@GetMapping("/settlement-preview")
	public ResponseEntity<SettlementPreviewResponse> getPreview(@PathVariable Long roomId) {
		return ResponseEntity.ok(settlementService.getPreview(roomId));
	}

	@PostMapping("/settlement-preview")
	public ResponseEntity<SettlementPreviewResponse> previewWithManualRates(
			@PathVariable Long roomId, @Valid @RequestBody ManualRatesRequest request) {
		return ResponseEntity.ok(settlementService.previewWithManualRates(roomId, request));
	}

	@PostMapping("/settlements")
	public ResponseEntity<SettlementResponse> confirm(
			@PathVariable Long roomId, @Valid @RequestBody ManualRatesRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(settlementService.confirm(roomId, request));
	}

	@GetMapping("/settlements")
	public ResponseEntity<SettlementResponse> getSettlement(@PathVariable Long roomId) {
		return ResponseEntity.ok(settlementService.getSettlement(roomId));
	}
}

