/**
 * 최종 정산 도메인 타입.
 *
 * flow #4(환율 · 최종 정산) 에서 사용된다.
 * 이번 범위에서는 쓰이지 않지만 ERD 와 어긋나지 않도록 미리 확정해둔다.
 */

import type { CurrencyCode, IsoDateTime } from './room';

export type SettlementStatus =
  /** 아직 계산한 적 없음. */
  | 'NOT_STARTED'
  /** 계산 진행 중. */
  | 'IN_PROGRESS'
  /** 계산 완료. */
  | 'DONE'
  /** 계산 이후 결제 내역이 바뀌어 결과가 최신이 아님. */
  | 'OUTDATED';

/** SETTLEMENT_RATE.rate_source */
export type RateSource =
  /** 시스템이 조회한 환율. */
  | 'AUTO'
  /** 참여자가 직접 입력한 환율. 자동 환율보다 우선한다. */
  | 'MANUAL';

/** SETTLEMENT */
export interface Settlement {
  id: string;
  roomId: string;
  status: SettlementStatus;
  calculatedAt: IsoDateTime | null;
  updatedAt: IsoDateTime;
}

/** SETTLEMENT_RATE — 정산 시점에 고정된 통화별 환율. */
export interface SettlementRate {
  id: string;
  settlementId: string;
  currency: CurrencyCode;
  /** 해당 통화 1단위당 원화. */
  rateToKrw: string;
  rateSource: RateSource;
  effectiveDate: string;
  /** 환율 기준 시각. 화면에는 항상 환율과 함께 표시한다. */
  quotedAt: IsoDateTime;
}

/** SETTLEMENT_MEMBER_RESULT — 참여자별 정산 결과. 금액은 원 단위 정수. */
export interface SettlementMemberResult {
  id: string;
  settlementId: string;
  memberId: string;
  /** 내가 실제로 결제한 금액. */
  paidKrw: number;
  /** 내가 부담해야 하는 금액. */
  owedKrw: number;
}

/** SETTLEMENT_TRANSFER — 상계 후 최소 건수로 정리된 송금 1건. */
export interface SettlementTransfer {
  id: string;
  settlementId: string;
  senderMemberId: string;
  receiverMemberId: string;
  amountKrw: number;
}
