package com.example.oide.splitgroup.dto;

import java.util.List;

public record SplitGroupDetailResponse(
		SplitGroupResponse group,
		List<GroupPaymentResponse> payments) {
}
