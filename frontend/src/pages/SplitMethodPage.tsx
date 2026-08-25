import { useCallback, useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AvatarStack } from '../components/common/AvatarStack';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { joinRoomPath, splitGroupsPath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getPayments } from '../services/paymentService';
import { getRoomByShareCode } from '../services/roomService';
import { getSplitGroups } from '../services/splitGroupService';
import type { Payment, SplitGroup } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import { formatAmount, formatDayTime } from '../utils/formatters';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SplitMethodPage.module.css';

interface MethodData {
  room: SettlementRoom;
  groups: SplitGroup[];
  payments: Payment[];
}

/**
 * D-05 금액 나누기.
 *
 * 그룹에 담은 항목은 모두 N빵이 기본이다. 다르게 나눌 항목만 눌러서 바꾸는데,
 * 그 상세 화면은 다음 범위라 아직 붙이지 않았다.
 */
export function SplitMethodPage() {
  const navigate = useNavigate();
  const { shareCode = '', groupId = '' } = useParams<{ shareCode: string; groupId: string }>();
  const { identity } = useLocalIdentity(shareCode);

  const load = useCallback(async (): Promise<MethodData> => {
    const [room, groups, payments] = await Promise.all([
      getRoomByShareCode(shareCode),
      getSplitGroups(shareCode),
      getPayments(shareCode),
    ]);
    return { room, groups, payments };
  }, [shareCode]);

  const { status, data, error, retry } = useAsync(load, [shareCode, groupId]);

  const group = data?.groups.find((item) => item.id === groupId);
  const items = useMemo(
    () => data?.payments.filter((payment) => payment.splitGroupId === groupId) ?? [],
    [data, groupId],
  );

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  if (status === 'success' && !group) {
    return <Navigate to={splitGroupsPath(shareCode)} replace />;
  }

  const nicknames =
    group?.memberIds
      .map((id) => data?.room.members.find((member) => member.id === id)?.nickname)
      .filter((nickname): nickname is string => Boolean(nickname)) ?? [];

  return (
    <MobileFrame>
      <AppBar />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && group && (
        <>
          <ScreenBody>
            <ScreenHeader
              title="결제 금액을 어떻게 나눌까요?"
              description={'모두 n빵으로 계산해요.\n다르게 나눌 항목만 선택해 주세요.'}
            />
            <div className={styles.avatars}>
              <AvatarStack nicknames={nicknames} size="md" />
            </div>

            {items.length === 0 ? (
              <EmptyState
                title="이 그룹이 낼 항목이 없어요"
                description="앞 화면에서 항목을 골라주세요"
              />
            ) : (
              <div className={styles.content}>
                <ul className={styles.rows}>
                  {items.map((payment) => (
                    <li key={payment.id} className={styles.row}>
                      <span className={styles.body}>
                        <span className={styles.merchant}>
                          {payment.merchant ?? '결제처 없음'}
                        </span>
                        <span className={styles.amount}>
                          {formatAmount(payment.amount, payment.currency)}
                        </span>
                        <span className={styles.meta}>
                          {payment.paidAt ? `${formatDayTime(payment.paidAt)} · ` : ''}
                          {payment.currency}
                        </span>
                      </span>
                      <span className={styles.method}>
                        {payment.splitMethod === 'CUSTOM' ? '직접 분배' : 'n빵'}
                        <span className={styles.chevron} aria-hidden="true">
                          ›
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ScreenBody>

          <BottomActionBar>
            <Button onClick={() => navigate(splitGroupsPath(shareCode))}>완료하기</Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
