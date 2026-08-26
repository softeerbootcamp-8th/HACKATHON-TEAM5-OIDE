/**
 * 분담 그룹 조회 · 생성 · 수정 · 삭제와, 그룹에 담을 결제 항목 지정.
 *
 * 분담은 `그룹을 만든다 → 그 그룹이 낼 항목을 고른다` 순서다.
 * 한 결제 항목은 한 그룹에만 속한다.
 */

import { USE_MOCK } from '../api/apiConfig';
import {
  _delete as deleteGroup,
  create as createGroup,
  findAll as findAllGroups,
  findDetail as findGroupDetail,
  update as updateGroup,
  updatePayments as updateGroupPayments,
} from '../api/generated/client';
import type {
  GroupPaymentResponse,
  SplitGroupResponse,
} from '../api/generated/models';
import { callOrval, parseApiId } from '../api/orvalResponse';
import { resolveRoomId } from '../api/roomIdResolver';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { mockPaymentStore } from '../mocks/mockPaymentStore';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { mockSplitGroupStore } from '../mocks/mockSplitGroupStore';
import { ApiError } from '../types/api';
import type { Payment, SplitGroup } from '../types/payment';
import type { CurrencyCode } from '../types/room';

export interface SplitGroupPaymentSummary {
  id: string;
  payerMemberId: string;
  splitGroupId: string | null;
  merchant: string | null;
  paidAt: string | null;
  amount: string;
  currency: CurrencyCode;
  splitMethod: Payment['splitMethod'];
}

export interface SplitGroupOverview {
  groups: SplitGroup[];
  payments: SplitGroupPaymentSummary[];
}

function requireRoom(shareCode: string) {
  const room = mockRoomStore.findByShareCode(shareCode);
  if (!room) {
    throw new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404);
  }
  return room;
}

function mapSplitGroup(roomId: number, response: SplitGroupResponse): SplitGroup {
  if (
    response.id === undefined ||
    !response.name ||
    !response.type ||
    !response.members
  ) {
    throw new ApiError('UNKNOWN_ERROR', '그룹 응답 형식이 올바르지 않아요.');
  }

  const memberIds = response.members.map((member) => {
    if (member.id === undefined) {
      throw new ApiError('UNKNOWN_ERROR', '그룹 참여자 응답 형식이 올바르지 않아요.');
    }
    return String(member.id);
  });

  return {
    id: String(response.id),
    roomId: String(roomId),
    name: response.name,
    type: response.type,
    creatorMemberId:
      response.creatorMemberId === undefined || response.creatorMemberId === null
        ? null
        : String(response.creatorMemberId),
    memberIds,
    paymentCount: response.paymentCount ?? 0,
  };
}

function requirePaymentSummary(payment: GroupPaymentResponse): Omit<SplitGroupPaymentSummary, 'splitGroupId'> {
  if (
    payment.id === undefined ||
    payment.payerMemberId === undefined ||
    payment.amount === undefined ||
    !payment.currency
  ) {
    throw new ApiError('UNKNOWN_ERROR', '그룹 결제 응답 형식이 올바르지 않아요.');
  }

  return {
    id: String(payment.id),
    payerMemberId: String(payment.payerMemberId),
    merchant: payment.merchant ?? null,
    paidAt: payment.paidAt ?? null,
    amount: String(payment.amount),
    currency: payment.currency as CurrencyCode,
    splitMethod: payment.splitMethod ?? null,
  };
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

  const roomId = await resolveRoomId(shareCode);
  const response = await callOrval<SplitGroupResponse[]>(() => findAllGroups(roomId));
  return response.map((group) => mapSplitGroup(roomId, group));
}

