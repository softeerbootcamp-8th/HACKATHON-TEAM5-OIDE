/**
 * fetch 얇은 래퍼.
 *
 * - 모든 실패를 ApiError 로 정규화한다. 화면은 Response/TypeError 를 볼 일이 없다.
 * - 서비스 계층에서만 호출하고 컴포넌트에서 직접 쓰지 않는다.
 */

import { API_BASE_URL, REQUEST_TIMEOUT_MS, UPLOAD_REQUEST_TIMEOUT_MS } from './apiConfig';
import { ApiError, type ApiErrorCode, type ApiErrorResponse } from '../types/api';

const SERVER_ERROR_CODES: Record<string, ApiErrorCode> = {
  ROOM_001: 'ROOM_NOT_FOUND',
  ROOM_003: 'ROOM_EXPIRED',
  ROOM_006: 'INVALID_NICKNAME',
  ROOM_007: 'DUPLICATE_NICKNAME',
  ROOM_005: 'TOO_FEW_MEMBERS',
  PAYMENT_008: 'INVALID_PAYMENT_AMOUNT',
  PAYMENT_009: 'INVALID_CURRENCY',
  PAYMENT_010: 'NO_PAYMENT_TO_REGISTER',
  PAYMENT_011: 'NO_SCREENSHOT_UPLOADED',
  PAYMENT_012: 'TOO_MANY_SCREENSHOTS',
  PAYMENT_013: 'UNSUPPORTED_IMAGE_TYPE',
  PAYMENT_014: 'SCREENSHOT_TOO_LARGE',
  PAYMENT_015: 'EXTRACTION_JOB_NOT_FOUND',
};

/** HTTP 상태코드 → 에러 코드 폴백. 서버가 code 를 안 줄 때만 쓴다. */
function fallbackCodeForStatus(status: number): ApiErrorCode {
  if (status === 404) return 'ROOM_NOT_FOUND';
  if (status === 410) return 'ROOM_EXPIRED';
  return 'UNKNOWN_ERROR';
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorResponse> | null = null;
  try {
    body = (await response.json()) as Partial<ApiErrorResponse>;
  } catch {
    // 에러 응답이 JSON 이 아닐 수 있다. 상태코드만으로 판단한다.
  }

  const code = body?.code
    ? (SERVER_ERROR_CODES[body.code] ?? 'UNKNOWN_ERROR')
    : fallbackCodeForStatus(response.status);
  const message = body?.message ?? `요청을 처리하지 못했어요. (${response.status})`;
  return new ApiError(code, message, response.status);
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      '연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.',
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const httpClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  },

  /** multipart boundary는 브라우저가 지정하므로 Content-Type을 직접 넣지 않는다. */
  postForm<T>(path: string, body: FormData): Promise<T> {
    return request<T>(path, { method: 'POST', body }, UPLOAD_REQUEST_TIMEOUT_MS);
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
