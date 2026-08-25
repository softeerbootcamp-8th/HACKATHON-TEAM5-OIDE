import { useState } from 'react';
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
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { useSettlement } from '../hooks/useSettlement';
import { completeMySettlement } from '../services/settlementService';
import { isApiError } from '../types/api';
import { formatKrw, formatQuotedAt, formatRateLine } from '../utils/krw';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SettlementSummaryPage.module.css';

/**
 * E-05 참여자별 요약.
 *
 * 환율을 적용한 뒤 각자 부담할 금액을 보여준다.
 * 아직 확정하지 않았으면 `내 정산 완료하기`, 확정한 뒤 다시 들어오면 `수정하기` 가 뜬다.
 */
export function SettlementSummaryPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const [searchParams] = useSearchParams();
  const { identity } = useLocalIdentity(shareCode);
  const { status, data, error, retry } = useSettlement(shareCode);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  // E-12 에서 `내역 보기` 로 들어온 경우 그 사람의 요약을 본다.
  const viewMemberId = searchParams.get('member') ?? identity.memberId;
  const alreadyDone = data?.doneMemberIds.includes(identity.memberId) ?? false;

  const primaryRate = data?.rates.find((rate) =>
    data.targetPayments.some((payment) => payment.currency === rate.currency),
  );

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
    <MobileFrame>
      <AppBar backTo={settlementStartPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <ScreenHeader
              title="환율이 적용된 내 정산 내용이에요"
              description={
                primaryRate
                  ? `${formatRateLine(primaryRate.currency, primaryRate.rateToKrw)} · ${formatQuotedAt(primaryRate.quotedAt)}`
                  : undefined
              }
            />
            <div className={styles.content}>
              <ul className={styles.cards}>
                {data.result.members.map((member) => (
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

              {data.rateEditedBy && (
                <Banner message={`${data.rateEditedBy}님이 직접 입력한 환율이에요`} />
              )}
            </div>
          </ScreenBody>

          <BottomActionBar>
            {submitError && <Banner message={submitError} />}
            {alreadyDone ? (
              <Button onClick={() => navigate(splitGroupsPath(shareCode))}>수정하기</Button>
            ) : (
              <Button
                loading={submitting}
                loadingLabel="완료하고 있어요…"
                onClick={handleComplete}
              >
                내 정산 완료하기
              </Button>
            )}
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}

