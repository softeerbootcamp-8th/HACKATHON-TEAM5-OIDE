/**
 * 결제 내역 파싱 · 등록 · 조회.
 *
 * 스크린샷은 한 장씩 파싱을 요청한다. 진행률(`3장 중 2장째`)은 프론트가 완료 개수로 센다.
 * 서버에 파싱 작업 상태 테이블이 필요 없고, 한 장이 실패해도 나머지는 살릴 수 있다.
 */

import { API_BASE_URL, USE_MOCK } from '../api/apiConfig';
import { httpClient } from '../api/httpClient';
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

  return httpClient.post<Payment[]>(`/rooms/${shareCode}/payments`, {
    payerMemberId,
    payments,
  });
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

  const query = payerMemberId ? `?payerMemberId=${encodeURIComponent(payerMemberId)}` : '';
  return httpClient.get<Payment[]>(`/rooms/${shareCode}/payments${query}`);
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
