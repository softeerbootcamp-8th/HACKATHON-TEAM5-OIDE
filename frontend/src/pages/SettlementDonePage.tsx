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
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { useSettlement } from '../hooks/useSettlement';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SettlementDonePage.module.css';

/**
 * E-12 내 정산 완료.
 *
 * 참여자마다 정산을 끝내는 시각이 다르다. 전원이 끝나야 최종 송금 리스트를 볼 수 있다.
 */
export function SettlementDonePage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const { status, data, error, retry } = useSettlement(shareCode);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  const everyoneDone =
    data !== null && data.doneMemberIds.length >= data.room.members.length;

  return (
    <MobileFrame>
      <AppBar />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <ScreenHeader
              title="내 정산이 완료되었어요!"
              description={
                everyoneDone
                  ? '모두 정산을 마쳤어요. 최종 결과를 확인해보세요.'
                  : '다른 사람들의 정산이 끝날 때까지 기다려주세요.'
              }
            />
            <div className={styles.content}>
              <ul className={styles.cards}>
                {data.room.members.map((member) => {
                  const done = data.doneMemberIds.includes(member.id);
                  return (
                    <li key={member.id}>
                      <button
                        type="button"
                        className={`${styles.card} ${done ? '' : styles.pending}`}
                        onClick={() => navigate(memberSummaryPath(shareCode, member.id))}
                        disabled={!done}
                      >
                        <Avatar nickname={member.nickname} />
                        <span className={styles.nickname}>{member.nickname}</span>
                        <span className={styles.trailing}>
                          {done ? '내역 보기' : '정산 중'}
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

