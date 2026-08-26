/** 결제 스크린샷 비동기 추출 API의 wire 타입. */

export type ExtractionStatus = 'RUNNING' | 'COMPLETED';

export type TransactionCategory = 'PAYMENT' | 'TRANSFER' | 'TOPUP' | 'INTEREST' | 'OTHER';

export type ReviewFlag =
  | 'YEAR_INFERRED'
  | 'DATE_MISSING'
  | 'TIME_MISSING'
  | 'MERCHANT_MISSING'
  | 'CURRENCY_DEFAULTED'
  | 'PARTIAL_ROW'
  | 'NOT_A_PAYMENT'
  | 'DUPLICATE_SUSPECTED';

export type ExtractionFailureReason = 'EXTRACTION_FAILED' | 'UNEXPECTED_ERROR';

export interface ExtractionStartResponse {
  jobId: string;
  totalImages: number;
}

export interface ExtractedPaymentResponse {
  id: string;
  imageIndex: number;
  sourceFilename: string;
  merchant: string | null;
  amount: number | string;
  currency: string;
  paidAt: string | null;
  category: TransactionCategory;
  selected: boolean;
  reviewFlags: ReviewFlag[];
}

export interface ImageFailureResponse {
  imageIndex: number;
  filename: string;
  reason: ExtractionFailureReason;
}

export interface ExtractionJobResponse {
  jobId: string;
  status: ExtractionStatus;
  totalImages: number;
  finishedImages: number;
  items: ExtractedPaymentResponse[];
  failures: ImageFailureResponse[];
}
