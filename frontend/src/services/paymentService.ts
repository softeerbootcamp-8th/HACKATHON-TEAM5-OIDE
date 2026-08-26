/**
 * 결제 내역 확정 등록 · 직접 입력 · 조회.
 * 스크린샷 비동기 추출은 paymentExtractionService가 담당한다.
 */

import { USE_MOCK } from '../api/apiConfig';
import { findCurrency } from '../constants/currencies';
import {
  findAll1,
  getShares,
  register,
  registerBulk,
  saveCustom,
  saveEqual,
  updateInclusion,
} from '../api/generated/client';
import type { PaymentResponse, PaymentShareResponse } from '../api/generated/models';
import { callOrval, parseApiId } from '../api/orvalResponse';
import { resolveRoomId } from '../api/roomIdResolver';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { mockPaymentStore } from '../mocks/mockPaymentStore';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { mockSettlementStore } from '../mocks/mockSettlementStore';
import { mockSplitGroupStore } from '../mocks/mockSplitGroupStore';
import { ApiError } from '../types/api';
import type {
  CreatePaymentInput,
  Payment,
  PaymentShare,
  SplitMethod,
} from '../types/payment';
import { calculateEqualSplit } from '../utils/splitCalculation';

function mapPayment(
  roomId: number,
  response: PaymentResponse,
  receiptImageId: string | null = null,
): Payment {
  if (
    response.id === undefined ||
    response.payerMemberId === undefined ||
    response.amount === undefined ||
    !response.currency ||
    typeof response.includedInSettlement !== 'boolean'
  ) {
    throw new ApiError('UNKNOWN_ERROR', '결제 응답 형식이 올바르지 않아요.');
  }

  return {
    id: String(response.id),
    roomId: String(roomId),
    payerMemberId: String(response.payerMemberId),
    splitGroupId: null,
    merchant: response.merchant ?? null,
    paidAt: response.paidAt ?? null,
    amount: String(response.amount),
    currency: response.currency as Payment['currency'],
    splitMethod: response.splitMethod ?? null,
    includedInSettlement: response.includedInSettlement,
    receiptImageId,
  };
}

/** Spring LocalDateTime 계약에 맞춰 시간대 없는 로컬 시각 문자열로 보낸다. */
function toLocalDateTime(isoDateTime: string | null): string | undefined {
  if (!isoDateTime) return undefined;

  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError('UNKNOWN_ERROR', '결제 시각 형식이 올바르지 않아요.');
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toRegisterRequest(payerMemberId: string, payment: CreatePaymentInput) {
  return {
    payerMemberId: parseApiId(payerMemberId),
    merchant: payment.merchant ?? undefined,
    paidAt: toLocalDateTime(payment.paidAt),
    amount: Number(payment.amount),
    currency: payment.currency,
    includedInSettlement: payment.includedInSettlement ?? false,
  };
}

/** 확정한 결제 내역을 한 번에 등록한다. */
export async function createPayments(
  shareCode: string,
  payerMemberId: string,
  payments: CreatePaymentInput[],
): Promise<Payment[]> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    mockSettlementStore.uncompleteMember(room.id, payerMemberId);
    return mockDelay(mockPaymentStore.createMany(room.id, payerMemberId, payments));
  }

  const roomId = await resolveRoomId(shareCode);
  const responses = await callOrval<PaymentResponse[]>(() =>
    registerBulk(roomId, {
      payments: payments.map((payment) => toRegisterRequest(payerMemberId, payment)),
    }),
  );

  return responses.map((response, index) =>
    mapPayment(roomId, response, payments[index]?.receiptImageId ?? null),
  );
}

/** 스크린샷 없이 직접 입력한 결제 내역 한 건을 등록한다. */
export async function createPayment(
  shareCode: string,
  payerMemberId: string,
  payment: CreatePaymentInput,
): Promise<Payment> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    mockSettlementStore.uncompleteMember(room.id, payerMemberId);
    return mockDelay(mockPaymentStore.createMany(room.id, payerMemberId, [payment])[0]);
  }

  const roomId = await resolveRoomId(shareCode);
  const response = await callOrval<PaymentResponse>(() =>
    register(roomId, toRegisterRequest(payerMemberId, payment)),
  );

  return mapPayment(roomId, response, payment.receiptImageId ?? null);
}

/** 방에 등록된 결제 내역. memberId 를 주면 그 사람이 결제한 것만 가져온다. */
export async function getPayments(
  shareCode: string,
  payerMemberId?: string,
): Promise<Payment[]> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    const all = mockPaymentStore.findByRoom(room.id);
    return mockDelay(
      payerMemberId ? all.filter((payment) => payment.payerMemberId === payerMemberId) : all,
    );
  }

  const roomId = await resolveRoomId(shareCode);
  const responses = await callOrval<PaymentResponse[]>(() => findAll1(roomId));
  const payments = responses.map((response) => mapPayment(roomId, response));

  return payerMemberId
    ? payments.filter((payment) => payment.payerMemberId === payerMemberId)
    : payments;
}

