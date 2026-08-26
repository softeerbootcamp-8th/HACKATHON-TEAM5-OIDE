/**
 * 목 정산방 시드 데이터.
 *
 * 와이어프레임의 더미 데이터를 그대로 쓴다 — 오사카 여행 / 준영·민서·하늘·지우.
 */

import { ROOM_TTL_DAYS } from '../constants/roomRules';
import type { MemberPaymentSummary } from '../types/payment';
import type { RoomMember, SettlementRoom } from '../types/room';

/** 링크 진입(A-06) 을 바로 확인할 수 있는 기본 방. */
export const SEED_SHARE_CODE = '8fj2kd';

/** 만료 화면(A-08) 을 확인하기 위한 방. */
export const EXPIRED_SHARE_CODE = 'expired';

function daysFrom(base: Date, days: number): string {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function buildMembers(roomId: string, nicknames: string[], createdAt: string): RoomMember[] {
  return nicknames.map((nickname, index) => ({
    id: `${roomId}-m${index + 1}`,
    roomId,
    nickname,
    displayOrder: index,
    createdAt,
  }));
}

function buildRoom(params: {
  id: string;
  shareCode: string;
  title: string;
  nicknames: string[];
  createdAt: Date;
}): SettlementRoom {
  const createdAt = params.createdAt.toISOString();
  return {
    id: params.id,
    shareCode: params.shareCode,
    title: params.title,
    defaultCurrency: 'JPY',
    createdAt,
    expiresAt: daysFrom(params.createdAt, ROOM_TTL_DAYS),
    members: buildMembers(params.id, params.nicknames, createdAt),
  };
}

const now = new Date();

/** 정상 상태의 방. 2일 전에 만들어져 5일 남았다. */
export const seedRoom: SettlementRoom = buildRoom({
  id: 'room-1',
  shareCode: SEED_SHARE_CODE,
  title: '오사카 여행',
  nicknames: ['준영', '민서', '하늘', '지우'],
  createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
});

/** 8일 전에 만들어져 이미 만료된 방. */
export const expiredRoom: SettlementRoom = buildRoom({
  id: 'room-expired',
  shareCode: EXPIRED_SHARE_CODE,
  title: '도쿄 여행',
  nicknames: ['준영', '민서', '하늘'],
  createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
});

export const SEED_ROOMS: SettlementRoom[] = [seedRoom, expiredRoom];

/**
 * 참여자별 결제 내역 등록 요약.
 * B-01 의 "내역 있음" 변형을 보여주기 위해 준영만 등록한 상태로 둔다.
 */
export const SEED_PAYMENT_SUMMARIES: Record<string, MemberPaymentSummary[]> = {
  [seedRoom.id]: [
    { memberId: 'room-1-m1', nickname: '준영', paymentCount: 5 },
  ],
};
