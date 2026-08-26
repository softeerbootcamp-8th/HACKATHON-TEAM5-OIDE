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
  transferListPath,
} from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getConfirmedSettlement } from '../services/settlementService';
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
  const load = useCallback(() => getConfirmedSettlement(shareCode), [shareCode]);
  const { status, data, error, retry } = useAsync(load, [shareCode]);

  const everyoneDone =
    data !== null && data.completedMemberIds.length === data.members.length;

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

  return (
    <MobileFrame tone="subtle">
      <AppBar />
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
                {data.members.map((member) => {
                  const isCompleted = data.completedMemberIds.includes(member.memberId);

                  return (
                    <li key={member.memberId}>
                      <button
                        type="button"
                        className={styles.card}
                        disabled={!isCompleted}
                        onClick={() =>
                          navigate(memberSummaryPath(shareCode, member.memberId))
                        }
                      >
                        <Avatar nickname={member.nickname} />
                        <span className={styles.nickname}>{member.nickname}</span>
                        <span className={styles.trailing}>
                          {isCompleted ? '내역 보기' : '정산 중'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </ScreenBody>

          <BottomActionBar>
            <Button
              className={styles.action}
              disabled={!everyoneDone}
              onClick={() => navigate(transferListPath(shareCode))}
            >
              최종 정산하기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
