import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { GroupCard } from '../components/split/GroupCard';
import { SwipeToDelete } from '../components/split/SwipeToDelete';
import {
  joinRoomPath,
  settlementStartPath,
  splitGroupItemsPath,
  splitGroupNewPath,
  splitUnassignedPath,
} from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { setPaymentSplit } from '../services/paymentService';
import { getRoomByShareCode } from '../services/roomService';
import { deleteSplitGroup, getSplitGroupOverview } from '../services/splitGroupService';
import { isApiError } from '../types/api';
import type { SplitGroup } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import { formatAmount, sumAmountsByCurrency } from '../utils/formatters';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SplitGroupListPage.module.css';

interface GroupListData {
  room: SettlementRoom;
  groups: SplitGroup[];
  payments: Awaited<ReturnType<typeof getSplitGroupOverview>>['payments'];
}

/**
 * D-01 · D-04 그룹 목록.
 *
 * `전체` 그룹은 방마다 하나씩 이미 있고 지울 수 없다.
 * 일부 인원만 낸 건이 있을 때만 `+` 로 조합 그룹을 만든다.
 */
export function SplitGroupListPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);

  const load = useCallback(async (): Promise<GroupListData> => {
    const [room, overview] = await Promise.all([
      getRoomByShareCode(shareCode),
      getSplitGroupOverview(shareCode),
    ]);
    return { room, groups: overview.groups, payments: overview.payments };
  }, [shareCode]);

  const { status, data, error, retry } = useAsync(load, [shareCode]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  // 정산 대상으로 고른 항목만 그룹에 담을 수 있다.
  const targetPayments = data?.payments ?? [];
  const visibleGroups =
    data?.groups.filter((group) => group.memberIds.includes(identity.memberId)) ?? [];
  const itemsOf = (groupId: string) =>
    targetPayments.filter((payment) => payment.splitGroupId === groupId);

  const totalLabelOf = (groupId: string) => {
    const items = itemsOf(groupId);
    if (items.length === 0) return undefined;
    const [firstTotal, ...otherTotals] = sumAmountsByCurrency(items);
    const firstLabel = `${firstTotal.currency} ${formatAmount(
      String(firstTotal.amount),
      firstTotal.currency,
    )}`;
    return otherTotals.length > 0 ? `${firstLabel} · …` : firstLabel;
  };

  const handleDelete = async (group: SplitGroup) => {
    setActionError(null);
    try {
      await deleteSplitGroup(shareCode, group.id);
      retry();
    } catch (caught) {
      setActionError(isApiError(caught) ? caught.message : '그룹을 지우지 못했어요.');
    }
  };

  const handleComplete = async () => {
    const unassigned = targetPayments.filter((payment) => payment.splitGroupId === null);
    const defaultEqualPayments = targetPayments.filter(
      (payment) => payment.splitGroupId !== null && payment.splitMethod === null,
    );

    setCompleting(true);
    setActionError(null);
    try {
      await Promise.all(
        defaultEqualPayments.map((payment) =>
          setPaymentSplit(shareCode, payment.id, 'EQUAL', []),
        ),
      );
      navigate(
        unassigned.length > 0
          ? splitUnassignedPath(shareCode)
          : settlementStartPath(shareCode),
      );
    } catch (caught) {
      setActionError(isApiError(caught) ? caught.message : 'N빵 금액을 저장하지 못했어요.');
      setCompleting(false);
    }
  };

  return (
    <MobileFrame tone="white">
      <AppBar />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState
          title="그룹을 불러오지 못했어요"
          description={error?.message}
          onRetry={retry}
        />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <ScreenHeader
              className={styles.screenHeader}
              title="정산할 그룹을 추가해주세요"
              description={
                <>
                  그룹을 눌러 해당 그룹에 n빵할 항목을 골라주세요
                  <br />
                  옆으로 밀면 삭제할 수 있어요
                </>
              }
            />
            <div className={styles.content}>
              <ul className={styles.groups}>
                {visibleGroups.map((group) => {
                  const card = (
                    <GroupCard
                      group={group}
                      members={data.room.members}
                      itemCount={itemsOf(group.id).length}
                      totalLabel={totalLabelOf(group.id)}
                      onOpen={() => navigate(splitGroupItemsPath(shareCode, group.id))}
                    />
                  );

                  return (
                    <li key={group.id}>
                      {/* `전체` 그룹은 방의 기본값이라 지울 수 없다. */}
                      {group.type === 'ALL' ? (
                        card
                      ) : (
                        <SwipeToDelete label={group.name} onDelete={() => handleDelete(group)}>
                          {card}
                        </SwipeToDelete>
                      )}
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                className={styles.addButton}
                onClick={() => navigate(splitGroupNewPath(shareCode))}
              >
                + 추가하기
              </button>
            </div>
          </ScreenBody>

          <BottomActionBar>
            {actionError && <Banner message={actionError} />}
            <Button
              className={styles.primaryButton}
              loading={completing}
              loadingLabel="N빵을 저장하고 있어요…"
              onClick={handleComplete}
            >
              환율 적용하기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