/** 정산에 포함할지 여부를 바꾼다. (B-02 의 원형 체크) */
export async function updatePaymentInclusion(
  shareCode: string,
  paymentId: string,
  includedInSettlement: boolean,
): Promise<void> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    const previous = room
      ? mockPaymentStore.findByRoom(room.id).find((payment) => payment.id === paymentId)
      : undefined;
    const updated = mockPaymentStore.setIncluded(paymentId, includedInSettlement);
    if (room && previous?.includedInSettlement !== includedInSettlement) {
      mockSettlementStore.uncompleteMember(room.id, updated.payerMemberId);
    }
    await mockDelay(updated, 150);
    return;
  }

  const roomId = await resolveRoomId(shareCode);
  await callOrval<void>(() =>
    updateInclusion(roomId, parseApiId(paymentId), { includedInSettlement }),
  );
}

/** 결제 1건의 참여자별 부담액. 아직 나누지 않았으면 빈 배열이다. */
export async function getPaymentShares(
  shareCode: string,
  paymentId: string,
): Promise<PaymentShare[]> {
  if (USE_MOCK) {
    return mockDelay(mockPaymentStore.findShares(paymentId), 150);
  }

  const roomId = await resolveRoomId(shareCode);
  const response = await callOrval<PaymentShareResponse>(() =>
    getShares(roomId, parseApiId(paymentId)),
  );

  if (response.paymentId === undefined || !response.shares) {
    throw new ApiError('UNKNOWN_ERROR', '결제 분담 응답 형식이 올바르지 않아요.');
  }

  return response.shares.map((share, index) => {
    if (share.memberId === undefined || share.shareAmount === undefined) {
      throw new ApiError('UNKNOWN_ERROR', '참여자 분담 응답 형식이 올바르지 않아요.');
    }

    return {
      id: `${response.paymentId}-${index + 1}`,
      paymentId: String(response.paymentId),
      memberId: String(share.memberId),
      shareAmount: String(share.shareAmount),
    };
  });
}

/**
 * 결제 1건을 어떻게 나눌지 확정한다.
 *
 * N빵은 서버가 현재 그룹 구성원과 결제자를 기준으로 계산하고,
 * 직접 입력은 참여자별 금액을 그대로 저장한다.
 */
export async function setPaymentSplit(
  shareCode: string,
  paymentId: string,
  method: SplitMethod,
  shares: { memberId: string; shareAmount: string }[],
  requesterMemberId: string,
): Promise<void> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    const payment = mockPaymentStore.findByRoom(room.id).find((item) => item.id === paymentId);
    if (payment?.payerMemberId !== requesterMemberId) {
      return mockDelayReject(
        new ApiError('PAYMENT_NOT_OWNER', '결제를 등록한 참여자만 분담 방식을 변경할 수 있어요.', 403),
      );
    }
    const group = mockSplitGroupStore
      .findByRoom(room.id, room.members)
      .find((item) => item.id === payment?.splitGroupId);
    const resolvedShares =
      method === 'EQUAL' && shares.length === 0 && payment && group
        ? calculateEqualSplit(
            Number(payment.amount),
            room.members
              .filter((member) => group.memberIds.includes(member.id))
              .map((member) => ({ memberId: member.id, nickname: member.nickname })),
            payment.payerMemberId,
            findCurrency(payment.currency).fractionDigits,
          ).shares.map((share) => ({
            memberId: share.memberId,
            shareAmount: String(share.amount),
          }))
        : shares;
    const previousShares = mockPaymentStore.findShares(paymentId);
    const changed =
      payment.splitMethod !== method ||
      previousShares.length !== resolvedShares.length ||
      resolvedShares.some((share) => {
        const previous = previousShares.find((item) => item.memberId === share.memberId);
        return !previous || Number(previous.shareAmount) !== Number(share.shareAmount);
      });
    await mockDelay(mockPaymentStore.setSplit(paymentId, method, resolvedShares));
    if (changed) mockSettlementStore.uncompleteMember(room.id, requesterMemberId);
    return;
  }

  const roomId = await resolveRoomId(shareCode);
  const numericPaymentId = parseApiId(paymentId);

  if (method === 'EQUAL') {
    await callOrval<PaymentShareResponse>(() =>
      saveEqual(roomId, numericPaymentId, {
        headers: { 'X-Room-Member-Id': requesterMemberId },
      }),
    );
    return;
  }

  await callOrval<PaymentShareResponse>(() =>
    saveCustom(
      roomId,
      numericPaymentId,
      {
        shares: shares.map((share) => ({
          memberId: parseApiId(share.memberId),
          amount: Number(share.shareAmount),
        })),
      },
      { headers: { 'X-Room-Member-Id': requesterMemberId } },
    ),
  );
}
