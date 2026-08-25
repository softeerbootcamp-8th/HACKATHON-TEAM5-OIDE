/**
 * 정산방 조회 · 생성.
 *
 * 화면은 이 함수들만 호출한다. 목/실제 분기는 여기에서만 일어나므로
 * 백엔드를 붙일 때는 VITE_USE_MOCK 만 false 로 바꾸면 된다.
 */

import { USE_MOCK } from '../api/apiConfig';
import { httpClient } from '../api/httpClient';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { ApiError } from '../types/api';
import type { CreateRoomRequest, SettlementRoom } from '../types/room';

function isExpired(room: SettlementRoom): boolean {
  return new Date(room.expiresAt).getTime() <= Date.now();
}

/** 공유 코드로 정산방을 조회한다. 만료된 방은 ROOM_EXPIRED 로 실패한다. */
export async function getRoomByShareCode(shareCode: string): Promise<SettlementRoom> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(
        new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404),
      );
    }
    if (isExpired(room)) {
      return mockDelayReject(
        new ApiError('ROOM_EXPIRED', '이 정산방은 사라졌어요.', 410),
      );
    }
    return mockDelay(room);
  }

  return httpClient.get<SettlementRoom>(`/rooms/${shareCode}`);
}

/** 정산방을 만든다. 성공하면 공유 코드가 담긴 방이 돌아온다. */
export async function createRoom(request: CreateRoomRequest): Promise<SettlementRoom> {
  if (USE_MOCK) {
    return mockDelay(mockRoomStore.create(request));
  }

  return httpClient.post<SettlementRoom>('/rooms', request);
}
