/**
 * 비동기 조회의 loading / error / data 상태를 한곳에서 다룬다.
 *
 * 화면마다 useState 세 개를 반복하지 않기 위한 최소한의 훅이다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isApiError } from '../types/api';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: ApiError | null;
  /** 같은 요청을 다시 실행한다. 오류 화면의 "다시 시도" 에 연결한다. */
  retry: () => void;
}

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  return new ApiError(
    'UNKNOWN_ERROR',
    error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
  );
}

/**
 * @param asyncFn 실행할 비동기 함수. 의존성이 바뀌면 다시 실행된다.
 * @param deps asyncFn 이 참조하는 값들
 */
export function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  // 언마운트 후 setState 를 막기 위한 플래그.
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    asyncFnRef
      .current()
      .then((result) => {
        if (cancelled || !activeRef.current) return;
        setData(result);
        setStatus('success');
      })
      .catch((caught: unknown) => {
        if (cancelled || !activeRef.current) return;
        setError(toApiError(caught));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // asyncFn 은 ref 로 최신값을 유지하므로 deps 만 추적한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { status, data, error, retry };
}
