import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
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
import { getRoomByShareCode } from '../services/roomService';
import {
  completeMySettlement,
  getConfirmedSettlement,
  getSettlementProgress,
} from '../services/settlementService';
import { isApiError } from '../types/api';
import { formatKrw, formatQuotedAt, formatRateLine } from '../utils/krw';
import { calculateSettlement } from '../utils/settlementCalculation';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SettlementSummaryPage.module.css';

/**
 * E-05 참여자별 정산 요약.
 *
 * 확정된 정산 결과에서 참여자별 합산 부담 금액을 보여준다.
 */
export function SettlementSummaryPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const [searchParams] = useSearchParams();
  const { identity } = useLocalIdentity(shareCode);
  const selectedMemberId = searchParams.get('member');
  const viewMemberId = selectedMemberId ?? identity?.memberId ?? '';
  const load = useCallback(async () => {
    const progress = await getSettlementProgress(shareCode);
    const targetMember = progress.members.find((member) => member.memberId === viewMemberId);
    if (!targetMember?.hasPayments) {
      return { progress, settlement: null, summaryMembers: [] };
    }

    const [settlement, room, payments] = await Promise.all([
      getConfirmedSettlement(shareCode),
      getRoomByShareCode(shareCode),
      getPayments(shareCode, viewMemberId),
    ]);
    const includedPayments = payments.filter((payment) => payment.includedInSettlement);
    const shareLists = await Promise.all(
      includedPayments.map((payment) => getPaymentShares(shareCode, payment.id)),
    );
    const rates = Object.fromEntries(
      settlement.rates
        .filter((rate) => rate.rateToKrw !== null)
        .map((rate) => [rate.currency, Number(rate.rateToKrw)]),
    );
    const result = calculateSettlement({
      members: room.members,
      payments: includedPayments,
      shares: shareLists.flat(),
      rates,
      fallbackMemberIds: room.members.map((member) => member.id),
    });
    return { progress, settlement, summaryMembers: result.members };
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

  const isReadOnly = viewMemberId !== identity.memberId;
  const viewMember = data?.progress.members.find((member) => member.memberId === viewMemberId);
  const alreadyDone =
    data?.progress.members.find((member) => member.memberId === identity.memberId)?.completed ??
    false;
  const primaryRate =
    data?.settlement?.rates.find((rate) => rate.currency !== 'KRW') ??
    data?.settlement?.rates[0];
  const title =
    viewMemberId === identity.memberId
      ? '환율이 적용된 내 정산 내용이에요'
      : `${viewMember?.nickname ?? ''}님의 정산내역이에요`;

  if (status === 'success' && (!viewMember || !viewMember.hasPayments || !data?.settlement)) {
    return <Navigate to={settlementDonePath(shareCode)} replace />;
  }

  const handleComplete = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await completeMySettlement(shareCode, identity.memberId);
      navigate(settlementDonePath(shareCode), { replace: true });
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '완료하지 못했어요.');
      setSubmitting(false);
    }
  };

  return (
    <MobileFrame tone="subtle">
      <AppBar
        backTo={
          isReadOnly || alreadyDone
            ? settlementDonePath(shareCode)
            : settlementStartPath(shareCode)
        }
      />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data?.settlement && viewMember && (
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
              <ul className={styles.cards}>
                {data.summaryMembers.map((member) => (
                  <li
                    key={member.memberId}
                    className={`${styles.card} ${member.memberId === viewMemberId ? styles.mine : ''}`}
                  >
                    <Avatar nickname={member.nickname} />
                    <span className={styles.nickname}>
                      {member.nickname}
                      {member.memberId === identity.memberId ? ' (나)' : ''}
                    </span>
                    <span className={styles.amount}>{formatKrw(member.owedKrw)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScreenBody>

          {!isReadOnly && (
            <BottomActionBar>
              {submitError && <Banner message={submitError} />}
              {alreadyDone ? (
                <Button
                  className={styles.action}
                  onClick={() => navigate(splitGroupsPath(shareCode), { replace: true })}
                >
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
