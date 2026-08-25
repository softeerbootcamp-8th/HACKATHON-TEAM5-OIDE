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
  /** 업로드할 스크린샷이 없음 */
  | 'NO_SCREENSHOT_UPLOADED'
  /** 한 번에 올릴 수 있는 스크린샷 수를 초과함 */
  | 'TOO_MANY_SCREENSHOTS'
  /** 서버가 지원하지 않는 이미지 형식 */
  | 'UNSUPPORTED_IMAGE_TYPE'
  /** 스크린샷 한 장의 크기 제한을 초과함 */
  | 'SCREENSHOT_TOO_LARGE'
  /** 폴링할 추출 작업을 찾을 수 없음 */
  | 'EXTRACTION_JOB_NOT_FOUND'
  /** 등록할 결제 내역이 없음 */
  | 'NO_PAYMENT_TO_REGISTER'
  /** 결제 금액이 유효하지 않음 */
  | 'INVALID_PAYMENT_AMOUNT'
  /** 통화 코드가 유효하지 않음 */
  | 'INVALID_CURRENCY'
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
  /** 백엔드의 숫자형 도메인 코드(예: ROOM_003)를 그대로 받는다. */
  code: string;
  message: string;
}
