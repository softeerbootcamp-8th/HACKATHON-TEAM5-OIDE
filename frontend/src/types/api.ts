/**
 * API 공통 타입.
 *
 * 서비스 계층은 실패를 모두 ApiError 로 정규화해서 던진다.
 * 화면은 error.code 로 분기하고 fetch/Response 를 직접 알 필요가 없다.
 */

export type ApiErrorCode =
  /** 방을 찾을 수 없음 (404) */
  | 'ROOM_NOT_FOUND'
  /** 7일이 지나 삭제된 방 (410) */
  | 'ROOM_EXPIRED'
  /** 닉네임 형식 위반 (400) */
  | 'INVALID_NICKNAME'
  /** 같은 방에 중복 닉네임 (400) */
  | 'DUPLICATE_NICKNAME'
  /** 참여자가 최소 인원 미만 (400) */
  | 'TOO_FEW_MEMBERS'
  | 'MEMBER_NOT_FOUND'
  | 'INVALID_TITLE'
  | 'PAYMENT_NOT_FOUND'
  | 'PAYMENT_ALREADY_ASSIGNED'
  | 'INVALID_PAYMENT_SELECTION'
  | 'PAYMENT_GROUP_REQUIRED'
  | 'INVALID_SHARE_MEMBERS'
  | 'INVALID_SHARE_AMOUNT'
  | 'UNBALANCED_PAYMENT_SHARE'
  | 'INVALID_PAYMENT_AMOUNT'
  | 'INVALID_CURRENCY'
  | 'NO_PAYMENT_TO_REGISTER'
  | 'GROUP_NOT_FOUND'
  | 'ALL_GROUP_IMMUTABLE'
  | 'INVALID_GROUP_MEMBER_COUNT'
  | 'SETTLEMENT_VALIDATION_FAILED'
  | 'SETTLEMENT_NOT_FOUND'
  /** 네트워크 단절 · 타임아웃 */
  | 'NETWORK_ERROR'
  /** 5xx 또는 분류되지 않은 실패 */
  | 'UNKNOWN_ERROR';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | undefined;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** 서버가 내려주는 에러 응답 바디. */
export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
}
