package com.example.oide.global.exception;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "공통 오류 응답")
public record ErrorResponse(
		@Schema(description = "클라이언트가 분기할 수 있는 도메인 오류 코드", example = "PAYMENT_013") String code,
		@Schema(description = "사용자에게 표시할 수 있는 오류 메시지", example = "JPEG, PNG, WEBP 이미지만 업로드할 수 있습니다.")
				String message) {

	public static ErrorResponse from(ErrorCode errorCode) {
		return new ErrorResponse(errorCode.getCode(), errorCode.getMessage());
	}
}
