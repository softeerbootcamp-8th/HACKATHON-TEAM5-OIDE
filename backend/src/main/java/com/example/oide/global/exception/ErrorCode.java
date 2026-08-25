package com.example.oide.global.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

	// Common
	INVALID_REQUEST(HttpStatus.BAD_REQUEST, "COMMON_001", "잘못된 요청입니다."),
	INTERNAL_SERVER_ERROR(
			HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 내부 오류가 발생했습니다."),

	// Room
	ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "ROOM_001", "정산방을 찾을 수 없습니다."),
	MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "ROOM_002", "정산방 참여자를 찾을 수 없습니다."),

	// Payment
	PAYMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "PAYMENT_001", "결제 내역을 찾을 수 없습니다."),
	PAYMENT_ALREADY_ASSIGNED(HttpStatus.BAD_REQUEST, "PAYMENT_002", "이미 다른 그룹에 지정된 결제 내역입니다."),
	INVALID_PAYMENT_SELECTION(HttpStatus.BAD_REQUEST, "PAYMENT_003", "결제 내역은 중복해서 선택할 수 없습니다."),
	PAYMENT_GROUP_REQUIRED(HttpStatus.BAD_REQUEST, "PAYMENT_004", "먼저 결제를 그룹에 선택해 주세요."),
	INVALID_SHARE_MEMBERS(HttpStatus.BAD_REQUEST, "PAYMENT_005", "분담 참여자가 그룹 구성원과 일치하지 않습니다."),
	INVALID_SHARE_AMOUNT(HttpStatus.BAD_REQUEST, "PAYMENT_006", "분담 금액은 0 이상이어야 합니다."),
	UNBALANCED_PAYMENT_SHARE(HttpStatus.BAD_REQUEST, "PAYMENT_007", "분담 금액 합계가 결제 금액과 다릅니다."),

	// Group
	GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "GROUP_001", "분담 그룹을 찾을 수 없습니다."),
	ALL_GROUP_IMMUTABLE(HttpStatus.BAD_REQUEST, "GROUP_002", "전체 그룹은 수정하거나 삭제할 수 없습니다."),
	INVALID_GROUP_MEMBER_COUNT(HttpStatus.BAD_REQUEST, "GROUP_003", "그룹은 두 명 이상의 참여자로 구성해야 합니다."),

	// Settlement
	SETTLEMENT_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "SETTLEMENT_001", "정산을 완료할 수 없습니다."),
	SETTLEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "SETTLEMENT_002", "확정된 정산 결과가 없습니다.");

	private final HttpStatus status;
	private final String code;
	private final String message;

	ErrorCode(HttpStatus status, String code, String message) {
		this.status = status;
		this.code = code;
		this.message = message;
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getCode() {
		return code;
	}

	public String getMessage() {
		return message;
	}
}
