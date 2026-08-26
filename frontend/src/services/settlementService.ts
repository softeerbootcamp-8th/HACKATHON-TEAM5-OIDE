/**
 * 환율 조회 · 최종 정산.
 *
 * 환율은 방을 개설한 시점으로 고정되어 모든 참여자에게 똑같이 적용된다.
 * 참여자가 직접 입력하면 그 값이 우선하고 방 전원에게 적용된다 (FR-04).
 */

import { USE_MOCK } from '../api/apiConfig';
import {
  completeMemberSettlement as requestMemberSettlementCompletion,
  confirm,
  getPreview,
  getSettlement,
} from '../api/generated/client';
import type {
  SettlementPreviewResponse,
  SettlementResponse,
} from '../api/generated/models';
import { callOrval, parseApiId } from '../api/orvalResponse';
import { resolveRoomId } from '../api/roomIdResolver';
import { mockDelay, mockDelayReject } from '../mocks/mockDelay';
import { mockPaymentStore } from '../mocks/mockPaymentStore';
import { buildSeedRates } from '../mocks/mockRates';
import { mockRoomStore } from '../mocks/mockRoomStore';
import { mockSettlementStore } from '../mocks/mockSettlementStore';
import { ApiError } from '../types/api';
import type { SettlementRate } from '../types/settlement';
import type { CurrencyCode } from '../types/room';
import { calculateSettlement } from '../utils/settlementCalculation';

interface RoomRates {
  rates: SettlementRate[];
}

export interface SettlementPreviewRate {
  currency: CurrencyCode;
  rateToKrw: string | null;
  source: string | null;
  effectiveDate: string | null;
  quotedAt: string | null;
  requiresManual: boolean;
}

export interface SettlementPreview {
  settlementAvailable: boolean;
  invalidPaymentIds: string[];
  missingCurrencies: string[];
  rates: SettlementPreviewRate[];
}

export interface ConfirmedMemberResult {
  memberId: string;
  nickname: string;
  paidKrw: number;
  owedKrw: number;
  netKrw: number;
}

export interface ConfirmedTransfer {
  senderMemberId: string;
  senderNickname: string;
  receiverMemberId: string;
  receiverNickname: string;
  amountKrw: number;
}

export interface ConfirmedSettlement {
  settlementId: string;
  calculatedAt: string;
  completedMemberIds: string[];
  rates: SettlementPreviewRate[];
  members: ConfirmedMemberResult[];
  transfers: ConfirmedTransfer[];
}

function mapSettlementPreview(response: SettlementPreviewResponse): SettlementPreview {
  if (
    response.settlementAvailable === undefined ||
    !response.invalidPaymentIds ||
    !response.missingCurrencies ||
    !response.rates
  ) {
    throw new ApiError('UNKNOWN_ERROR', '정산 미리보기 응답 형식이 올바르지 않아요.');
  }

  return {
    settlementAvailable: response.settlementAvailable,
    invalidPaymentIds: response.invalidPaymentIds.map(String),
    missingCurrencies: response.missingCurrencies,
    rates: response.rates.map((rate) => {
      if (!rate.currency || rate.requiresManual === undefined) {
        throw new ApiError('UNKNOWN_ERROR', '환율 응답 형식이 올바르지 않아요.');
      }
      return {
        currency: rate.currency as CurrencyCode,
        rateToKrw: rate.rateToKrw === undefined ? null : String(rate.rateToKrw),
        source: rate.source ?? null,
        effectiveDate: rate.effectiveDate ?? null,
        quotedAt: rate.quotedAt ?? null,
        requiresManual: rate.requiresManual,
      };
    }),
  };
}

export async function getSettlementPreview(shareCode: string): Promise<SettlementPreview> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    if (!room.createdAt) {
      return mockDelayReject(new ApiError('UNKNOWN_ERROR', '정산방 생성 시각이 없어요.'));
    }

    const payments = mockPaymentStore
      .findByRoom(room.id)
      .filter((payment) => payment.includedInSettlement);
    const invalidPaymentIds = payments
      .filter((payment) => {
        const allocatedAmount = mockPaymentStore
          .findShares(payment.id)
          .reduce((sum, share) => sum + Number(share.shareAmount), 0);
        return (
          !payment.splitGroupId ||
          !payment.splitMethod ||
          allocatedAmount !== Number(payment.amount)
        );
      })
      .map((payment) => payment.id);
    const usedCurrencies = new Set(payments.map((payment) => payment.currency));
    const rates = buildSeedRates(room.createdAt)
      .filter((rate) => usedCurrencies.has(rate.currency))
      .map((rate) => ({
        currency: rate.currency,
        rateToKrw: rate.rateToKrw,
        source: rate.rateSource,
        effectiveDate: rate.effectiveDate,
        quotedAt: rate.quotedAt,
        requiresManual: false,
      }));

    return mockDelay({
      settlementAvailable: invalidPaymentIds.length === 0,
      invalidPaymentIds,
      missingCurrencies: [],
      rates,
    });
  }

  const roomId = await resolveRoomId(shareCode);
  const response = await callOrval<SettlementPreviewResponse>(() => getPreview(roomId));
  return mapSettlementPreview(response);
}

export async function confirmSettlement(
  shareCode: string,
  manualRates: { currency: string; rateToKrw: string }[] = [],
): Promise<void> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    const manualRate = manualRates[0];
    mockSettlementStore.setManualRate(
      room.id,
      manualRate ?? null,
    );
    mockSettlementStore.resetCompletedMembers(room.id);
    await mockDelay(undefined);
    return;
  }

  const roomId = await resolveRoomId(shareCode);
  await callOrval<SettlementResponse>(() =>
    confirm(roomId, {
      manualRates: manualRates.map((rate) => ({
        currency: rate.currency,
        rateToKrw: Number(rate.rateToKrw),
      })),
    }),
  );
}

