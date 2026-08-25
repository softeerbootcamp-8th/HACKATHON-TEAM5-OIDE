/**
 * 분담 그룹 조회 · 생성 · 수정 · 삭제와, 그룹에 담을 결제 항목 지정.
 *
 * 분담은 `그룹을 만든다 → 그 그룹이 낼 항목을 고른다` 순서다.
 * 한 결제 항목은 한 그룹에만 속한다.
 */

import { USE_MOCK } from '../api/apiConfig';
import { httpClient } from '../api/httpClient';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { mockPaymentStore } from '../mocks/mockPaymentStore';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { mockSplitGroupStore } from '../mocks/mockSplitGroupStore';
import { ApiError } from '../types/api';
import type { Payment, SplitGroup } from '../types/payment';

function requireRoom(shareCode: string) {
  const room = mockRoomStore.findByShareCode(shareCode);
  if (!room) {
    throw new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404);
  }
  return room;
}

/** 방의 분담 그룹 목록. `전체` 그룹이 항상 첫 번째로 온다. */
export async function getSplitGroups(shareCode: string): Promise<SplitGroup[]> {
  if (USE_MOCK) {
    try {
      const room = requireRoom(shareCode);
      return mockDelay(mockSplitGroupStore.findByRoom(room.id, room.members));
    } catch (error) {
      return mockDelayReject(error as ApiError);
    }
  }

  return httpClient.get<SplitGroup[]>(`/rooms/${shareCode}/split-groups`);
}

/** 참여자 조합으로 새 그룹을 만든다. 이름은 닉네임 나열로 자동 생성된다. */
export async function createSplitGroup(
  shareCode: string,
  memberIds: string[],
): Promise<SplitGroup> {
  if (USE_MOCK) {
    try {
      const room = requireRoom(shareCode);
      const members = room.members.filter((member) => memberIds.includes(member.id));
      return mockDelay(mockSplitGroupStore.create(room.id, members));
    } catch (error) {
      return mockDelayReject(error as ApiError);
    }
  }

  return httpClient.post<SplitGroup>(`/rooms/${shareCode}/split-groups`, { memberIds });
}

/** 그룹 인원을 바꾼다. 이름도 새 조합으로 다시 만들어진다. */
export async function updateSplitGroup(
  shareCode: string,
  groupId: string,
  memberIds: string[],
): Promise<SplitGroup> {
  if (USE_MOCK) {
    try {
      const room = requireRoom(shareCode);
      const members = room.members.filter((member) => memberIds.includes(member.id));
      return mockDelay(mockSplitGroupStore.update(groupId, members));
    } catch (error) {
      return mockDelayReject(error as ApiError);
    }
  }

  return httpClient.patch<SplitGroup>(`/rooms/${shareCode}/split-groups/${groupId}`, {
    memberIds,
  });
}

/** 그룹을 지운다. 담겨 있던 항목은 미분류로 돌아간다. */
export async function deleteSplitGroup(shareCode: string, groupId: string): Promise<void> {
  if (USE_MOCK) {
    try {
      requireRoom(shareCode);
      mockPaymentStore.releaseGroup(groupId);
      mockSplitGroupStore.remove(groupId);
      return mockDelay(undefined);
    } catch (error) {
      return mockDelayReject(error as ApiError);
    }
  }

  return httpClient.delete<void>(`/rooms/${shareCode}/split-groups/${groupId}`);
}

/** 그룹이 낼 항목을 확정한다. 목록에서 빠진 항목은 그룹에서 빠진다. */
export async function assignPaymentsToGroup(
  shareCode: string,
  groupId: string,
  paymentIds: string[],
): Promise<Payment[]> {
  if (USE_MOCK) {
    try {
      const room = requireRoom(shareCode);
      return mockDelay(mockPaymentStore.assignToGroup(room.id, groupId, paymentIds));
    } catch (error) {
      return mockDelayReject(error as ApiError);
    }
  }

  return httpClient.put<Payment[]>(
    `/rooms/${shareCode}/split-groups/${groupId}/payments`,
    { paymentIds },
  );
}
