package com.example.oide.payment.domain;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "결제 분담 방식: EQUAL=균등 분담, CUSTOM=참여자별 직접 입력")
public enum SplitMethod {
	EQUAL,
	CUSTOM
}