export async function getConfirmedSettlement(shareCode: string): Promise<ConfirmedSettlement> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    const payments = mockPaymentStore
      .findByRoom(room.id)
      .filter((payment) => payment.includedInSettlement);
    const shares = payments.flatMap((payment) => mockPaymentStore.findShares(payment.id));
    const rateInfo = await getMockRoomRates(shareCode);
    const rateTable = Object.fromEntries(
      rateInfo.rates.map((rate) => [rate.currency, Number(rate.rateToKrw)]),
    );
    const result = calculateSettlement({
      members: room.members,
      payments,
      shares,
      rates: rateTable,
      fallbackMemberIds: room.members.map((member) => member.id),
    });

    return mockDelay({
      settlementId: 'mock-settlement',
      calculatedAt: new Date().toISOString(),
      completedMemberIds: mockSettlementStore.findCompletedMemberIds(room.id),
      rates: rateInfo.rates.map((rate) => ({
        currency: rate.currency,
        rateToKrw: rate.rateToKrw,
        source: rate.rateSource,
        effectiveDate: rate.effectiveDate,
        quotedAt: rate.quotedAt,
        requiresManual: false,
      })),
      members: result.members.map((member) => ({
        memberId: member.memberId,
        nickname: member.nickname,
        paidKrw: member.paidKrw,
        owedKrw: member.owedKrw,
        netKrw: member.receivableKrw - member.payableKrw,
      })),
      transfers: result.transfers,
    });
  }

  const roomId = await resolveRoomId(shareCode);
  const response = await callOrval<SettlementResponse>(() => getSettlement(roomId));
  const result = response.result;
  if (
    response.settlementId === undefined ||
    !response.calculatedAt ||
    !response.completedMemberIds ||
    !result?.rates ||
    !result.memberResults ||
    !result.transfers
  ) {
    throw new ApiError('UNKNOWN_ERROR', '확정 정산 응답 형식이 올바르지 않아요.');
  }

  return {
    settlementId: String(response.settlementId),
    calculatedAt: response.calculatedAt,
    completedMemberIds: response.completedMemberIds.map(String),
    rates: result.rates.map((rate) => {
      if (!rate.currency || rate.rateToKrw === undefined || !rate.quotedAt) {
        throw new ApiError('UNKNOWN_ERROR', '확정 환율 응답 형식이 올바르지 않아요.');
      }
      return {
        currency: rate.currency as CurrencyCode,
        rateToKrw: String(rate.rateToKrw),
        source: rate.source ?? null,
        effectiveDate: rate.effectiveDate ?? null,
        quotedAt: rate.quotedAt,
        requiresManual: rate.requiresManual ?? false,
      };
    }),
    members: result.memberResults.map((member) => {
      if (
        member.memberId === undefined ||
        !member.nickname ||
        member.paidKrw === undefined ||
        member.owedKrw === undefined ||
        member.netKrw === undefined
      ) {
        throw new ApiError('UNKNOWN_ERROR', '참여자 정산 응답 형식이 올바르지 않아요.');
      }
      return {
        memberId: String(member.memberId),
        nickname: member.nickname,
        paidKrw: member.paidKrw,
        owedKrw: member.owedKrw,
        netKrw: member.netKrw,
      };
    }),
    transfers: result.transfers.map((transfer) => {
      if (
        transfer.senderMemberId === undefined ||
        !transfer.senderNickname ||
        transfer.receiverMemberId === undefined ||
        !transfer.receiverNickname ||
        transfer.amountKrw === undefined
      ) {
        throw new ApiError('UNKNOWN_ERROR', '송금 정산 응답 형식이 올바르지 않아요.');
      }
      return {
        senderMemberId: String(transfer.senderMemberId),
        senderNickname: transfer.senderNickname,
        receiverMemberId: String(transfer.receiverMemberId),
        receiverNickname: transfer.receiverNickname,
        amountKrw: transfer.amountKrw,
      };
    }),
  };
}

export async function completeMySettlement(
  shareCode: string,
  memberId: string,
): Promise<void> {
  if (USE_MOCK) {
    const room = mockRoomStore.findByShareCode(shareCode);
    if (!room) {
      return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
    }
    mockSettlementStore.completeMember(room.id, memberId);
    return mockDelay(undefined);
  }

  const roomId = await resolveRoomId(shareCode);
  await callOrval<void>(() => requestMemberSettlementCompletion(roomId, parseApiId(memberId)));
}

async function getMockRoomRates(shareCode: string): Promise<RoomRates> {
  const room = mockRoomStore.findByShareCode(shareCode);
  if (!room) {
    return mockDelayReject(new ApiError('ROOM_NOT_FOUND', '정산방을 찾을 수 없어요.', 404));
  }
  if (!room.createdAt) {
    return mockDelayReject(new ApiError('UNKNOWN_ERROR', '정산방 생성 시각이 없어요.'));
  }

  const rates = buildSeedRates(room.createdAt);
  const manual = mockSettlementStore.findManualRate(room.id);
  if (!manual) return mockDelay({ rates });

  return mockDelay({
    rates: rates.map((rate) =>
      rate.currency === manual.currency
        ? { ...rate, rateToKrw: manual.rateToKrw, rateSource: 'MANUAL' as const }
        : rate,
    ),
  });
}
