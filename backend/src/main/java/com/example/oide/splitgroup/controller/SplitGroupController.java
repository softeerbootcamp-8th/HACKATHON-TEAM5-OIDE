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

import com.example.oide.splitgroup.dto.CreateSplitGroupRequest;
import com.example.oide.splitgroup.dto.SplitGroupResponse;
import com.example.oide.splitgroup.dto.UpdateSplitGroupRequest;
import com.example.oide.splitgroup.service.SplitGroupService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/rooms/{roomId}/split-groups")
// 정산 그룹의 생성·조회·수정·삭제 API를 제공한다.
public class SplitGroupController {

	private final SplitGroupService splitGroupService;

	// 사용자 지정 그룹을 생성한다.
	@PostMapping
	public ResponseEntity<SplitGroupResponse> create(
			@PathVariable Long roomId,
			@Valid @RequestBody CreateSplitGroupRequest request) {
		// 요청 본문 검증을 통과한 그룹 생성 정보를 서비스에 전달한다.
		return ResponseEntity.status(HttpStatus.CREATED).body(splitGroupService.create(roomId, request));
	}

	// 정산방의 그룹 목록을 조회한다.
	@GetMapping
	public ResponseEntity<List<SplitGroupResponse>> findAll(@PathVariable Long roomId) {
		// 전체 그룹을 포함한 현재 정산방의 그룹 목록을 반환한다.
		return ResponseEntity.ok(splitGroupService.findAll(roomId));
	}

	// 사용자 지정 그룹명과 구성원을 수정한다.
	@PutMapping("/{groupId}")
	public ResponseEntity<SplitGroupResponse> update(
			@PathVariable Long roomId,
			@PathVariable Long groupId,
			@Valid @RequestBody UpdateSplitGroupRequest request) {
		// URL의 정산방·그룹 식별자와 변경 데이터를 서비스에 전달한다.
		return ResponseEntity.ok(splitGroupService.update(roomId, groupId, request));
	}

	// 사용자 지정 그룹을 삭제한다.
	@DeleteMapping("/{groupId}")
	public ResponseEntity<Void> delete(@PathVariable Long roomId, @PathVariable Long groupId) {
		// 그룹 삭제가 완료되면 반환 본문 없이 성공 상태만 전달한다.
		splitGroupService.delete(roomId, groupId);
		return ResponseEntity.noContent().build();
	}
}
