import { findCurrency } from '../constants/currencies';
import type { CurrencyCode } from '../types/room';

/** 원화 표기. 소수점을 쓰지 않는다 (FR-04). */
export function formatKrw(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

/** 환율 기준 시각. 예: `2026-08-25 14:32 기준` */
export function formatQuotedAt(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())} 기준`;
}

/** 환율 한 줄. 예: `1엔 = 9.31원` */
export function formatRateLine(currency: CurrencyCode, rateToKrw: string): string {
  return `1${findCurrency(currency).unit} = ${Number(rateToKrw).toLocaleString('ko-KR')}원`;
}

