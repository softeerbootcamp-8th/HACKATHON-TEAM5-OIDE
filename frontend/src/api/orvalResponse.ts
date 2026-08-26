import type { ErrorResponse } from './generated/models';
import { ApiError, type ApiErrorCode } from '../types/api';

interface OrvalResponse {
  data: unknown;
  status: number;
}

const SERVER_ERROR_CODES: Record<string, ApiErrorCode> = {
  COMMON_001: 'UNKNOWN_ERROR',
  COMMON_002: 'UNKNOWN_ERROR',
  ROOM_001: 'ROOM_NOT_FOUND',
  ROOM_002: 'MEMBER_NOT_FOUND',
  ROOM_003: 'ROOM_EXPIRED',
  ROOM_004: 'INVALID_TITLE',
  ROOM_005: 'TOO_FEW_MEMBERS',
  ROOM_006: 'INVALID_NICKNAME',
  ROOM_007: 'DUPLICATE_NICKNAME',
  PAYMENT_001: 'PAYMENT_NOT_FOUND',
  PAYMENT_002: 'PAYMENT_ALREADY_ASSIGNED',
  PAYMENT_003: 'INVALID_PAYMENT_SELECTION',
  PAYMENT_004: 'PAYMENT_GROUP_REQUIRED',
  PAYMENT_005: 'INVALID_SHARE_MEMBERS',
  PAYMENT_006: 'INVALID_SHARE_AMOUNT',
  PAYMENT_007: 'UNBALANCED_PAYMENT_SHARE',
  PAYMENT_008: 'INVALID_PAYMENT_AMOUNT',
  PAYMENT_009: 'INVALID_CURRENCY',
  PAYMENT_010: 'NO_PAYMENT_TO_REGISTER',
  GROUP_001: 'GROUP_NOT_FOUND',
  GROUP_002: 'ALL_GROUP_IMMUTABLE',
  GROUP_003: 'INVALID_GROUP_MEMBER_COUNT',
  GROUP_004: 'DUPLICATE_GROUP_MEMBERS',
  SETTLEMENT_001: 'SETTLEMENT_VALIDATION_FAILED',
  SETTLEMENT_002: 'SETTLEMENT_NOT_FOUND',
};

function fallbackCodeForStatus(status: number): ApiErrorCode {
  if (status === 404) return 'ROOM_NOT_FOUND';
  if (status === 410) return 'ROOM_EXPIRED';
  return 'UNKNOWN_ERROR';
}

function toApiError(response: OrvalResponse): ApiError {
  const error = response.data as ErrorResponse;
  const code = error.code
    ? (SERVER_ERROR_CODES[error.code] ?? fallbackCodeForStatus(response.status))
    : fallbackCodeForStatus(response.status);
  const message = error.message ?? `요청을 처리하지 못했어요. (${response.status})`;
  return new ApiError(code, message, response.status);
}

export async function callOrval<T>(request: () => Promise<OrvalResponse>): Promise<T> {
  let response: OrvalResponse;

  try {
    response = await request();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        'NETWORK_ERROR',
        '연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.',
      );
    }

    throw new ApiError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw toApiError(response);
  }

  return response.data as T;
}

export function parseApiId(id: string): number {
  const parsedId = Number(id);
  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
    throw new ApiError('UNKNOWN_ERROR', `유효하지 않은 API ID예요: ${id}`);
  }
  return parsedId;
}
