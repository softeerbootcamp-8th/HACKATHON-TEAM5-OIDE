import { useCallback, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { findCurrency } from '../constants/currencies';
import { joinRoomPath, splitGroupMethodPath, splitGroupsPath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getPaymentShares, getPayments, setPaymentSplit } from '../services/paymentService';
import { getRoomByShareCode } from '../services/roomService';
import { getSplitGroupOverview } from '../services/splitGroupService';
import { isApiError } from '../types/api';
import type { Payment, PaymentShare, SplitGroup, SplitMethod } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import { formatAmount, formatDayTime, sanitizeAmountInput } from '../utils/formatters';
import { withEunNeun, withIGa } from '../utils/koreanParticle';
import {
  calculateEqualSplit,
  isCustomSplitBalanced,
  sumShares,
} from '../utils/splitCalculation';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './PaymentSplitPage.module.css';

interface SplitData {
  room: SettlementRoom;
  groups: SplitGroup[];
  payments: Payment[];
  shares: PaymentShare[];
}

const SEGMENTS = [
  { value: 'EQUAL' as SplitMethod, label: 'N빵' },
  { value: 'CUSTOM' as SplitMethod, label: '직접 입력' },
];

/**
 * D-09 · D-10 결제 1건을 그룹 안에서 나누는 화면.
 *
 * 기본은 N빵이다. 나누어떨어지지 않으면 남는 금액을 결제자가 부담하고,
 * 그 근거를 화면에 적는다 (FR-03).
 * 직접 입력은 합계가 결제 금액과 같아야 진행할 수 있다.
 */
export function PaymentSplitPage() {
  const { shareCode = '', groupId = '', paymentId = '' } = useParams<{
    shareCode: string;
    groupId: string;
    paymentId: string;
  }>();
  const { identity } = useLocalIdentity(shareCode);
  const splitMethodPath = splitGroupMethodPath(shareCode, groupId);
  const { goBack } = useBackNavigation(splitMethodPath);

  const load = useCallback(async (): Promise<SplitData> => {
    const [room, overview, payments, shares] = await Promise.all([
      getRoomByShareCode(shareCode),
      getSplitGroupOverview(shareCode),
      getPayments(shareCode),
      getPaymentShares(shareCode, paymentId),
    ]);
    return { room, groups: overview.groups, payments, shares };
  }, [shareCode, paymentId]);

  const { status, data, error, retry } = useAsync(load, [shareCode, paymentId]);

  const payment = data?.payments.find((item) => item.id === paymentId);
  const group = data?.groups.find((item) => item.id === groupId);

  const [method, setMethod] = useState<SplitMethod | null>(null);
  const [customShares, setCustomShares] = useState<Record<string, string> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const members = useMemo(() => {
    if (!group || !data) return [];
    return group.memberIds
      .map((id) => data.room.members.find((member) => member.id === id))
      .filter((member): member is NonNullable<typeof member> => Boolean(member))
      .map((member) => ({ memberId: member.id, nickname: member.nickname }));
  }, [group, data]);

  const amount = Number(payment?.amount ?? 0);
  const currency = payment?.currency ?? 'JPY';
  const fractionDigits = findCurrency(currency).fractionDigits;

  const equal = useMemo(
    () => calculateEqualSplit(amount, members, payment?.payerMemberId ?? '', fractionDigits),
    [amount, members, payment, fractionDigits],
  );

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  if (status === 'success' && (!payment || !group)) {
    return <Navigate to={splitGroupsPath(shareCode)} replace />;
  }

  const effectiveMethod = method ?? payment?.splitMethod ?? 'EQUAL';

  // 직접 입력으로 처음 넘어가면 N빵 결과를 출발점으로 채워준다.
  const savedCustomShares =
    payment?.splitMethod === 'CUSTOM' && data
      ? Object.fromEntries(data.shares.map((share) => [share.memberId, share.shareAmount]))
      : null;
  const shareValues =
    customShares ??
    savedCustomShares ??
    Object.fromEntries(equal.shares.map((share) => [share.memberId, String(share.amount)]));

  const customTotal = sumShares(shareValues, fractionDigits);
  const difference = Number((amount - customTotal).toFixed(fractionDigits));
  const balanced = isCustomSplitBalanced(amount, shareValues, fractionDigits);

  const canSubmit = effectiveMethod === 'EQUAL' || balanced;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const shares =
        effectiveMethod === 'EQUAL'
          ? equal.shares.map((share) => ({
              memberId: share.memberId,
              shareAmount: String(share.amount),
            }))
          : members.map((member) => ({
              memberId: member.memberId,
              shareAmount: String(Number(shareValues[member.memberId]) || 0),
            }));

      await setPaymentSplit(shareCode, paymentId, effectiveMethod, shares);
      goBack();
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '저장하지 못했어요.');
      setSubmitting(false);
    }
  };

  return (
    <MobileFrame tone="white">
      <AppBar backTo={splitMethodPath} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && payment && group && (
        <>
          <ScreenBody>
            <div className={styles.content}>
              <div className={styles.paymentCard}>
                <span className={styles.merchant}>{payment.merchant ?? '결제처 없음'}</span>
                <span className={styles.amount}>{formatAmount(payment.amount, currency)}</span>
                <span className={styles.meta}>
                  {payment.paidAt ? `${formatDayTime(payment.paidAt)} · ` : ''}
                  {currency}
                </span>
              </div>

              <SegmentedControl
                label="나누는 방식"
                options={SEGMENTS}
                value={effectiveMethod}
                onChange={(next) => {
                  setMethod(next);
                  // 직접 입력으로 넘어갈 때 N빵 결과를 그대로 가져온다.
                  if (next === 'CUSTOM' && !customShares) {
                    setCustomShares(
                      Object.fromEntries(
                        equal.shares.map((share) => [share.memberId, String(share.amount)]),
                      ),
                    );
                  }
                }}
              />

              {effectiveMethod === 'EQUAL' ? (
                <>
                  <p className={styles.formula}>
                    {formatAmount(payment.amount, currency)} ÷ {members.length}명 ={' '}
                    {formatAmount(String(equal.quotient), currency)}
                    {equal.remainder > 0 &&
                      ` …나머지 ${formatAmount(String(equal.remainder), currency)}`}
                  </p>

                  <ul className={styles.shares}>
                    {equal.shares.map((share) => (
                      <li key={share.memberId} className={styles.shareRow}>
                        <Avatar nickname={share.nickname} />
                        <span className={styles.shareName}>
                          <span className={styles.nickname}>{share.nickname}</span>
                          {share.extra > 0 && (
                            <span className={styles.payerBadge}>
                              +{formatAmount(String(share.extra), currency)} · 결제자
                            </span>
                          )}
                        </span>
                        <span className={styles.shareAmount}>
                          {formatAmount(String(share.amount), currency)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {equal.remainder > 0 && equal.payer && (
                    <p className={styles.caption}>
                      나누어떨어지지 않는 {withEunNeun(equal.remainder)} 결제하신{' '}
                      {equal.payer.nickname}님이 부담해요.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div
                    className={`${styles.totalRow} ${balanced ? '' : styles.totalMismatch}`}
                    aria-live="polite"
                  >
                    <span className={styles.totalLabel}>합계</span>
                    <span className={styles.totalValue}>
                      {formatAmount(String(customTotal), currency)} /{' '}
                      {formatAmount(payment.amount, currency)}
                    </span>
                  </div>

                  <ul className={styles.shares}>
                    {members.map((member) => (
                      <li key={member.memberId} className={styles.shareRow}>
                        <Avatar nickname={member.nickname} />
                        <span className={styles.shareName}>
                          <span className={styles.nickname}>{member.nickname}</span>
                        </span>
                        <input
                          className={styles.shareInput}
                          value={shareValues[member.memberId] ?? '0'}
                          inputMode="decimal"
                          aria-label={`${member.nickname} 부담 금액`}
                          onChange={(event) =>
                            setCustomShares({
                              ...shareValues,
                              [member.memberId]: sanitizeAmountInput(
                                event.target.value,
                                fractionDigits,
                              ),
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>

                  <p className={styles.caption}>
                    {balanced
                      ? `통화는 결제한 ${currency} 그대로 써요`
                      : difference > 0
                        ? `${withIGa(difference)} 모자라요. 합계가 결제 금액과 같아야 나눌 수 있어요.`
                        : `${withIGa(-difference)} 많아요. 합계가 결제 금액과 같아야 나눌 수 있어요.`}
                  </p>
                </>
              )}
            </div>
          </ScreenBody>

          <BottomActionBar>
            {submitError && <Banner message={submitError} />}
            <Button
              className={styles.primaryButton}
              disabled={!canSubmit}
              loading={submitting}
              loadingLabel="저장하고 있어요…"
              onClick={handleSubmit}
            >
              이대로 나누기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
