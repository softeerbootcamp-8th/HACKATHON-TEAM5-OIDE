import { useCallback, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
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
  memberSummaryPath,
  roomHomePath,
  settlementSummaryPath,
  transferListPath,
} from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import {
  getConfirmedSettlement,
  getSettlementProgress,
} from '../services/settlementService';
import { isApiError } from '../types/api';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SettlementDonePage.module.css';

/**
 * E-12 내 정산 완료.
 *
 * 방 단위로 확정된 참여자별 결과를 보여주고 최종 송금 리스트로 이동한다.
 */
export function SettlementDonePage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const load = useCallback(async () => {
    const [progress, settlement] = await Promise.all([
      getSettlementProgress(shareCode),
      getConfirmedSettlement(shareCode).catch((caught) => {
        if (isApiError(caught) && caught.code === 'SETTLEMENT_NOT_FOUND') return null;
        throw caught;
      }),
    ]);
    return { progress, settlement };
  }, [shareCode]);
  const { status, data, error, retry } = useAsync(load, [shareCode]);

  const everyoneDone = data?.progress.allCompleted ?? false;

  useEffect(() => {
    if (status !== 'success' || everyoneDone) return;
    const intervalId = window.setInterval(retry, 3000);
    return () => window.clearInterval(intervalId);
  }, [everyoneDone, retry, status]);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  if (
    status === 'success' &&
    data &&
    !data.progress.members.find((member) => member.memberId === identity.memberId)?.completed
  ) {
    const currentMember = data.progress.members.find(
      (member) => member.memberId === identity.memberId,
    );
    return (
      <Navigate
        to={
          currentMember?.hasPayments && data.settlement
            ? settlementSummaryPath(shareCode)
            : roomHomePath(shareCode)
        }
        replace
      />
    );
  }

  return (
    <MobileFrame tone="subtle">
      <AppBar fixedBackTo={roomHomePath(shareCode)} />
      {status === 'loading' && !data && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status !== 'error' && data && (
        <>
          <ScreenBody>
            <ScreenHeader
              className={styles.header}
              title={
                <>
                  <span className={styles.highlight}>내 정산</span>이 완료되었어요!
                </>
              }
              description={
                everyoneDone
                  ? '모두 정산을 마쳤어요. 최종 결과를 확인해보세요.'
                  : '다른 사람들의 정산이 끝날 때까지 기다려주세요.'
              }
            />
            <div className={styles.content}>
              <ul className={styles.cards}>
                {data.progress.members.map((member) => {
                  const canViewDetails = member.completed && member.hasPayments && data.settlement;
                  const cardContent = (
                    <>
                      <Avatar nickname={member.nickname} />
                      <span className={styles.nickname}>{member.nickname}</span>
                      {member.hasPayments && (
                        <span className={styles.trailing}>
                          {member.completed ? '내역 보기' : '정산 중'}
                        </span>
                      )}
                    </>
                  );

                  return (
                    <li key={member.memberId}>
                      {canViewDetails ? (
                        <button
                          type="button"
                          className={styles.card}
                          onClick={() =>
                            navigate(memberSummaryPath(shareCode, member.memberId))
                          }
                        >
                          {cardContent}
                        </button>
                      ) : (
                        <div className={`${styles.card} ${!member.completed ? styles.pending : ''}`}>
                          {cardContent}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </ScreenBody>

          <BottomActionBar>
            <Button
              className={styles.action}
              disabled={!everyoneDone || !data.settlement || !data.progress.hasAnyPayments}
              onClick={() => navigate(transferListPath(shareCode))}
            >
              {everyoneDone && !data.progress.hasAnyPayments
                ? '정산할 거래가 없어요'
                : '최종 정산하기'}
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
