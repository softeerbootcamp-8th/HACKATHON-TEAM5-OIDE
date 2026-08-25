package com.example.oide.global.exception;

import org.springframework.http.HttpStatus;

/**
 * 비즈니스 예외를 구분하는 코드 모음.
 * 각 상수는 HTTP 상태 코드, 클라이언트가 분기할 수 있는 문자열 코드, 사용자에게 보여줄 메시지를 함께 가진다.
 */
public enum ErrorCode {

	// 공통 예외: 특정 도메인에 속하지 않는 요청 오류/서버 오류
	INVALID_REQUEST(HttpStatus.BAD_REQUEST, "COMMON_001", "잘못된 요청입니다."),
	INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 내부 오류가 발생했습니다."),

	// 정산방(room) 도메인 예외
	ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "ROOM_001", "정산방을 찾을 수 없습니다."), // shareCode로 방을 찾지 못했을 때
	ROOM_EXPIRED(HttpStatus.GONE, "ROOM_002", "정산방이 만료되었습니다."), // 생성 후 7일이 지난 방을 조회했을 때
	INVALID_TITLE(HttpStatus.BAD_REQUEST, "ROOM_003", "방 이름은 공백일 수 없고 10자 이내여야 합니다."),
	INVALID_MEMBER_COUNT(HttpStatus.BAD_REQUEST, "ROOM_004", "참여자는 최소 2명 이상이어야 합니다."),
	INVALID_NICKNAME(HttpStatus.BAD_REQUEST, "ROOM_005", "닉네임은 1자 이상 10자 이하이며 공백을 포함할 수 없습니다."),
	DUPLICATE_NICKNAME(HttpStatus.BAD_REQUEST, "ROOM_006", "닉네임이 중복되었습니다.");

	private final HttpStatus status;
	private final String code;
	private final String message;

	ErrorCode(HttpStatus status, String code, String message) {
		this.status = status;
		this.code = code;
		this.message = message;
	}

	/** GlobalExceptionHandler가 응답 상태 코드를 결정할 때 사용하는 HTTP 상태. */
	public HttpStatus getStatus() {
		return status;
	}

	/** 클라이언트가 에러 종류를 분기 처리할 때 사용하는 문자열 코드. */
	public String getCode() {
		return code;
	}

	/** 사용자에게 그대로 노출해도 되는 에러 메시지. */
	public String getMessage() {
		return message;
	}
}
