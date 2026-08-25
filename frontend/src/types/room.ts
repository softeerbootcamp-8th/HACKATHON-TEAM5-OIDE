/**
 * 정산방 · 참여자 도메인 타입.
 *
 * DB(ERD)는 snake_case / bigint 이지만 API 와 프론트 타입은 camelCase 를 쓰고,
 * bigint 는 JS number 안전범위(2^53-1)를 넘을 수 있으므로 id 는 모두 string 으로 다룬다.
 */

/** ISO-8601 문자열 (예: "2026-08-25T14:32:00Z"). */
export type IsoDateTime = string;

/** ISO-4217 통화 코드. 서비스가 다루는 범위만 좁혀둔다. */
export type CurrencyCode = 'KRW' | 'JPY' | 'USD' | 'EUR';

/** SETTLEMENT_ROOM */
export interface SettlementRoom {
  id: string;
  /** 공유 링크에 쓰이는 코드. URL 파라미터의 원본. */
  shareCode: string;
  /** 방 이름. 모든 참여자에게 표시된다. */
  title: string;
  defaultCurrency: CurrencyCode;
  createdAt: IsoDateTime;
  /**
   * 방이 사라지는 시각 (생성 + 7일).
   * ERD 에 없는 파생 필드 — docs/api-contract.md 의 보완 제안 참고.
   */
  expiresAt: IsoDateTime;
  /** 방에 등록된 참여자. displayOrder 오름차순. */
  members: RoomMember[];
}

/** ROOM_MEMBER */
export interface RoomMember {
  id: string;
  roomId: string;
  nickname: string;
  /** 방 생성 시 입력된 순서. 0 번이 방을 만든 사람이다. */
  displayOrder: number;
  createdAt: IsoDateTime;
}

/** POST /rooms 요청 바디. */
export interface CreateRoomRequest {
  title: string;
  defaultCurrency: CurrencyCode;
  members: CreateRoomMemberInput[];
}

export interface CreateRoomMemberInput {
  nickname: string;
  displayOrder: number;
}
