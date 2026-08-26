package com.example.oide.splitgroup.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateSplitGroupRequest(
		@NotBlank String name,
		@NotEmpty List<@NotNull Long> memberIds,
		@NotNull Long creatorMemberId) {

	public CreateSplitGroupRequest(String name, List<Long> memberIds) {
		this(name, memberIds, memberIds.getFirst());
	}
}
