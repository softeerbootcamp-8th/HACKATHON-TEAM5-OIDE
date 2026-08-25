/**
 * 결제 내역 목 데이터.
 *
 * 와이어프레임의 더미 세트를 그대로 쓴다.
 * 스크린샷 1장에서 여러 건이 나뉘는 상황과, 필드를 못 읽은 상황을 함께 보여준다.
 */

import type { ParsedPaymentDraft } from '../types/payment';

/** 파싱 결과 1장당 나오는 초안. 업로드 순서대로 소비한다. */
const DRAFT_TEMPLATES: Omit<ParsedPaymentDraft, 'id' | 'receiptImageId'>[][] = [
  // 1장째 — 3건이 한 장에 들어 있다
  [
    { merchant: '이치란 라멘', paidAt: dayAt(21, 20, 14), amount: '3200', currency: 'JPY' },
    { merchant: 'セブンイレブン 渋谷', paidAt: dayAt(21, 18, 2), amount: '1430', currency: 'JPY' },
    { merchant: 'Osaka Metro', paidAt: dayAt(21, 17, 40), amount: '880', currency: 'JPY' },
  ],
  // 2장째 — 2건, 그중 하나는 금액을 못 읽었다
  [
    { merchant: '호텔 그란비아', paidAt: dayAt(20, 15, 0), amount: '28000', currency: 'JPY' },
    { merchant: '스타벅스 난바', paidAt: dayAt(20, 11, 30), amount: null, currency: 'JPY' },
  ],
  // 3장째 — 통화를 못 읽었다
  [{ merchant: '돈키호테', paidAt: dayAt(20, 9, 15), amount: '5400', currency: null }],
];

/** 이번 달 지정한 일자의 시각을 ISO 로 만든다. */
function dayAt(day: number, hour: number, minute: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, hour, minute).toISOString();
}

/**
 * n 장째 스크린샷에서 나오는 초안 목록.
 * 템플릿보다 많이 올리면 순환해서 재사용한다.
 */
export function draftsForImage(
  imageIndex: number,
  imageId: string,
): ParsedPaymentDraft[] {
  const template = DRAFT_TEMPLATES[imageIndex % DRAFT_TEMPLATES.length];
  return template.map((draft, index) => ({
    ...draft,
    id: `${imageId}-d${index + 1}`,
    receiptImageId: imageId,
  }));
}
