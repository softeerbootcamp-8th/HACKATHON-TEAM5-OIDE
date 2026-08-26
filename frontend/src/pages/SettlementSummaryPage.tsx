import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import {
  joinRoomPath,
  settlementDonePath,
  settlementStartPath,
  splitGroupsPath,
} from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getPaymentShares, getPayments } from '../services/paymentService';
import {
  completeMySettlement,
  getConfirmedSettlement,
} from '../services/settlementService';
import { isApiError } from '../types/api';
import type { Payment, PaymentShare } from '../types/payment';
import { formatAmount, formatDayTime } from '../utils/formatters';
import { formatQuotedAt, formatRateLine } from '../utils/krw';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SettlementSummaryPage.module.css';

interface SettlementHistoryData {
  settlement: Awaited<ReturnType<typeof getConfirmedSettlement>>;
  payments: Payment[];
  sharesByPaymentId: Record<string, PaymentShare[]>;
}

/**
 * E-05 참여자별 결제 내역.
 *
 * 참여자가 올린 정산 대상 결제와 결제별 분담 금액을 보여준다.
 */
export function SettlementSummaryPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const [searchParams] = useSearchParams();
  const { identity } = useLocalIdentity(shareCode);
  const selectedMemberId = searchParams.get('member');
  const viewMemberId = selectedMemberId ?? identity?.memberId ?? '';
  const load = useCallback(async (): Promise<SettlementHistoryData> => {
    const [settlement, paymentList] = await Promise.all([
      getConfirmedSettlement(shareCode),
      getPayments(shareCode),
    ]);
    const payments = paymentList.filter(
      (payment) =>
        payment.payerMemberId === viewMemberId && payment.includedInSettlement,
    );
    const shareLists = await Promise.all(
      payments.map((payment) => getPaymentShares(shareCode, payment.id)),
    );
    return {
      settlement,
      payments,
      sharesByPaymentId: Object.fromEntries(
        payments.map((payment, index) => [payment.id, shareLists[index]]),
      ),
    };
  }, [shareCode, viewMemberId]);
  const { status, data, error, retry } = useAsync(load, [shareCode, viewMemberId]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  const isReadOnly = selectedMemberId !== null;
  const settlement = data?.settlement;
  const viewMember = settlement?.members.find((member) => member.memberId === viewMemberId);
  const alreadyDone = settlement?.completedMemberIds.includes(identity.memberId) ?? false;
  const primaryRate = settlement?.rates.find((rate) => rate.currency !== 'KRW');
  const title =
    viewMemberId === identity.memberId
      ? '환율이 적용된 내 정산 내용이에요'
      : `${viewMember?.nickname ?? ''}님의 정산내역이에요`;

  if (status === 'success' && !viewMember) {
    return <Navigate to={settlementDonePath(shareCode)} replace />;
  }

  const handleComplete = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await completeMySettlement(shareCode, identity.memberId);
      navigate(settlementDonePath(shareCode));
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '완료하지 못했어요.');
      setSubmitting(false);
    }
  };

  return (
    <MobileFrame tone="subtle">
      <AppBar
        backTo={isReadOnly ? settlementDonePath(shareCode) : settlementStartPath(shareCode)}
      />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && viewMember && (
        <>
          <ScreenBody>
            <ScreenHeader
              className={styles.header}
              title={title}
              description={
                primaryRate?.rateToKrw && primaryRate.quotedAt
                  ? `${formatRateLine(primaryRate.currency, primaryRate.rateToKrw)} · ${formatQuotedAt(primaryRate.quotedAt)}`
                  : undefined
              }
            />
            <div className={styles.content}>
              {data.payments.length === 0 ? (
                <EmptyState title="정산에 포함된 결제 내역이 없어요" />
              ) : (
                <ul className={styles.payments}>
                  {data.payments.map((payment) => (
                    <li key={payment.id} className={styles.paymentCard}>
                      <div className={styles.paymentHeader}>
                        <span className={styles.paymentInfo}>
                          <span className={styles.merchant}>
                            {payment.merchant ?? '결제처 없음'}
                          </span>
                          <span className={styles.paymentMeta}>
                            {payment.paidAt ? `${formatDayTime(payment.paidAt)} · ` : ''}
                            {payment.currency}
                          </span>
                        </span>
                        <span className={styles.paymentAmount}>
                          {formatAmount(payment.amount, payment.currency)}
                        </span>
                      </div>
                      <ul className={styles.shares}>
                        {(data.sharesByPaymentId[payment.id] ?? []).map((share) => {
                          const member = data.settlement.members.find(
                            (item) => item.memberId === share.memberId,
                          );
                          if (!member) return null;
                          return (
                            <li key={share.id} className={styles.shareRow}>
                              <Avatar nickname={member.nickname} />
                              <span className={styles.nickname}>{member.nickname}</span>
                              <span className={styles.shareAmount}>
                                {formatAmount(share.shareAmount, payment.currency)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ScreenBody>

          {!isReadOnly && (
            <BottomActionBar>
              {submitError && <Banner message={submitError} />}
              {alreadyDone ? (
                <Button className={styles.action} onClick={() => navigate(splitGroupsPath(shareCode))}>
                  수정하기
                </Button>
              ) : (
                <Button
                  className={styles.action}
                  loading={submitting}
                  loadingLabel="완료하고 있어요…"
                  onClick={handleComplete}
                >
                  내 정산 완료하기
                </Button>
              )}
            </BottomActionBar>
          )}
        </>
      )}
    </MobileFrame>
  );
}
