package com.example.oide.splitgroup.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.oide.global.exception.ErrorResponse;
import com.example.oide.splitgroup.dto.CreateSplitGroupRequest;
import com.example.oide.splitgroup.dto.SplitGroupDetailResponse;
import com.example.oide.splitgroup.dto.SplitGroupResponse;
import com.example.oide.splitgroup.dto.UpdateGroupPaymentsRequest;
import com.example.oide.splitgroup.dto.UpdateSplitGroupRequest;
import com.example.oide.splitgroup.service.SplitGroupService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rooms/{roomId}/split-groups")
@Tag(name = "Split Group", description = "정산 그룹과 그룹별 결제 선택 API")
public class SplitGroupController {

	private final SplitGroupService splitGroupService;

	@PostMapping
	@Operation(summary = "정산 그룹 생성", description = "이름과 참여자를 지정해 사용자 그룹을 만든다.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "생성 성공"),
			@ApiResponse(responseCode = "400", description = "그룹 이름, 참여자 수 또는 참여자 구성이 유효하지 않음", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
			@ApiResponse(responseCode = "404", description = "방 또는 참여자를 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<SplitGroupResponse> create(
			@PathVariable Long roomId,
			@Valid @RequestBody CreateSplitGroupRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(splitGroupService.create(roomId, request));
	}

	@GetMapping
	@Operation(summary = "정산 그룹 목록 조회", description = "전체 그룹을 포함한 방의 정산 그룹 목록을 조회한다.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "조회 성공"),
			@ApiResponse(responseCode = "404", description = "방을 찾을 수 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
	})
	public ResponseEntity<List<SplitGroupResponse>> findAll(@PathVariable Long roomId) {
		return ResponseEntity.ok(splitGroupService.findAll(roomId));
	}

	@GetMapping("/{groupId}")
	@Operation(summary = "정산 그룹 상세 조회", description = "그룹 구성원과 결제별 선택 상태를 조회한다.")
	public ResponseEntity<SplitGroupDetailResponse> findDetail(
			@PathVariable Long roomId, @PathVariable Long groupId) {
		return ResponseEntity.ok(splitGroupService.findDetail(roomId, groupId));
	}

	@PutMapping("/{groupId}")
	@Operation(summary = "정산 그룹 수정", description = "사용자 그룹의 이름과 구성원을 변경한다. 전체 그룹 및 다른 그룹과 동일한 구성은 허용하지 않는다.")
	public ResponseEntity<SplitGroupResponse> update(
			@PathVariable Long roomId,
			@PathVariable Long groupId,
			@Valid @RequestBody UpdateSplitGroupRequest request) {
		return ResponseEntity.ok(splitGroupService.update(roomId, groupId, request));
	}

	@PutMapping("/{groupId}/payments")
	@Operation(summary = "그룹 결제 선택 저장", description = "그룹이 분담할 결제 목록을 저장한다. 다른 그룹에 선택된 결제는 지정할 수 없다.")
	public ResponseEntity<Void> updatePayments(
			@PathVariable Long roomId,
			@PathVariable Long groupId,
			@Valid @RequestBody UpdateGroupPaymentsRequest request) {
		splitGroupService.updatePayments(roomId, groupId, request);
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/{groupId}")
	@Operation(summary = "정산 그룹 삭제", description = "사용자 그룹을 삭제한다. 전체 그룹은 삭제할 수 없다.")
	public ResponseEntity<Void> delete(@PathVariable Long roomId, @PathVariable Long groupId) {
		splitGroupService.delete(roomId, groupId);
		return ResponseEntity.noContent().build();
	}
}
