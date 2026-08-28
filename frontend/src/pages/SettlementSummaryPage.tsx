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
  uncompleteMySettlement,
} from '../services/settlementService';
import { isApiError } from '../types/api';
import { formatKrw, formatQuotedAt, formatRateLine } from '../utils/krw';
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

  const isReadOnly = viewMemberId !== identity.memberId;
  const viewMember = data?.members.find((member) => member.memberId === viewMemberId);
  const alreadyDone = data?.completedMemberIds.includes(identity.memberId) ?? false;
  const primaryRate =
    data?.rates.find((rate) => rate.currency !== 'KRW') ?? data?.rates[0];
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
      navigate(settlementDonePath(shareCode), { replace: true });
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '완료하지 못했어요.');
      setSubmitting(false);
    }
  };

  // 완료 상태를 유지한 채 그룹으로 돌아가면, 재확정 후에도 완료가 그대로 보존되어
  // "완료하기" 화면으로 다시 돌아오지 못한다. 수정하러 나가는 시점에 완료를 취소해둔다.
  const handleEdit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await uncompleteMySettlement(shareCode, identity.memberId);
      navigate(splitGroupsPath(shareCode), { replace: true });
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '수정하지 못했어요.');
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
                <Button
                  className={styles.action}
                  loading={submitting}
                  loadingLabel="이동하고 있어요…"
                  onClick={handleEdit}
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
