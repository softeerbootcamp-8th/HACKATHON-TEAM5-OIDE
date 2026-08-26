/**
 * 결제 내역 확정 등록 · 직접 입력 · 조회.
 * 스크린샷 비동기 추출은 paymentExtractionService가 담당한다.
 */

import { USE_MOCK } from '../api/apiConfig';
import { httpClient } from '../api/httpClient';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { mockPaymentStore } from '../mocks/mockPaymentStore';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { ApiError } from '../types/api';
import type {
  CreatePaymentInput,
  Payment,
  PaymentShare,
  SplitMethod,
} from '../types/payment';
import type { CurrencyCode } from '../types/room';
import { getIncludedPaymentIds, setPaymentIncluded } from './paymentInclusionStore';
import { getRoomIdByShareCode } from './roomService';

interface PaymentResponseDto {
  id: number | string;
  payerMemberId: number | string;
  merchant: string | null;
  paidAt: string | null;
  amount: number | string;
  currency: string;
  splitMethod: SplitMethod | null;
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
    return mockDelay(mockPaymentStore.createMany(room.id, payerMemberId, payments));
  }

  const roomId = await getRoomIdByShareCode(shareCode);
  const responses = await httpClient.post<PaymentResponseDto[]>(`/rooms/${roomId}/payments/bulk`, {
    payments: payments.map((payment) => ({
      payerMemberId,
      merchant: payment.merchant,
      paidAt: toBackendLocalDateTime(payment.paidAt),
      amount: payment.amount,
      currency: payment.currency,
    })),
  });
  const created = responses.map((response, index) =>
    toPayment(response, roomId, payments[index]),
  );
  created.forEach((payment, index) => {
    setPaymentIncluded(
      shareCode,
      payment.id,
      payments[index]?.includedInSettlement ?? false,
    );
  });
  return created;
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
    return mockDelay(mockPaymentStore.createMany(room.id, payerMemberId, [payment])[0]);
  }

  const roomId = await getRoomIdByShareCode(shareCode);
  const response = await httpClient.post<PaymentResponseDto>(`/rooms/${roomId}/payments`, {
    payerMemberId,
    merchant: payment.merchant,
    paidAt: toBackendLocalDateTime(payment.paidAt),
    amount: payment.amount,
    currency: payment.currency,
  });
  const created = toPayment(response, roomId, payment);
  setPaymentIncluded(shareCode, created.id, payment.includedInSettlement ?? false);
  return created;
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

  const roomId = await getRoomIdByShareCode(shareCode);
  const responses = await httpClient.get<PaymentResponseDto[]>(`/rooms/${roomId}/payments`);
  const includedPaymentIds = getIncludedPaymentIds(shareCode);
  const payments = responses.map((response) =>
    toPayment(
      response,
      roomId,
      undefined,
      includedPaymentIds.has(String(response.id)),
    ),
  );
  return payerMemberId
    ? payments.filter((payment) => payment.payerMemberId === String(payerMemberId))
    : payments;
}

/** 정산에 포함할지 여부를 바꾼다. (B-02 의 원형 체크) */
export async function updatePaymentInclusion(
  shareCode: string,
  paymentId: string,
  includedInSettlement: boolean,
): Promise<void> {
  if (USE_MOCK) {
    await mockDelay(mockPaymentStore.setIncluded(paymentId, includedInSettlement), 150);
    return;
  }

  // 백엔드 Payment에는 정산 포함 필드와 PATCH API가 없다. 이 선택은 그룹 분담 전까지
  // 필요한 UI 상태이므로 방별 세션 상태로 보관하고 이후 조회 시 다시 합성한다.
  setPaymentIncluded(shareCode, paymentId, includedInSettlement);
}

/** 결제 1건의 참여자별 부담액. 아직 나누지 않았으면 빈 배열이다. */
export async function getPaymentShares(
  shareCode: string,
  paymentId: string,
): Promise<PaymentShare[]> {
  if (USE_MOCK) {
    return mockDelay(mockPaymentStore.findShares(paymentId), 150);
  }

  return httpClient.get<PaymentShare[]>(
    `/rooms/${shareCode}/payments/${paymentId}/shares`,
  );
}

/**
 * 결제 1건을 어떻게 나눌지 확정한다.
 *
 * N빵이든 직접 입력이든 최종 금액을 그대로 보낸다. 서버가 다시 계산하지 않고
 * 화면이 보여준 숫자를 그대로 저장해, 사용자가 본 것과 저장된 것이 어긋나지 않게 한다.
 */
export async function setPaymentSplit(
  shareCode: string,
  paymentId: string,
  method: SplitMethod,
  shares: { memberId: string; shareAmount: string }[],
): Promise<Payment> {
  if (USE_MOCK) {
    return mockDelay(mockPaymentStore.setSplit(paymentId, method, shares));
  }

  return httpClient.put<Payment>(`/rooms/${shareCode}/payments/${paymentId}/shares`, {
    splitMethod: method,
    shares,
  });
}

function toPayment(
  response: PaymentResponseDto,
  roomId: string,
  input?: CreatePaymentInput,
  includedInSettlement?: boolean,
): Payment {
  const now = new Date().toISOString();
  return {
    id: String(response.id),
    roomId,
    payerMemberId: String(response.payerMemberId),
    splitGroupId: null,
    merchant: response.merchant,
    paidAt: response.paidAt,
    amount: String(response.amount),
    currency: response.currency as CurrencyCode,
    splitMethod: response.splitMethod,
    includedInSettlement: includedInSettlement ?? input?.includedInSettlement ?? false,
    receiptImageId: input?.receiptImageId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Spring LocalDateTime 계약에 맞춰 시간대 없는 로컬 시각 문자열로 보낸다. */
function toBackendLocalDateTime(value: string | null): string | null {
  if (value === null) return null;

  const localDateTime = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (localDateTime) {
    return `${localDateTime[1]}T${localDateTime[2]}:${localDateTime[3] ?? '00'}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (number: number) => String(number).padStart(2, '0');
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join('T');
}
