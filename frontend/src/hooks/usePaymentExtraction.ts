/** 스크린샷 추출 작업의 시작·진행률·완료·실패 상태를 화면에서 분리한다. */

import { useEffect, useRef, useState } from 'react';
import {
  extractPaymentScreenshots,
  type ExtractionScreenshot,
  type PaymentExtractionResult,
} from '../services/paymentExtractionService';
import { ApiError, isApiError } from '../types/api';

type PaymentExtractionStatus = 'idle' | 'running' | 'success' | 'error';

export interface PaymentExtractionState {
  status: PaymentExtractionStatus;
  finishedImages: number;
  totalImages: number;
  result: PaymentExtractionResult | null;
  error: ApiError | null;
}

export function usePaymentExtraction(
  shareCode: string,
  screenshots: ExtractionScreenshot[],
): PaymentExtractionState {
  const [status, setStatus] = useState<PaymentExtractionStatus>(
    screenshots.length > 0 ? 'running' : 'idle',
  );
  const [finishedImages, setFinishedImages] = useState(0);
  const [totalImages, setTotalImages] = useState(screenshots.length);
  const [result, setResult] = useState<PaymentExtractionResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);

  // StrictMode가 effect를 다시 실행해도 업로드 작업은 한 번만 시작한다.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (screenshots.length === 0 || startedRef.current) return;
    startedRef.current = true;

    void extractPaymentScreenshots(
      shareCode,
      screenshots,
      (finished, total) => {
        if (!mountedRef.current) return;
        setFinishedImages(finished);
        setTotalImages(total);
      },
      () => mountedRef.current,
    )
      .then((completed) => {
        if (!mountedRef.current) return;
        setResult(completed);
        setStatus('success');
      })
      .catch((caught: unknown) => {
        if (!mountedRef.current) return;
        setError(
          isApiError(caught)
            ? caught
            : new ApiError('UNKNOWN_ERROR', '스크린샷을 분석하지 못했어요.'),
        );
        setStatus('error');
      });
  }, [shareCode, screenshots]);

  return { status, finishedImages, totalImages, result, error };
}
