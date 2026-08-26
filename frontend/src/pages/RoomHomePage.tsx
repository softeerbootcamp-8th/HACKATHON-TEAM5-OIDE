import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/common/Banner';
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
  memberSummaryPath,
  settlementDonePath,
} from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getMemberPaymentSummaries } from '../services/memberService';
import { getRoomByShareCode } from '../services/roomService';
import {
  completeWithoutPayments,
  getSettlementProgress,
} from '../services/settlementService';
import { isApiError } from '../types/api';
import type { MemberPaymentSummary } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './RoomHomePage.module.css';

interface RoomHomeData {
  room: SettlementRoom;
  summaries: MemberPaymentSummary[];
  completedMemberIds: string[];
  currentMemberHasPayments: boolean;
  currentMemberCompleted: boolean;
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
    const [room, summaries, progress] = await Promise.all([
      getRoomByShareCode(shareCode),
      getMemberPaymentSummaries(shareCode),
      getSettlementProgress(shareCode),
    ]);
    const currentMember = progress.members.find(
      (member) => member.memberId === identity?.memberId,
    );
    return {
      room,
      summaries,
      completedMemberIds: progress.members
        .filter((member) => member.completed)
        .map((member) => member.memberId),
      currentMemberHasPayments: currentMember?.hasPayments ?? false,
      currentMemberCompleted: currentMember?.completed ?? false,
    };
  }, [shareCode, identity?.memberId]);

  const { status, data, error, retry } = useAsync(load, [shareCode, identity?.memberId]);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  const completedSummaries =
    data?.summaries.filter((summary) =>
      data.completedMemberIds?.includes(summary.memberId),
    ) ?? [];
  const hasEntries = completedSummaries.length > 0;

  const handleSkipPayments = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await completeWithoutPayments(shareCode, identity.memberId);
      navigate(settlementDonePath(shareCode), { replace: true });
    } catch (caught) {
      setActionError(isApiError(caught) ? caught.message : '완료하지 못했어요.');
      setSubmitting(false);
    }
  };

  return (
    <MobileFrame tone="white">
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
                {completedSummaries.map((summary) => (
                  <li key={summary.memberId}>
                    <MemberEntryCard
                      nickname={summary.nickname}
                      paymentCount={summary.paymentCount}
                      onViewEntries={() =>
                        navigate(memberSummaryPath(shareCode, summary.memberId))
                      }
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
            {actionError && <Banner message={actionError} />}
            <Button onClick={() => navigate(expenseMethodPath(shareCode))}>
              결제 내역 추가하기
            </Button>
            {data.currentMemberCompleted ? (
              <Button
                variant="text"
                onClick={() => navigate(settlementDonePath(shareCode))}
              >
                정산 현황 보기
              </Button>
            ) : !data.currentMemberHasPayments ? (
              <Button
                variant="text"
                loading={submitting}
                loadingLabel="완료하고 있어요…"
                onClick={handleSkipPayments}
              >
                결제 내역 없이 넘어가기
              </Button>
            ) : null}
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
