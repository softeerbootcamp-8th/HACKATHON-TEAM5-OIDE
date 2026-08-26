package com.example.oide.settlement.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
import com.example.oide.global.exception.BusinessException;
import com.example.oide.global.exception.ErrorCode;
import com.example.oide.global.exception.ErrorResponse;
import com.example.oide.settlement.dto.ManualRatesRequest;
import com.example.oide.settlement.dto.SettlementPreviewResponse;
import com.example.oide.settlement.dto.SettlementProgressResponse;
import com.example.oide.settlement.dto.SettlementResponse;
import com.example.oide.settlement.service.SettlementProgressService;
import com.example.oide.settlement.service.SettlementService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rooms/{roomId}")
@Tag(name = "Settlement", description = "환율 조회와 최종 정산 API")
public class SettlementController {

	private final SettlementService settlementService;
	private final SettlementProgressService settlementProgressService;

	@GetMapping("/settlement-progress")
	@Operation(summary = "참여자별 정산 진행 상태 조회")
	public ResponseEntity<SettlementProgressResponse> getProgress(@PathVariable Long roomId) {
		return ResponseEntity.ok(settlementProgressService.getProgress(roomId));
	}

	@PutMapping("/settlement-progress/members/{memberId}/completion-without-payments")
	@Operation(summary = "결제 내역 없는 참여자 정산 완료")
	public ResponseEntity<Void> completeWithoutPayments(
			@PathVariable Long roomId,
			@PathVariable Long memberId,
			@RequestHeader("X-Room-Member-Id") Long requesterMemberId) {
		validateRequester(memberId, requesterMemberId);
		settlementProgressService.completeWithoutPayments(roomId, memberId);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/settlement-preview")
	@Operation(summary = "자동 환율 정산 미리보기", description = "방 생성일 기준 환율을 캐시 또는 수출입은행 API에서 조회해 정산 결과를 미리 계산한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "미리보기 성공. 환율 또는 분담이 누락되면 settlementAvailable=false를 반환"),
			@ApiResponse(responseCode = "404", description = "방을 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<SettlementPreviewResponse> getPreview(@PathVariable Long roomId) {
		return ResponseEntity.ok(settlementService.getPreview(roomId));
	}

	@PostMapping("/settlement-preview")
	@Operation(summary = "수동 환율 정산 미리보기", description = "입력한 환율을 자동 환율보다 우선 적용해 정산 결과를 미리 계산한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "미리보기 성공"),
			@ApiResponse(responseCode = "400", description = "환율 값이 유효하지 않음", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
			@ApiResponse(responseCode = "404", description = "방을 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<SettlementPreviewResponse> previewWithManualRates(
			@PathVariable Long roomId, @Valid @RequestBody ManualRatesRequest request) {
		return ResponseEntity.ok(settlementService.previewWithManualRates(roomId, request));
	}

	@PostMapping("/settlements")
	@Operation(summary = "최종 정산 확정", description = "분담 완료 결제와 자동·수동 환율로 최종 정산 결과를 저장한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "정산 확정 성공"),
			@ApiResponse(responseCode = "400", description = "분담 또는 환율이 누락되었거나 환율 값이 유효하지 않음", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
			@ApiResponse(responseCode = "404", description = "방을 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<SettlementResponse> confirm(
			@PathVariable Long roomId, @Valid @RequestBody ManualRatesRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(settlementService.confirm(roomId, request));
	}

	@GetMapping("/settlements")
	@Operation(summary = "확정 정산 조회", description = "확정 시 저장한 환율, 참여자별 결과, 송금 목록을 조회한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "조회 성공"),
			@ApiResponse(responseCode = "404", description = "방 또는 확정 정산을 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<SettlementResponse> getSettlement(@PathVariable Long roomId) {
		return ResponseEntity.ok(settlementService.getSettlement(roomId));
	}

	@PutMapping("/settlements/members/{memberId}/completion")
	@Operation(summary = "참여자 정산 완료", description = "참여자의 정산 완료 상태를 멱등하게 저장한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "완료 처리 성공"),
			@ApiResponse(responseCode = "404", description = "방, 확정 정산 또는 참여자를 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<Void> completeMemberSettlement(
			@PathVariable Long roomId,
			@PathVariable Long memberId,
			@RequestHeader("X-Room-Member-Id") Long requesterMemberId) {
		validateRequester(memberId, requesterMemberId);
		settlementService.completeMemberSettlement(roomId, memberId);
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/settlements/members/{memberId}/completion")
	@Operation(summary = "참여자 정산 완료 취소", description = "참여자의 정산 완료 상태를 취소한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "204", description = "취소 성공"),
			@ApiResponse(responseCode = "404", description = "방, 확정 정산 또는 참여자를 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<Void> uncompleteMemberSettlement(
			@PathVariable Long roomId,
			@PathVariable Long memberId,
			@RequestHeader("X-Room-Member-Id") Long requesterMemberId) {
		validateRequester(memberId, requesterMemberId);
		settlementService.uncompleteMemberSettlement(roomId, memberId);
		return ResponseEntity.noContent().build();
	}

	private void validateRequester(Long memberId, Long requesterMemberId) {
		if (!memberId.equals(requesterMemberId)) {
			throw new BusinessException(ErrorCode.SETTLEMENT_MEMBER_MISMATCH);
		}
	}
}
