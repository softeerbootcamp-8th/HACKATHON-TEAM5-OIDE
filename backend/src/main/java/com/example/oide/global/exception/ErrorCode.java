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

	// Group
	GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "GROUP_001", "분담 그룹을 찾을 수 없습니다."),
	ALL_GROUP_IMMUTABLE(HttpStatus.BAD_REQUEST, "GROUP_002", "전체 그룹은 수정하거나 삭제할 수 없습니다."),
	INVALID_GROUP_MEMBER_COUNT(HttpStatus.BAD_REQUEST, "GROUP_003", "그룹은 두 명 이상의 참여자로 구성해야 합니다.");

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
