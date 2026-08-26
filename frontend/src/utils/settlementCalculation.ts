/**
 * 최종 정산 계산. (FR-04 · FR-05)
 *
 * 1. 참여자별로 `실제로 결제한 금액` 과 `부담해야 하는 금액` 을 원화로 환산한다.
 * 2. 둘의 차이가 곧 받을 돈(양수) 또는 보낼 돈(음수)이다.
 * 3. 받을 사람과 보낼 사람을 큰 금액부터 맞물려 송금 횟수를 줄인다.
 */

import type { Payment, PaymentShare } from '../types/payment';
import type { CurrencyCode, RoomMember } from '../types/room';

/** 통화별 원화 환율. `JPY` → 1엔당 원화. */
export type RateTable = Record<string, number>;

export interface MemberSettlement {
  memberId: string;
  nickname: string;
  /** 내가 결제자로 등록한 내역의 합 (원). */
  paidKrw: number;
  /** 내가 부담해야 하는 금액 (원). */
  owedKrw: number;
  /** 받을 금액. 없으면 0. */
  receivableKrw: number;
  /** 보낼 금액. 없으면 0. */
  payableKrw: number;
}

export interface Transfer {
  senderMemberId: string;
  senderNickname: string;
  receiverMemberId: string;
  receiverNickname: string;
  amountKrw: number;
}

export interface SettlementResult {
  members: MemberSettlement[];
  transfers: Transfer[];
}

/**
 * 외화를 원화로 바꾼다. 소수점은 원 단위로 반올림한다 (FR-04).
 * 반올림은 참여자별 부담액 각각에 적용하고, 총액과의 1~2원 차이는 보정하지 않는다.
 */
export function toKrw(amount: number, currency: CurrencyCode, rates: RateTable): number {
  const rate = rates[currency] ?? (currency === 'KRW' ? 1 : 0);
  if (!rate) return 0;
  return Math.round(amount * rate);
}

function allocateSharesToKrw(
  paymentAmount: number,
  currency: CurrencyCode,
  shareAmounts: { memberId: string; amount: number }[],
  rates: RateTable,
  memberIdsInDisplayOrder: string[],
): Map<string, number> {
  const rate = rates[currency] ?? (currency === 'KRW' ? 1 : 0);
  if (!rate) return new Map(shareAmounts.map((share) => [share.memberId, 0]));

  const displayOrders = new Map(
    memberIdsInDisplayOrder.map((memberId, index) => [memberId, index]),
  );
  const allocations = shareAmounts
    .map((share) => {
      const exactAmount = share.amount * rate;
      const floorAmount = Math.floor(exactAmount);
      return {
        memberId: share.memberId,
        floorAmount,
        fractionalPart: exactAmount - floorAmount,
      };
    })
    .sort(
      (first, second) =>
        second.fractionalPart - first.fractionalPart ||
        (displayOrders.get(first.memberId) ?? Number.MAX_SAFE_INTEGER) -
          (displayOrders.get(second.memberId) ?? Number.MAX_SAFE_INTEGER),
    );
  const floorTotal = allocations.reduce(
    (sum, allocation) => sum + allocation.floorAmount,
    0,
  );
  const remainingWon = toKrw(paymentAmount, currency, rates) - floorTotal;

  return new Map(
    allocations.map((allocation, index) => [
      allocation.memberId,
      allocation.floorAmount + (index < remainingWon ? 1 : 0),
    ]),
  );
}

