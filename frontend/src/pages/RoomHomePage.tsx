import { useCallback } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { MemberEntryCard } from '../components/room/MemberEntryCard';
import { RoomSummaryHeader } from '../components/room/RoomSummaryHeader';
import {
  expenseMethodPath,
  joinRoomPath,
  myExpensesPath,
  settlementDonePath,
} from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import {
  getMemberPaymentSummaries,
} from '../services/memberService';
import { getRoomByShareCode } from '../services/roomService';
import { getConfirmedSettlement } from '../services/settlementService';
import type { MemberPaymentSummary } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './RoomHomePage.module.css';

interface RoomHomeData {
  room: SettlementRoom;
  summaries: MemberPaymentSummary[];
  /** 정산이 아직 확정되지 않았으면 null. */
  completedMemberIds: string[] | null;
}

/**
 * B-01 정산방.
 *
 * 등록된 결제 내역이 없으면 빈 상태, 있으면 참여자별 등록 요약을 보여준다.
 */
export function RoomHomePage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);

  const load = useCallback(async (): Promise<RoomHomeData> => {
    const [room, summaries, completedMemberIds] = await Promise.all([
      getRoomByShareCode(shareCode),
      getMemberPaymentSummaries(shareCode),
      // 정산이 아직 확정되지 않은 방이 더 흔한 경우라, 그 실패는 무시하고 진행한다.
      getConfirmedSettlement(shareCode)
        .then((settlement) => settlement.completedMemberIds)
        .catch(() => null),
    ]);
    return { room, summaries, completedMemberIds };
  }, [shareCode]);

  const { status, data, error, retry } = useAsync(load, [shareCode]);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  if (status === 'success' && data?.completedMemberIds?.includes(identity.memberId)) {
    return <Navigate to={settlementDonePath(shareCode)} replace />;
  }

  const hasEntries = (data?.summaries.length ?? 0) > 0;

  return (
    <MobileFrame>
      {/* 참여자의 홈. 링크로 바로 들어왔다면 되돌아갈 곳이 없다. */}
      <AppBar />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState
          title="정산방을 불러오지 못했어요"
          description={error?.message}
          onRetry={retry}
        />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <RoomSummaryHeader
              title={data.room.title}
              nicknames={data.room.members.map((member) => member.nickname)}
            />

            {hasEntries ? (
              <ul className={styles.memberList}>
                {data.summaries.map((summary) => (
                  <li key={summary.memberId}>
                    <MemberEntryCard
                      nickname={summary.nickname}
                      paymentCount={summary.paymentCount}
                      onViewEntries={() => navigate(myExpensesPath(shareCode))}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="아직 등록된 결제 내역이 없어요"
                description="결제 내역을 추가하고 정산을 요청하세요"
              />
            )}
          </ScreenBody>
          <BottomActionBar>
            <Button onClick={() => navigate(expenseMethodPath(shareCode))}>
              결제 내역 추가
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
