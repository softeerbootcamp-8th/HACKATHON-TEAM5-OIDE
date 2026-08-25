/**
 * 최종 정산 화면들이 함께 쓰는 데이터.
 *
 * 방·참여자·결제·분담·환율을 한 번에 모아 계산까지 끝낸 결과를 준다.
 * E-01 · E-05 · E-06 · E-07 이 같은 숫자를 보게 하기 위함이다.
 */

import { useCallback, useMemo } from 'react';
import { getPaymentShares, getPayments } from '../services/paymentService';
import { getRoomByShareCode } from '../services/roomService';
import { getRoomRates, getSettlementProgress } from '../services/settlementService';
import { getSplitGroups } from '../services/splitGroupService';
import type { Payment, PaymentShare, SplitGroup } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import type { SettlementRate } from '../types/settlement';
import {
  calculateSettlement,
  type RateTable,
  type SettlementResult,
} from '../utils/settlementCalculation';
import { useAsync, type AsyncState } from './useAsync';

export interface SettlementBundle {
  room: SettlementRoom;
  groups: SplitGroup[];
  payments: Payment[];
  shares: PaymentShare[];
  rates: SettlementRate[];
  /** 환율을 직접 바꾼 사람. 자동 환율이면 null. */
  rateEditedBy: string | null;
  /** 자기 정산을 끝낸 참여자들. */
  doneMemberIds: string[];
  rateTable: RateTable;
  result: SettlementResult;
  /** 정산 대상 결제 내역. */
  targetPayments: Payment[];
  /** `전체` 그룹. 미분류 항목을 나눠 낸다. */
  allGroup: SplitGroup | undefined;
}

export function useSettlement(shareCode: string): AsyncState<SettlementBundle> {
  const load = useCallback(async (): Promise<Omit<SettlementBundle, 'rateTable' | 'result' | 'targetPayments' | 'allGroup'>> => {
    const [room, groups, payments, rateInfo, doneMemberIds] = await Promise.all([
      getRoomByShareCode(shareCode),
      getSplitGroups(shareCode),
      getPayments(shareCode),
      getRoomRates(shareCode),
      getSettlementProgress(shareCode),
    ]);

    // 나눠둔 항목의 부담액을 모은다.
    const shareLists = await Promise.all(
      payments
        .filter((payment) => payment.includedInSettlement)
        .map((payment) => getPaymentShares(shareCode, payment.id)),
    );

    return {
      room,
      groups,
      payments,
      shares: shareLists.flat(),
      rates: rateInfo.rates,
      rateEditedBy: rateInfo.editedByNickname,
      doneMemberIds,
    };
  }, [shareCode]);

  const state = useAsync(load, [shareCode]);

  const data = useMemo<SettlementBundle | null>(() => {
    if (!state.data) return null;

    const rateTable: RateTable = Object.fromEntries(
      state.data.rates.map((rate) => [rate.currency, Number(rate.rateToKrw)]),
    );
    const allGroup = state.data.groups.find((group) => group.type === 'ALL');
    const targetPayments = state.data.payments.filter((payment) => payment.includedInSettlement);

    const result = calculateSettlement({
      members: state.data.room.members,
      payments: targetPayments,
      shares: state.data.shares,
      rates: rateTable,
      fallbackMemberIds: allGroup?.memberIds ?? state.data.room.members.map((m) => m.id),
    });

    return { ...state.data, rateTable, result, targetPayments, allGroup };
  }, [state.data]);

  return { status: state.status, data, error: state.error, retry: state.retry };
}

