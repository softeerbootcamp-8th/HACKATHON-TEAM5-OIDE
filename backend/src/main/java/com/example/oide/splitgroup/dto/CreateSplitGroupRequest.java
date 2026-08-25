package com.example.oide.splitgroup.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateSplitGroupRequest(
		@NotBlank String name,
		@NotEmpty List<@NotNull Long> memberIds) {
}
