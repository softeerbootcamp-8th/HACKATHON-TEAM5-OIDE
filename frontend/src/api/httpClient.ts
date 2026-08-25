/**
 * fetch 얇은 래퍼.
 *
 * - 모든 실패를 ApiError 로 정규화한다. 화면은 Response/TypeError 를 볼 일이 없다.
 * - 서비스 계층에서만 호출하고 컴포넌트에서 직접 쓰지 않는다.
 */

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './apiConfig';
import { ApiError, type ApiErrorCode, type ApiErrorResponse } from '../types/api';

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

  const code = body?.code ?? fallbackCodeForStatus(response.status);
  const message = body?.message ?? `요청을 처리하지 못했어요. (${response.status})`;
  return new ApiError(code, message, response.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
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
