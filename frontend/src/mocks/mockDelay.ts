/**
 * 목 응답에 지연을 넣어 로딩 상태를 실제로 확인할 수 있게 한다.
 */

const DEFAULT_DELAY_MS = 400;

export function mockDelay<T>(value: T, ms = DEFAULT_DELAY_MS): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

export function mockDelayReject(error: Error, ms = DEFAULT_DELAY_MS): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(error), ms);
  });
}
