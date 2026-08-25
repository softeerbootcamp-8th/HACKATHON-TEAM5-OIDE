/**
 * 결제 내역 파싱 · 등록 · 조회.
 *
 * 스크린샷은 한 장씩 파싱을 요청한다. 진행률(`3장 중 2장째`)은 프론트가 완료 개수로 센다.
 * 서버에 파싱 작업 상태 테이블이 필요 없고, 한 장이 실패해도 나머지는 살릴 수 있다.
 */

import { API_BASE_URL, USE_MOCK } from '../api/apiConfig';
import {
  findAll1,
  getShares,
  registerBulk,
  saveCustom,
  saveEqual,
} from '../api/generated/client';
import type { PaymentResponse, PaymentShareResponse } from '../api/generated/models';
import { httpClient } from '../api/httpClient';
import { callOrval, parseApiId } from '../api/orvalResponse';
import { resolveRoomId } from '../api/roomIdResolver';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { draftsForImage } from '../mocks/mockPayments';
import { mockPaymentStore } from '../mocks/mockPaymentStore';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { ApiError } from '../types/api';
import type {
  CreatePaymentInput,
  ParseReceiptResult,
  Payment,
  PaymentShare,
  SplitMethod,
} from '../types/payment';

/** 목 모드에서 스크린샷 순번을 매기기 위한 카운터. */
let mockImageCounter = 0;

function mapPayment(roomId: number, response: PaymentResponse): Payment {
  if (
    response.id === undefined ||
    response.payerMemberId === undefined ||
    response.amount === undefined ||
    !response.currency
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
    includedInSettlement: true,
    receiptImageId: null,
  };
}

function toLocalDateTime(isoDateTime: string | null): string | undefined {
  if (!isoDateTime) return undefined;

  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError('UNKNOWN_ERROR', '결제 시각 형식이 올바르지 않아요.');
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 스크린샷 1장을 파싱한다.
 * @param imageIndex 이번 업로드에서 몇 번째 장인지. 화면의 `스크린샷 n` 표기에 쓴다.
 */
export async function parseReceiptImage(
  shareCode: string,
  file: File,
  imageIndex: number,
): Promise<ParseReceiptResult> {
  if (USE_MOCK) {
    mockImageCounter += 1;
    const imageId = `img-${Date.now()}-${mockImageCounter}`;
    return mockDelay(
      {
        image: {
          id: imageId,
          // 목 모드에서는 실제로 올린 파일을 그대로 미리보기에 쓴다.
          url: URL.createObjectURL(file),
          displayOrder: imageIndex,
        },
        drafts: draftsForImage(imageIndex, imageId),
      },
      700,
    );
  }

  const body = new FormData();
  body.append('image', file);
  body.append('displayOrder', String(imageIndex));

  // multipart 는 Content-Type 을 브라우저가 boundary 와 함께 정해야 해서
  // JSON 전용인 httpClient 를 쓰지 않는다.
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/rooms/${shareCode}/receipt-images`, {
      method: 'POST',
      body,
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', '연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.');
  }

  if (!response.ok) {
    throw new ApiError(
      'UNKNOWN_ERROR',
      `스크린샷을 읽지 못했어요. (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as ParseReceiptResult;
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

  const roomId = await resolveRoomId(shareCode);
  const response = await callOrval<PaymentResponse[]>(() =>
    registerBulk(roomId, {
      payments: payments.map((payment) => ({
        payerMemberId: parseApiId(payerMemberId),
        merchant: payment.merchant ?? undefined,
        paidAt: toLocalDateTime(payment.paidAt),
        amount: Number(payment.amount),
        currency: payment.currency,
      })),
    }),
  );
  return response.map((payment) => mapPayment(roomId, payment));
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
  const response = await callOrval<PaymentResponse[]>(() => findAll1(roomId));
  const payments = response.map((payment) => mapPayment(roomId, payment));
  return payerMemberId
    ? payments.filter((payment) => payment.payerMemberId === payerMemberId)
    : payments;
}

/** 정산에 포함할지 여부를 바꾼다. (B-02 의 원형 체크) */
export async function updatePaymentInclusion(
  shareCode: string,
  paymentId: string,
  includedInSettlement: boolean,
): Promise<Payment> {
  if (USE_MOCK) {
    return mockDelay(mockPaymentStore.setIncluded(paymentId, includedInSettlement), 150);
  }

  return httpClient.patch<Payment>(`/rooms/${shareCode}/payments/${paymentId}`, {
    includedInSettlement,
  });
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
): Promise<void> {
  if (USE_MOCK) {
    await mockDelay(mockPaymentStore.setSplit(paymentId, method, shares));
    return;
  }

  const roomId = await resolveRoomId(shareCode);
  const numericPaymentId = parseApiId(paymentId);

  if (method === 'EQUAL') {
    await callOrval<PaymentShareResponse>(() => saveEqual(roomId, numericPaymentId));
    return;
  }

  await callOrval<PaymentShareResponse>(() =>
    saveCustom(roomId, numericPaymentId, {
      shares: shares.map((share) => ({
        memberId: parseApiId(share.memberId),
        amount: Number(share.shareAmount),
      })),
    }),
  );
}
