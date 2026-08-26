package com.example.oide.splitgroup.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;

public record UpdateGroupPaymentsRequest(
		@NotNull Long memberId,
		@NotNull List<@NotNull Long> paymentIds) {
}
