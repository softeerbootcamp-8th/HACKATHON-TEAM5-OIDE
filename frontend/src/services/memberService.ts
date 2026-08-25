/**
 * 참여자 조회.
 *
 * 방 조회 응답의 members와 결제 목록을 화면이 쓰는 조회 형태로 정리한다.
 */

import { USE_MOCK } from '../api/apiConfig';
import { httpClient } from '../api/httpClient';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { ApiError } from '../types/api';
import type { MemberPaymentSummary } from '../types/payment';
import type { RoomMember } from '../types/room';
import { getPayments } from './paymentService';
import { getRoomByShareCode } from './roomService';

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

  // 백엔드는 별도 집계 API 없이 방 결제 전체를 제공한다. 화면에 필요한 모양은
  // 서비스 경계에서 만들어 페이지가 서버 DTO 차이를 알지 않게 한다.
  const [room, payments] = await Promise.all([
    getRoomByShareCode(shareCode),
    getPayments(shareCode),
  ]);
  const counts = new Map<string, number>();
  payments.forEach((payment) => {
    counts.set(payment.payerMemberId, (counts.get(payment.payerMemberId) ?? 0) + 1);
  });

  return room.members.flatMap((member) => {
    const memberId = String(member.id);
    const paymentCount = counts.get(memberId) ?? 0;
    return paymentCount > 0
      ? [{ memberId, nickname: member.nickname, paymentCount }]
      : [];
  });
}
