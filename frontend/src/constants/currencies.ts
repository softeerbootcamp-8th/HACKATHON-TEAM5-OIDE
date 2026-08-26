/**
 * 통화 목록. 직접 입력·항목 수정 화면의 셀렉터가 참조한다.
 */

import type { CurrencyCode } from '../types/room';

export interface CurrencyOption {
  code: CurrencyCode;
  /** 셀렉터에 보이는 이름 (예: `JPY (엔)`). */
  label: string;
  /** 통화 이름 (예: `일본 엔`). 환율 화면에서 코드와 함께 보여준다. */
  name: string;
  /** 금액 뒤에 붙는 단위 (예: `엔`). `1엔 = 9.31원` 같은 문장에 쓴다. */
  unit: string;
  /** 소수점 자릿수. JPY·KRW 는 정수, USD·EUR 는 센트 단위. */
  fractionDigits: number;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'JPY', label: 'JPY (엔)', name: '일본 엔', unit: '엔', fractionDigits: 0 },
  { code: 'KRW', label: 'KRW (원)', name: '대한민국 원', unit: '원', fractionDigits: 0 },
  { code: 'USD', label: 'USD (달러)', name: '미국 달러', unit: '달러', fractionDigits: 2 },
  { code: 'EUR', label: 'EUR (유로)', name: '유로', unit: '유로', fractionDigits: 2 },
];

export function findCurrency(code: CurrencyCode): CurrencyOption {
  const found = CURRENCY_OPTIONS.find((option) => option.code === code);
  if (!found) {
    throw new Error(`알 수 없는 통화입니다: ${code}`);
  }
  return found;
}

