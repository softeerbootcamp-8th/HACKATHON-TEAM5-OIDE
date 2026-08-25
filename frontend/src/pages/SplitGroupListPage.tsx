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
import { getPayments } from '../services/paymentService';
import { getRoomByShareCode } from '../services/roomService';
import { deleteSplitGroup, getSplitGroups } from '../services/splitGroupService';
import { isApiError } from '../types/api';
import type { Payment, SplitGroup } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import { formatAmount } from '../utils/formatters';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SplitGroupListPage.module.css';

interface GroupListData {
  room: SettlementRoom;
  groups: SplitGroup[];
  payments: Payment[];
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
    const [room, groups, payments] = await Promise.all([
      getRoomByShareCode(shareCode),
      getSplitGroups(shareCode),
      getPayments(shareCode),
    ]);
    return { room, groups, payments };
  }, [shareCode]);

  const { status, data, error, retry } = useAsync(load, [shareCode]);
  const [actionError, setActionError] = useState<string | null>(null);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  // 정산 대상으로 고른 항목만 그룹에 담을 수 있다.
  const targetPayments = data?.payments.filter((payment) => payment.includedInSettlement) ?? [];
  const hasGroups = (data?.groups.length ?? 0) > 1;

  const itemsOf = (groupId: string) =>
    targetPayments.filter((payment) => payment.splitGroupId === groupId);

  /** 담긴 항목의 합계. 통화가 섞이면 합산이 의미 없어 첫 항목의 통화를 기준으로 한다. */
  const totalLabelOf = (groupId: string) => {
    const items = itemsOf(groupId);
    if (items.length === 0) return undefined;
    const currency = items[0].currency;
    const total = items
      .filter((payment) => payment.currency === currency)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return `${currency} ${formatAmount(String(total), currency)}`;
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

  const handleComplete = () => {
    const unassigned = targetPayments.filter((payment) => payment.splitGroupId === null);
    // 어디에도 담기지 않은 항목은 `전체` 그룹으로 자동 귀속된다. 막지 않고 알리기만 한다.
    navigate(unassigned.length > 0 ? splitUnassignedPath(shareCode) : settlementStartPath(shareCode));
  };

  return (
    <MobileFrame>
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
              title="정산할 그룹을 추가해주세요"
              description={
                hasGroups ? undefined : '일부 인원만 낸 건이 있으면 그룹으로 묶으면 돼요.'
              }
            />
            <div className={styles.content}>
              <div className={styles.addRow}>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={() => navigate(splitGroupNewPath(shareCode))}
                  aria-label="그룹 추가"
                >
                  +
                </button>
              </div>

              <ul className={styles.groups}>
                {data.groups.map((group) => {
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

              {hasGroups && (
                <p className={styles.hint}>
                  {'그룹을 눌러 해당 그룹이 낼 항목을 골라주세요\n옆으로 밀면 삭제할 수 있어요'}
                </p>
              )}
            </div>
          </ScreenBody>

          <BottomActionBar>
            {actionError && <Banner message={actionError} />}
            <Button onClick={handleComplete}>환율 적용하기</Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}

