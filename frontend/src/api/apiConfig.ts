/**
 * 환경변수 기반 API 설정.
 * import.meta.env 를 읽는 곳은 이 파일 하나로 제한한다.
 */

/** 백엔드 베이스 URL. 끝의 슬래시는 제거한다. */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL ?? '/api'
).replace(/\/+$/, '');

export const API_ORIGIN: string = API_BASE_URL.startsWith('http')
  ? new URL(API_BASE_URL).origin
  : '';

/** true 이면 서비스 계층이 src/mocks 의 목데이터로 응답한다. */
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK === 'true';

// VITE_USE_MOCK 을 빼먹은 채 배포하면 존재하지 않는 /api 로 요청이 나가 404 만 보인다.
// 원인을 찾기 어려운 실수라 콘솔에 남겨둔다.
if (import.meta.env.VITE_USE_MOCK === undefined) {
  console.warn(
    '[config] VITE_USE_MOCK 이 설정되지 않아 실제 API 를 호출합니다. ' +
      `요청은 ${API_BASE_URL} 로 나갑니다. 목데이터로 띄우려면 VITE_USE_MOCK=true 를 설정하세요.`,
  );
}

/**
 * 공유 링크에 표시할 origin.
 * 비어 있으면 현재 접속한 origin 을 쓴다 (SSR 이 없으므로 window 를 바로 참조).
 */
export const SHARE_LINK_ORIGIN: string =
  import.meta.env.VITE_SHARE_LINK_ORIGIN || window.location.origin;

/** 네트워크 요청 타임아웃(ms). */
export const REQUEST_TIMEOUT_MS = 10_000;

/** 최대 200MB multipart 업로드는 일반 JSON 요청보다 오래 기다린다. */
export const UPLOAD_REQUEST_TIMEOUT_MS = 5 * 60 * 1_000;
