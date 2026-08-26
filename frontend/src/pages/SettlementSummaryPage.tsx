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
import {
  completeMySettlement,
  getConfirmedSettlement,
} from '../services/settlementService';
import { isApiError } from '../types/api';
import { formatKrw, formatQuotedAt, formatRateLine } from '../utils/krw';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SettlementSummaryPage.module.css';

/**
 * E-05 참여자별 요약.
 *
 * 확정된 정산 결과에서 환율과 참여자별 부담 금액을 보여준다.
 */
export function SettlementSummaryPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const [searchParams] = useSearchParams();
  const { identity } = useLocalIdentity(shareCode);
  const load = useCallback(() => getConfirmedSettlement(shareCode), [shareCode]);
  const { status, data, error, retry } = useAsync(load, [shareCode]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  // E-12 에서 `내역 보기` 로 들어온 경우 그 사람의 요약을 본다.
  const selectedMemberId = searchParams.get('member');
  const viewMemberId = selectedMemberId ?? identity.memberId;
  const isReadOnly = selectedMemberId !== null;
  const alreadyDone = data?.completedMemberIds.includes(identity.memberId) ?? false;
  const primaryRate = data?.rates.find((rate) => rate.currency !== 'KRW');

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
      <AppBar backTo={settlementStartPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <ScreenHeader
              className={styles.header}
              title="환율이 적용된 내 정산 내용이에요"
              description={
                primaryRate?.rateToKrw && primaryRate.quotedAt
                  ? `${formatRateLine(primaryRate.currency, primaryRate.rateToKrw)} · ${formatQuotedAt(primaryRate.quotedAt)}`
                  : undefined
              }
            />
            <div className={styles.content}>
              <ul className={styles.cards}>
                {data.members.map((member) => (
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
