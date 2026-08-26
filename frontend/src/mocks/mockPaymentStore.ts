/**
 * 목 모드의 결제 내역 저장소.
 *
 * 서비스 계층 뒤에 숨어 있으므로 화면 코드는 이 파일을 모른다.
 * 새로고침해도 남도록 sessionStorage 에 함께 보관한다.
 */

import type {
  CreatePaymentInput,
  Payment,
  PaymentShare,
  SplitMethod,
} from '../types/payment';

const STORAGE_KEY = 'oide:mock:payments';
const SHARES_KEY = 'oide:mock:paymentShares';

function read(): Payment[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Payment[]) : [];
  } catch {
    return [];
  }
}

function write(payments: Payment[]): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
  } catch {
    // 저장 실패는 이번 세션 동작에 영향이 없다.
  }
}

function readShares(): PaymentShare[] {
  try {
    const raw = window.sessionStorage.getItem(SHARES_KEY);
    return raw ? (JSON.parse(raw) as PaymentShare[]) : [];
  } catch {
    return [];
  }
}

function writeShares(shares: PaymentShare[]): void {
  try {
    window.sessionStorage.setItem(SHARES_KEY, JSON.stringify(shares));
  } catch {
    // 저장 실패는 이번 세션 동작에 영향이 없다.
  }
}

export const mockPaymentStore = {
  findByRoom(roomId: string): Payment[] {
    return read()
      .filter((payment) => payment.roomId === roomId)
      .sort(byPaidAtDesc);
  },

  createMany(
    roomId: string,
    payerMemberId: string,
    inputs: CreatePaymentInput[],
  ): Payment[] {
    const now = new Date().toISOString();
    const created: Payment[] = inputs.map((input, index) => ({
      id: `pay-${Date.now()}-${index}`,
      roomId,
      payerMemberId,
      splitGroupId: null,
      merchant: input.merchant,
      paidAt: input.paidAt,
      amount: input.amount,
      currency: input.currency,
      splitMethod: null,
      // 등록 직후에는 아무것도 정산 대상이 아니다. B-02 에서 정산할 항목만 고른다.
      // 분담 도중 빠뜨린 항목을 넣는 경우만 곧바로 대상이 된다.
      includedInSettlement: input.includedInSettlement ?? false,
      receiptImageId: input.receiptImageId,
      createdAt: now,
      updatedAt: now,
    }));

    write([...read(), ...created]);
    return created;
  },

  /** 결제 항목들을 한 그룹에 담는다. 목록에서 빠진 것은 그룹에서 뺀다. */
  assignToGroup(
    roomId: string,
    groupId: string,
    memberId: string,
    paymentIds: string[],
  ): Payment[] {
    const payments = read();
    const now = new Date().toISOString();

    for (const payment of payments) {
      if (payment.roomId !== roomId || payment.payerMemberId !== memberId) continue;

      const shouldBelong = paymentIds.includes(payment.id);
      const belongsNow = payment.splitGroupId === groupId;

      // 한 항목은 한 그룹에만 속한다. 다른 그룹 것은 건드리지 않는다.
      if (shouldBelong && !belongsNow) {
        payment.splitGroupId = groupId;
        payment.updatedAt = now;
      } else if (!shouldBelong && belongsNow) {
        payment.splitGroupId = null;
        payment.updatedAt = now;
      }
    }

    write(payments);
    return payments.filter((payment) => payment.roomId === roomId).sort(byPaidAtDesc);
  },

  /** 그룹이 사라지면 담겨 있던 항목을 미분류로 되돌린다. */
  releaseGroup(groupId: string): void {
    const payments = read();
    const now = new Date().toISOString();
    for (const payment of payments) {
      if (payment.splitGroupId === groupId) {
        payment.splitGroupId = null;
        payment.updatedAt = now;
      }
    }
    write(payments);
  },

  /** 결제 1건의 분담 방식과 참여자별 부담액을 저장한다. */
  setSplit(
    paymentId: string,
    method: SplitMethod,
    shares: { memberId: string; shareAmount: string }[],
  ): Payment {
    const payments = read();
    const target = payments.find((payment) => payment.id === paymentId);
    if (!target) {
      throw new Error(`결제 내역을 찾을 수 없습니다: ${paymentId}`);
    }
    target.splitMethod = method;
    target.updatedAt = new Date().toISOString();
    write(payments);

    const others = readShares().filter((share) => share.paymentId !== paymentId);
    writeShares([
      ...others,
      ...shares.map((share, index) => ({
        id: `${paymentId}-s${index + 1}`,
        paymentId,
        memberId: share.memberId,
        shareAmount: share.shareAmount,
      })),
    ]);

    return target;
  },

  findShares(paymentId: string): PaymentShare[] {
    return readShares().filter((share) => share.paymentId === paymentId);
  },

  setIncluded(paymentId: string, included: boolean): Payment {
    const payments = read();
    const target = payments.find((payment) => payment.id === paymentId);
    if (!target) {
      throw new Error(`결제 내역을 찾을 수 없습니다: ${paymentId}`);
    }
    target.includedInSettlement = included;
    if (!included) {
      target.splitGroupId = null;
      target.splitMethod = null;
      writeShares(readShares().filter((share) => share.paymentId !== paymentId));
    }
    target.updatedAt = new Date().toISOString();
    write(payments);
    return target;
  },
};

/** 최신 결제가 위로 오도록 정렬한다. 시각을 모르는 건 뒤로 보낸다. */
function byPaidAtDesc(a: Payment, b: Payment): number {
  if (!a.paidAt) return 1;
  if (!b.paidAt) return -1;
  return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
}
