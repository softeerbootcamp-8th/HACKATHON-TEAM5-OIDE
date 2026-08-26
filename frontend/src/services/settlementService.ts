/**
 * 환율 조회 · 최종 정산.
 *
 * 환율은 방을 개설한 시점으로 고정되어 모든 참여자에게 똑같이 적용된다.
 * 참여자가 직접 입력하면 그 값이 우선하고 방 전원에게 적용된다 (FR-04).
 */

import { USE_MOCK } from '../api/apiConfig';
import { httpClient } from '../api/httpClient';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { buildSeedRates } from '../mocks/mockRates';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { mockSettlementStore } from '../mocks/mockSettlementStore';
import { ApiError } from '../types/api';
import type { SettlementRate } from '../types/settlement';

export interface RoomRates {
  rates: SettlementRate[];
  /** 직접 입력한 환율이면 누가 바꿨는지. 자동 환율이면 null. */
  editedByNickname: string | null;
}

/** 방에 적용되는 통화별 환율. */
export async function getRoomRates(shareCode: string): Promise<RoomRates> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    if (!room.createdAt) {
      return mockDelayReject(new ApiError('UNKNOWN_ERROR', '정산방 생성 시각이 없어요.'));
    }

    const rates = buildSeedRates(room.createdAt);
    const manual = mockSettlementStore.findManualRate(room.id);
    if (!manual) return mockDelay({ rates, editedByNickname: null });

    return mockDelay({
      rates: rates.map((rate) =>
        rate.currency === manual.currency
          ? { ...rate, rateToKrw: manual.rateToKrw, rateSource: 'MANUAL' as const }
          : rate,
      ),
      editedByNickname: manual.editedByNickname,
    });
  }

  return httpClient.get<RoomRates>(`/rooms/${shareCode}/rates`);
}

/** 환율을 직접 지정한다. 방 전원에게 적용된다. */
export async function setManualRate(
  shareCode: string,
  currency: string,
  rateToKrw: string,
  editedByNickname: string,
): Promise<RoomRates> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    mockSettlementStore.setManualRate(room.id, { currency, rateToKrw, editedByNickname });
    return getRoomRates(shareCode);
  }

  return httpClient.put<RoomRates>(`/rooms/${shareCode}/rates`, { currency, rateToKrw });
}

/** 직접 입력한 환율을 지우고 자동 환율로 되돌린다. */
export async function clearManualRate(shareCode: string): Promise<RoomRates> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    mockSettlementStore.setManualRate(room.id, null);
    return getRoomRates(shareCode);
  }

  return httpClient.delete<RoomRates>(`/rooms/${shareCode}/rates`);
}

/** 자기 정산을 끝낸 참여자들. 전원이 끝나야 최종 정산을 볼 수 있다. */
export async function getSettlementProgress(shareCode: string): Promise<string[]> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    return mockDelay(mockSettlementStore.findDoneMemberIds(room.id), 150);
  }

  return httpClient.get<string[]>(`/rooms/${shareCode}/settlement/progress`);
}

/** 내 정산을 확정한다. */
export async function completeMySettlement(
  shareCode: string,
  memberId: string,
): Promise<string[]> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    return mockDelay(mockSettlementStore.markDone(room.id, memberId));
  }

  return httpClient.post<string[]>(`/rooms/${shareCode}/settlement/complete`, { memberId });
}
