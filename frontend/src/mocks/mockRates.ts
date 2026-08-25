/**
 * 목 환율.
 *
 * 방을 개설한 시점의 환율을 모든 참여자에게 똑같이 적용한다.
 * 실제 서비스에서는 서버가 방마다 고정해 내려준다.
 */

import type { SettlementRate } from '../types/settlement';

/** 통화별 1단위당 원화. 와이어프레임의 `1엔 = 9.31원` 을 그대로 쓴다. */
export const SEED_RATES: Record<string, string> = {
  JPY: '9.31',
  USD: '1385.20',
  EUR: '1502.60',
};

export function buildSeedRates(roomCreatedAt: string): SettlementRate[] {
  return Object.entries(SEED_RATES).map(([currency, rate], index) => ({
    id: `rate-${index + 1}`,
    settlementId: 'mock-settlement',
    currency: currency as SettlementRate['currency'],
    rateToKrw: rate,
    rateSource: 'AUTO',
    effectiveDate: roomCreatedAt.slice(0, 10),
    quotedAt: roomCreatedAt,
  }));
}

