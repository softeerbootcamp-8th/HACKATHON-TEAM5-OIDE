/**
 * 화면 표시용 포맷터.
 * 와이어프레임의 표기(`21일 금요일`, `20:14 · JPY`, `3,200`)를 그대로 재현한다.
 */

import { findCurrency } from '../constants/currencies';
import type { CurrencyCode } from '../types/room';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/** 날짜 섹션 헤더. 예: `21일 금요일` */
export function formatDateSection(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()}일 ${WEEKDAYS[date.getDay()]}`;
}

/** 같은 날짜끼리 묶기 위한 키. */
export function toDateKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** 시:분. 예: `20:14` */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 일 + 시:분. 예: `21일 20:14` */
export function formatDayTime(iso: string): string {
  return `${new Date(iso).getDate()}일 ${formatTime(iso)}`;
}

/** 항목 수정 화면의 입력값. 예: `2026-08-21 20:14` */
export function formatDateTimeInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `2026-08-21 20:14` 형태를 ISO 로 되돌린다. 형식이 틀리면 null. */
export function parseDateTimeInput(value: string): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** 천 단위 구분. 통화의 소수 자릿수를 따른다. 예: `3,200` */
export function formatAmount(amount: string, currency: CurrencyCode): string {
  const digits = findCurrency(currency).fractionDigits;
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return amount;
  return numeric.toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function sumAmountsByCurrency(
  items: { amount: string; currency: CurrencyCode }[],
): { currency: CurrencyCode; amount: number }[] {
  const totals = new Map<CurrencyCode, number>();
  for (const item of items) {
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + Number(item.amount));
  }
  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}

/** 입력 중인 금액 문자열에서 숫자와 소수점만 남긴다. */
export function sanitizeAmountInput(value: string, fractionDigits: number): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (fractionDigits === 0) return whole;
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, fractionDigits)}`;
}
