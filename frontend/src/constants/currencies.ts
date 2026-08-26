/**
 * 지원 통화 목록. 직접 입력·항목 수정 화면의 셀렉터가 참조한다.
 *
 * 백엔드 `SupportedCurrency` enum (= `GET /api/currencies` 응답) 을 그대로 옮긴 것이다.
 * 여기에만 있는 코드로 등록하면 서버가 INVALID_CURRENCY 로 거절하고,
 * 서버에만 있는 코드는 화면에서 고를 수 없다. enum 이 바뀌면 이 파일도 함께 고친다.
 *
 * 선언 순서가 통화 선택 화면의 노출 순서이며, 기준 통화인 KRW 가 가장 위에 온다.
 */

import type { CurrencyCode } from '../types/room';

export interface CurrencyOption {
  code: CurrencyCode;
  /** 셀렉터에 보이는 이름 (예: `JPY (엔)`). */
  label: string;
  /** 통화 이름 (예: `일본 엔`). 환율 화면에서 코드와 함께 보여준다. */
  name: string;
  /** 금액 뒤에 붙는 단위 (예: `엔`). `1엔 = 9.31원` 같은 문장에 쓴다. 백엔드 koreanName. */
  unit: string;
  /** 소수점 자릿수. 백엔드 minorUnit. KRW·JPY·VND 는 정수, 나머지는 센트 단위. */
  fractionDigits: number;
}

/** 백엔드 enum 과 한 줄씩 대응한다. label 은 코드와 단위에서 만든다. */
const CURRENCY_SPECS: Omit<CurrencyOption, 'label'>[] = [
  { code: 'KRW', name: '대한민국 원', unit: '원', fractionDigits: 0 },
  { code: 'JPY', name: '일본 엔', unit: '엔', fractionDigits: 0 },
  { code: 'VND', name: '베트남 동', unit: '동', fractionDigits: 0 },
  { code: 'CNY', name: '중국 위안', unit: '위안', fractionDigits: 2 },
  { code: 'USD', name: '미국 달러', unit: '달러', fractionDigits: 2 },
  { code: 'EUR', name: '유로', unit: '유로', fractionDigits: 2 },
  { code: 'THB', name: '태국 바트', unit: '바트', fractionDigits: 2 },
  { code: 'PHP', name: '필리핀 페소', unit: '페소', fractionDigits: 2 },
  { code: 'TWD', name: '대만 달러', unit: '대만달러', fractionDigits: 2 },
  { code: 'HKD', name: '홍콩 달러', unit: '홍콩달러', fractionDigits: 2 },
  { code: 'SGD', name: '싱가포르 달러', unit: '싱가포르달러', fractionDigits: 2 },
  { code: 'IDR', name: '인도네시아 루피아', unit: '루피아', fractionDigits: 2 },
  { code: 'MYR', name: '말레이시아 링깃', unit: '링깃', fractionDigits: 2 },
  { code: 'AUD', name: '호주 달러', unit: '호주달러', fractionDigits: 2 },
  { code: 'GBP', name: '영국 파운드', unit: '파운드', fractionDigits: 2 },
  { code: 'TRY', name: '튀르키예 리라', unit: '리라', fractionDigits: 2 },
  { code: 'AED', name: '아랍에미리트 디르함', unit: '디르함', fractionDigits: 2 },
  { code: 'CHF', name: '스위스 프랑', unit: '스위스프랑', fractionDigits: 2 },
  { code: 'MNT', name: '몽골 투그릭', unit: '투그릭', fractionDigits: 2 },
  { code: 'CAD', name: '캐나다 달러', unit: '캐나다달러', fractionDigits: 2 },
  { code: 'INR', name: '인도 루피', unit: '루피', fractionDigits: 2 },
];

export const CURRENCY_OPTIONS: CurrencyOption[] = CURRENCY_SPECS.map((spec) => ({
  ...spec,
  label: `${spec.code} (${spec.unit})`,
}));

export function findCurrency(code: CurrencyCode): CurrencyOption {
  const found = CURRENCY_OPTIONS.find((option) => option.code === code);
  if (!found) {
    throw new Error(`알 수 없는 통화입니다: ${code}`);
  }
  return found;
}
