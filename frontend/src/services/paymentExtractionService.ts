/** 스크린샷 일괄 업로드와 비동기 추출 작업 폴링. */

import { USE_MOCK } from '../api/apiConfig';
import { httpClient } from '../api/httpClient';
import { CURRENCY_OPTIONS } from '../constants/currencies';
import { mockDelay } from '../mocks/mockDelay';
import { draftsForImage } from '../mocks/mockPayments';
import { ApiError } from '../types/api';
import type { ParsedPaymentDraft, ReceiptImage } from '../types/payment';
import type {
  ExtractionJobResponse,
  ExtractionStartResponse,
  ImageFailureResponse,
} from '../types/paymentExtraction';
import type { CurrencyCode } from '../types/room';
import { getRoomIdByShareCode } from './roomService';

const POLL_INTERVAL_MS = 700;
const EXTRACTION_TIMEOUT_MS = 5 * 60 * 1_000;

export interface ExtractionScreenshot {
  file: File;
  previewUrl: string;
}

export interface PaymentExtractionResult {
  images: ReceiptImage[];
  drafts: ParsedPaymentDraft[];
  failures: ImageFailureResponse[];
}

export type ExtractionProgressHandler = (finishedImages: number, totalImages: number) => void;
export type ExtractionActiveCheck = () => boolean;

/**
 * 화면에는 기존 초안 모델만 반환하고, job API와 폴링 방식은 이 서비스 안에 숨긴다.
 */
export async function extractPaymentScreenshots(
  shareCode: string,
  screenshots: ExtractionScreenshot[],
  onProgress: ExtractionProgressHandler,
  isActive: ExtractionActiveCheck = () => true,
): Promise<PaymentExtractionResult> {
  if (USE_MOCK) {
    return extractMockScreenshots(screenshots, onProgress, isActive);
  }

  const roomId = await getRoomIdByShareCode(shareCode);
  const started = await startExtraction(roomId, screenshots.map((item) => item.file));
  onProgress(0, started.totalImages);

  const completed = await pollUntilCompleted(started.jobId, onProgress, isActive);
  return toPaymentExtractionResult(completed, screenshots);
}

async function startExtraction(
  roomId: string,
  files: File[],
): Promise<ExtractionStartResponse> {
  const body = new FormData();
  files.forEach((file) => body.append('files', file));
  return httpClient.postForm<ExtractionStartResponse>(
    `/rooms/${roomId}/payments/extractions`,
    body,
  );
}

async function pollUntilCompleted(
  jobId: string,
  onProgress: ExtractionProgressHandler,
  isActive: ExtractionActiveCheck,
): Promise<ExtractionJobResponse> {
  const deadline = Date.now() + EXTRACTION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (!isActive()) {
      throw new ApiError('UNKNOWN_ERROR', '결제 내역 분석을 중단했어요.');
    }
    const job = await httpClient.get<ExtractionJobResponse>(`/extractions/${jobId}`);
    onProgress(job.finishedImages, job.totalImages);
    if (job.status === 'COMPLETED') return job;
    await delay(POLL_INTERVAL_MS);
  }

  throw new ApiError(
    'NETWORK_ERROR',
    '결제 내역 분석이 예상보다 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.',
  );
}

function toPaymentExtractionResult(
  job: ExtractionJobResponse,
  screenshots: ExtractionScreenshot[],
): PaymentExtractionResult {
  const extractedImageIndexes = new Set(job.items.map((item) => item.imageIndex));
  const images = screenshots
    .map((screenshot, imageIndex): ReceiptImage => ({
      id: imageId(imageIndex),
      url: screenshot.previewUrl,
      displayOrder: imageIndex,
    }))
    .filter((image) => extractedImageIndexes.has(image.displayOrder));

  const drafts = job.items
    .sort((left, right) => left.imageIndex - right.imageIndex)
    .map((item): ParsedPaymentDraft => ({
      id: item.id,
      receiptImageId: imageId(item.imageIndex),
      merchant: item.merchant,
      // 서버가 00:00으로 보정한 값은 기존 화면의 "시각 모름" 상태로 유지한다.
      paidAt: item.reviewFlags.includes('TIME_MISSING') ? null : item.paidAt,
      amount: String(item.amount),
      // 서버 기본 통화를 적용한 항목은 사용자가 기존 수정 화면에서 확인하게 한다.
      currency: item.reviewFlags.includes('CURRENCY_DEFAULTED')
        ? null
        : toCurrencyCode(item.currency),
      suggestedCurrency: toCurrencyCode(item.currency),
    }));

  return { images, drafts, failures: job.failures };
}

async function extractMockScreenshots(
  screenshots: ExtractionScreenshot[],
  onProgress: ExtractionProgressHandler,
  isActive: ExtractionActiveCheck,
): Promise<PaymentExtractionResult> {
  const images: ReceiptImage[] = [];
  const drafts: ParsedPaymentDraft[] = [];

  for (const [imageIndex, screenshot] of screenshots.entries()) {
    await mockDelay(undefined, 700);
    if (!isActive()) {
      throw new ApiError('UNKNOWN_ERROR', '결제 내역 분석을 중단했어요.');
    }
    const id = imageId(imageIndex);
    images.push({ id, url: screenshot.previewUrl, displayOrder: imageIndex });
    drafts.push(...draftsForImage(imageIndex, id));
    onProgress(imageIndex + 1, screenshots.length);
  }

  return { images, drafts, failures: [] };
}

function toCurrencyCode(currency: string): CurrencyCode | null {
  const normalized = currency.toUpperCase();
  return CURRENCY_OPTIONS.some((option) => option.code === normalized)
    ? (normalized as CurrencyCode)
    : null;
}

function imageId(imageIndex: number): string {
  return `image-${imageIndex}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