export function calculateSettlement(params: {
  members: RoomMember[];
  payments: Payment[];
  shares: PaymentShare[];
  rates: RateTable;
  /** 그룹에 담기지 않은 항목을 나눠 낼 참여자들 (`전체` 그룹). */
  fallbackMemberIds: string[];
}): SettlementResult {
  const { members, payments, shares, rates, fallbackMemberIds } = params;

  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  for (const member of members) {
    paid.set(member.id, 0);
    owed.set(member.id, 0);
  }

  for (const payment of payments) {
    if (!payment.includedInSettlement) continue;

    const amountKrw = toKrw(Number(payment.amount), payment.currency, rates);
    paid.set(payment.payerMemberId, (paid.get(payment.payerMemberId) ?? 0) + amountKrw);

    const own = shares.filter((share) => share.paymentId === payment.id);

    if (own.length > 0) {
      const allocatedShares = allocateSharesToKrw(
        Number(payment.amount),
        payment.currency,
        own.map((share) => ({
          memberId: share.memberId,
          amount: Number(share.shareAmount),
        })),
        rates,
        members.map((member) => member.id),
      );
      for (const [memberId, amount] of allocatedShares) {
        owed.set(
          memberId,
          (owed.get(memberId) ?? 0) + amount,
        );
      }
      continue;
    }

    // 아직 나누지 않았거나 어느 그룹에도 담기지 않은 항목은 `전체` 가 N빵한다.
    const targets = fallbackMemberIds.length > 0 ? fallbackMemberIds : members.map((m) => m.id);
    const per = Math.floor(Number(payment.amount) / targets.length);
    const remainder = Number(payment.amount) - per * targets.length;
    const payerIndex = targets.indexOf(payment.payerMemberId);
    const remainderTaker = payerIndex >= 0 ? payment.payerMemberId : targets[0];

    const allocatedShares = allocateSharesToKrw(
      Number(payment.amount),
      payment.currency,
      targets.map((memberId) => ({
        memberId,
        amount: memberId === remainderTaker ? per + remainder : per,
      })),
      rates,
      members.map((member) => member.id),
    );
    for (const [memberId, amount] of allocatedShares) {
      owed.set(memberId, (owed.get(memberId) ?? 0) + amount);
    }
  }

  const memberResults: MemberSettlement[] = members.map((member) => {
    const paidKrw = paid.get(member.id) ?? 0;
    const owedKrw = owed.get(member.id) ?? 0;
    const balance = paidKrw - owedKrw;
    return {
      memberId: member.id,
      nickname: member.nickname,
      paidKrw,
      owedKrw,
      receivableKrw: balance > 0 ? balance : 0,
      payableKrw: balance < 0 ? -balance : 0,
    };
  });

  return { members: memberResults, transfers: minimizeTransfers(memberResults) };
}

/**
 * 받을 사람과 보낼 사람을 큰 금액부터 맞물려 송금 건수를 줄인다.
 *
 * 매번 한 사람의 잔액이 0 이 되므로 송금은 최대 (인원 − 1) 건이다.
 * 모든 쌍의 채무를 그대로 나열하지 않는다 (FR-05).
 */
function minimizeTransfers(members: MemberSettlement[]): Transfer[] {
  const creditors = members
    .filter((member) => member.receivableKrw > 0)
    .map((member) => ({ ...member, remaining: member.receivableKrw }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = members
    .filter((member) => member.payableKrw > 0)
    .map((member) => ({ ...member, remaining: member.payableKrw }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.remaining, debtor.remaining);

    if (amount > 0) {
      transfers.push({
        senderMemberId: debtor.memberId,
        senderNickname: debtor.nickname,
        receiverMemberId: creditor.memberId,
        receiverNickname: creditor.nickname,
        amountKrw: amount,
      });
    }

    creditor.remaining -= amount;
    debtor.remaining -= amount;
    if (creditor.remaining === 0) ci += 1;
    if (debtor.remaining === 0) di += 1;
  }

  return transfers;
}

/** 한 참여자가 부담한 결제 내역들. E-07 의 근거 목록에 쓴다. */
export function findMemberBreakdown(params: {
  memberId: string;
  payments: Payment[];
  shares: PaymentShare[];
  rates: RateTable;
  fallbackMemberIds: string[];
  memberIdsInDisplayOrder: string[];
  groupNameOf: (payment: Payment) => string;
}): { paymentId: string; merchant: string; groupLabel: string; amountKrw: number }[] {
  const {
    memberId,
    payments,
    shares,
    rates,
    fallbackMemberIds,
    memberIdsInDisplayOrder,
    groupNameOf,
  } = params;
  const rows: { paymentId: string; merchant: string; groupLabel: string; amountKrw: number }[] = [];

  for (const payment of payments) {
    if (!payment.includedInSettlement) continue;

    const own = shares.filter((share) => share.paymentId === payment.id);
    let amount: number | null = null;

    if (own.length > 0) {
      amount =
        allocateSharesToKrw(
          Number(payment.amount),
          payment.currency,
          own.map((share) => ({
            memberId: share.memberId,
            amount: Number(share.shareAmount),
          })),
          rates,
          memberIdsInDisplayOrder,
        ).get(memberId) ?? null;
    } else {
      const targets = fallbackMemberIds;
      if (targets.includes(memberId)) {
        const per = Math.floor(Number(payment.amount) / targets.length);
        const remainder = Number(payment.amount) - per * targets.length;
        const taker = targets.includes(payment.payerMemberId) ? payment.payerMemberId : targets[0];
        amount =
          allocateSharesToKrw(
            Number(payment.amount),
            payment.currency,
            targets.map((targetMemberId) => ({
              memberId: targetMemberId,
              amount: targetMemberId === taker ? per + remainder : per,
            })),
            rates,
            memberIdsInDisplayOrder,
          ).get(memberId) ?? null;
      }
    }

    if (amount === null) continue;
    rows.push({
      paymentId: payment.id,
      merchant: payment.merchant ?? '결제처 없음',
      groupLabel: groupNameOf(payment),
      amountKrw: amount,
    });
  }

  return rows;
}