export async function getSplitGroupOverview(shareCode: string): Promise<SplitGroupOverview> {
  if (USE_MOCK) {
    const room = requireRoom(shareCode);
    const groups = mockSplitGroupStore.findByRoom(room.id, room.members);
    const payments = mockPaymentStore
      .findByRoom(room.id)
      .filter((payment) => payment.includedInSettlement)
      .map((payment) => ({
        id: payment.id,
        payerMemberId: payment.payerMemberId,
        splitGroupId: payment.splitGroupId,
        merchant: payment.merchant,
        paidAt: payment.paidAt,
        amount: payment.amount,
        currency: payment.currency,
        splitMethod: payment.splitMethod,
      }));
    return mockDelay({ groups, payments });
  }

  const roomId = await resolveRoomId(shareCode);
  const groupResponses = await callOrval<SplitGroupResponse[]>(() => findAllGroups(roomId));
  const groups = groupResponses.map((group) => mapSplitGroup(roomId, group));
  const details = await Promise.all(
    groups.map((group) =>
      callOrval<{ payments?: GroupPaymentResponse[] }>(() =>
        findGroupDetail(roomId, parseApiId(group.id)),
      ),
    ),
  );

  const assignedGroupIds = new Map<string, string>();
  for (const [index, detail] of details.entries()) {
    for (const payment of detail.payments ?? []) {
      if (payment.id !== undefined && payment.selectionStatus === 'SELECTED') {
        assignedGroupIds.set(String(payment.id), groups[index].id);
      }
    }
  }

  const payments = (details[0]?.payments ?? []).map((payment) => {
    const summary = requirePaymentSummary(payment);
    return {
      ...summary,
      splitGroupId: assignedGroupIds.get(summary.id) ?? null,
    };
  });

  return { groups, payments };
}

/** 참여자 조합으로 새 그룹을 만든다. 이름은 닉네임 나열로 자동 생성된다. */
export async function createSplitGroup(
  shareCode: string,
  name: string,
  memberIds: string[],
  creatorMemberId: string,
): Promise<SplitGroup> {
  if (USE_MOCK) {
    try {
      const room = requireRoom(shareCode);
      const members = room.members.filter((member) => memberIds.includes(member.id));
      return mockDelay(mockSplitGroupStore.create(room.id, members, creatorMemberId));
    } catch (error) {
      return mockDelayReject(error as ApiError);
    }
  }

  const roomId = await resolveRoomId(shareCode);
  const response = await callOrval<SplitGroupResponse>(() =>
    createGroup(roomId, {
      name,
      memberIds: memberIds.map(parseApiId),
      creatorMemberId: parseApiId(creatorMemberId),
    }),
  );
  return mapSplitGroup(roomId, response);
}

/** 그룹 인원을 바꾼다. 이름도 새 조합으로 다시 만들어진다. */
export async function updateSplitGroup(
  shareCode: string,
  groupId: string,
  name: string,
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

  const roomId = await resolveRoomId(shareCode);
  const response = await callOrval<SplitGroupResponse>(() =>
    updateGroup(roomId, parseApiId(groupId), { name, memberIds: memberIds.map(parseApiId) }),
  );
  return mapSplitGroup(roomId, response);
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

  const roomId = await resolveRoomId(shareCode);
  await callOrval<void>(() => deleteGroup(roomId, parseApiId(groupId)));
}

/** 그룹이 낼 항목을 확정한다. 목록에서 빠진 항목은 그룹에서 빠진다. */
export async function assignPaymentsToGroup(
  shareCode: string,
  groupId: string,
  memberId: string,
  paymentIds: string[],
): Promise<void> {
  if (USE_MOCK) {
    try {
      const room = requireRoom(shareCode);
      await mockDelay(mockPaymentStore.assignToGroup(room.id, groupId, memberId, paymentIds));
      return;
    } catch (error) {
      return mockDelayReject(error as ApiError);
    }
  }

  const roomId = await resolveRoomId(shareCode);
  await callOrval<void>(() =>
    updateGroupPayments(roomId, parseApiId(groupId), {
      memberId: parseApiId(memberId),
      paymentIds: paymentIds.map(parseApiId),
    }),
  );
}
