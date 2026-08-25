/**
 * 참여자 조회.
 *
 * 방 조회 응답에 members 가 포함되지만, 참여자만 다시 읽어야 하는 화면을 위해
 * 별도 엔드포인트를 계약에 두고 서비스로도 노출한다.
 */

import { USE_MOCK } from '../api/apiConfig';
import { httpClient } from '../api/httpClient';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { ApiError } from '../types/api';
import type { MemberPaymentSummary } from '../types/payment';
import type { RoomMember } from '../types/room';

/** 방에 등록된 참여자 목록. displayOrder 오름차순. */
export async function getRoomMembers(shareCode: string): Promise<RoomMember[]> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(
        new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404),
      );
    }
    return mockDelay(room.members);
  }

  return httpClient.get<RoomMember[]>(`/rooms/${shareCode}/members`);
}

/**
 * 참여자별 결제 내역 등록 요약. B-01 의 "내역 있음" 판정에 쓰인다.
 * 결제 내역 등록(flow #2)이 붙기 전까지는 조회 전용이다.
 */
export async function getMemberPaymentSummaries(
  shareCode: string,
): Promise<MemberPaymentSummary[]> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(
        new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404),
      );
    }
    return mockDelay(mockRoomStore.findPaymentSummaries(room.id));
  }

  return httpClient.get<MemberPaymentSummary[]>(
    `/rooms/${shareCode}/member-payment-summaries`,
  );
}
