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

/** 날짜 선택 필드의 표기. 예: `2026-08-21` */
export function formatDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `2026-08-21` 을 Date 로 되돌린다. 형식이 틀리면 null. */
export function parseDateInput(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 날짜 선택값과 시·분 입력을 ISO 로 합친다.
 * 날짜가 없으면 시각 자체를 알 수 없으므로 null 이다. 시·분이 비어 있으면 00:00 으로 본다.
 */
export function toPaidAtIso(dateText: string, hour: string, minute: string): string | null {
  const date = parseDateInput(dateText);
  if (!date) return null;
  date.setHours(Number(hour || '0'), Number(minute || '0'), 0, 0);
  return date.toISOString();
}

/**
 * ISO 를 날짜 선택 · 시 · 분 입력값으로 쪼갠다. `toPaidAtIso` 의 반대 방향이다.
 * 시각을 모르는 내역은 모두 빈 문자열이 된다.
 */
export function splitPaidAtInput(iso: string | null): {
  date: string;
  hour: string;
  minute: string;
} {
  const empty = { date: '', hour: '', minute: '' };
  if (!iso) return empty;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return empty;

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: formatDateInput(parsed),
    hour: pad(parsed.getHours()),
    minute: pad(parsed.getMinutes()),
  };
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

/** 합계 줄에 통화를 몇 개까지 늘어놓을지. 넘으면 뒤를 `· ..` 로 줄인다. */
const MAX_SHOWN_CURRENCIES = 2;

/**
 * 통화별 합계를 한 줄로 만든다. 예: `KRW 255 · JPY 2,320 · ..`
 *
 * 통화가 세 개를 넘으면 카드나 하단 바가 두 줄로 늘어나므로 두 개까지만 보여준다.
 * 통화가 하나뿐이면 통화 코드 없이 금액만 두는 곳이 있어 `withSingleCurrencyCode` 로 가른다.
 * 합계가 없으면 빈 문자열이며, 무엇을 대신 보여줄지는 호출하는 쪽이 정한다.
 */
export function formatCurrencyTotals(
  totals: { currency: CurrencyCode; amount: number }[],
  { withSingleCurrencyCode = true }: { withSingleCurrencyCode?: boolean } = {},
): string {
  if (totals.length === 0) return '';

  const label = ({ currency, amount }: { currency: CurrencyCode; amount: number }) =>
    `${currency} ${formatAmount(String(amount), currency)}`;

  if (totals.length === 1) {
    const [only] = totals;
    return withSingleCurrencyCode ? label(only) : formatAmount(String(only.amount), only.currency);
  }

  const shown = totals.slice(0, MAX_SHOWN_CURRENCIES).map(label).join(' · ');
  return totals.length > MAX_SHOWN_CURRENCIES ? `${shown} · ..` : shown;
}

/** 입력 중인 금액 문자열에서 숫자와 소수점만 남긴다. */
export function sanitizeAmountInput(value: string, fractionDigits: number): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (fractionDigits === 0) return whole;
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, fractionDigits)}`;
}
