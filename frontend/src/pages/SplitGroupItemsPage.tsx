import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/common/Banner';
import { AvatarStack } from '../components/common/AvatarStack';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { DateSectionHeader } from '../components/expense/DateSectionHeader';
import { ExpenseCheckRow } from '../components/expense/ExpenseCheckRow';
import { ManualExpenseModal } from '../components/expense/ManualExpenseModal';
import { AppBar } from '../components/layout/AppBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { SelectionBottomBar } from '../components/split/SelectionBottomBar';
import {
  joinRoomPath,
  splitGroupEditPath,
  splitGroupMethodPath,
  splitGroupsPath,
} from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { createPayments } from '../services/paymentService';
import { getRoomByShareCode } from '../services/roomService';
import {
  assignPaymentsToGroup,
  getSplitGroupOverview,
  type SplitGroupPaymentSummary,
} from '../services/splitGroupService';
import { isApiError } from '../types/api';
import type { CreatePaymentInput, SplitGroup } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import {
  formatAmount,
  formatDateSection,
  sumAmountsByCurrency,
  toDateKey,
} from '../utils/formatters';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SplitGroupItemsPage.module.css';

interface ItemsData {
  room: SettlementRoom;
  groups: SplitGroup[];
  payments: SplitGroupPaymentSummary[];
}

/**
 * D-05 · D-06 그룹이 낼 항목 선택.
 *
 * 한 항목은 한 그룹에만 속한다. 다른 그룹이 이미 가져간 항목은 목록에 남기되
 * 고를 수 없게 하고 어느 그룹에 담겼는지 보여준다.
 */
export function SplitGroupItemsPage() {
  const navigate = useNavigate();
  const { shareCode = '', groupId = '' } = useParams<{ shareCode: string; groupId: string }>();
  const { identity } = useLocalIdentity(shareCode);

  const load = useCallback(async (): Promise<ItemsData> => {
    const [room, overview] = await Promise.all([
      getRoomByShareCode(shareCode),
      getSplitGroupOverview(shareCode),
    ]);
    return { room, groups: overview.groups, payments: overview.payments };
  }, [shareCode]);

  const { status, data, error, retry } = useAsync(load, [shareCode, groupId]);

  const [picked, setPicked] = useState<string[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const group = data?.groups.find((item) => item.id === groupId);

  // 정산 대상으로 고른 항목만 다룬다.
  const targetPayments = useMemo(
    () => data?.payments ?? [],
    [data],
  );

  // 이미 이 그룹에 담긴 항목을 미리 골라둔 상태로 연다.
  const initialSelection = useMemo(
    () => targetPayments.filter((p) => p.splitGroupId === groupId).map((p) => p.id),
    [targetPayments, groupId],
  );
  const selected = picked ?? initialSelection;

  const sections = useMemo(() => groupByDate(targetPayments), [targetPayments]);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  if (status === 'success' && !group) {
    return <Navigate to={splitGroupsPath(shareCode)} replace />;
  }

  const groupNameOf = (id: string | null) =>
    data?.groups.find((item) => item.id === id)?.name ?? '';

  const isTaken = (payment: SplitGroupPaymentSummary) =>
    payment.splitGroupId !== null && payment.splitGroupId !== groupId;

  // 한 번의 렌더 안에서 여러 번 눌려도 앞선 선택이 사라지지 않도록 함수형으로 갱신한다.
  const toggle = (paymentId: string) => {
    setPicked((current) => {
      const base = current ?? initialSelection;
      return base.includes(paymentId)
        ? base.filter((id) => id !== paymentId)
        : [...base, paymentId];
    });
  };

  const toggleSection = (items: SplitGroupPaymentSummary[]) => {
    const selectable = items.filter((item) => !isTaken(item)).map((item) => item.id);
    setPicked((current) => {
      const base = current ?? initialSelection;
      const allPicked = selectable.every((id) => base.includes(id));
      return allPicked
        ? base.filter((id) => !selectable.includes(id))
        : [...new Set([...base, ...selectable])];
    });
  };

  const selectedPayments = targetPayments.filter((payment) => selected.includes(payment.id));
  const currencyTotals = sumAmountsByCurrency(selectedPayments);
  const totalLabel =
    currencyTotals.length < 2
      ? formatAmount(
          String(currencyTotals[0]?.amount ?? 0),
          currencyTotals[0]?.currency ?? 'JPY',
        )
      : currencyTotals
          .map(({ currency, amount }) => `${currency} ${formatAmount(String(amount), currency)}`)
          .join(' · ');

  const handleAddMissing = async (input: CreatePaymentInput) => {
    setSubmitting(true);
    setActionError(null);
    try {
      // 여기서 넣는 건 이 그룹에 담으려고 추가하는 것이라 곧바로 정산 대상이다.
      const [created] = await createPayments(shareCode, identity.memberId, [
        { ...input, includedInSettlement: true },
      ]);
      if (created) {
        setPicked((current) => [...(current ?? initialSelection), created.id]);
      }
      setModalOpen(false);
      setSubmitting(false);
      retry();
    } catch (caught) {
      setActionError(isApiError(caught) ? caught.message : '등록하지 못했어요.');
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await assignPaymentsToGroup(shareCode, groupId, selected);
      navigate(splitGroupMethodPath(shareCode, groupId));
    } catch (caught) {
      setActionError(isApiError(caught) ? caught.message : '저장하지 못했어요.');
      setSubmitting(false);
    }
  };

  const nicknames =
    group?.memberIds
      .map((id) => data?.room.members.find((member) => member.id === id)?.nickname)
      .filter((nickname): nickname is string => Boolean(nickname)) ?? [];

  const isAllGroup = group?.type === 'ALL';
  const title = isAllGroup
    ? '전체인원이 정산할\n목록을 선택해주세요'
    : `${group?.name}이 정산할\n목록을 선택해주세요`;

  return (
    <MobileFrame tone="subtle">
      <AppBar backTo={splitGroupsPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && group && (
        <>
          <ScreenBody>
            <ScreenHeader className={styles.screenHeader} title={title} />
            <div className={styles.header}>
              <AvatarStack nicknames={nicknames} size="md" />
              {/* `전체` 는 방 인원 그대로라 고칠 수 없다. */}
              {!isAllGroup && (
                <button
                  type="button"
                  className={styles.editLink}
                  onClick={() => navigate(splitGroupEditPath(shareCode, groupId))}
                >
                  수정하기
                </button>
              )}
            </div>

            {targetPayments.length === 0 ? (
              <EmptyState
                title="담을 결제 내역이 없어요"
                description="정산할 항목을 먼저 골라주세요"
              />
            ) : (
              <div className={styles.content}>
                {sections.map((section) => (
                  <section key={section.key} className={styles.section}>
                    <div className={styles.sectionHead}>
                      <DateSectionHeader label={section.label} />
                      <button
                        type="button"
                        className={styles.selectAll}
                        onClick={() => toggleSection(section.items)}
                      >
                        전체 선택
                      </button>
                    </div>
                    <div className={styles.rows}>
                      {section.items.map((payment) => (
                        <ExpenseCheckRow
                          key={payment.id}
                          payment={payment}
                          checked={selected.includes(payment.id)}
                          assignedGroupName={
                            isTaken(payment) ? groupNameOf(payment.splitGroupId) : undefined
                          }
                          onToggle={() => toggle(payment.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                <button
                  type="button"
                  className={styles.addMissing}
                  onClick={() => setModalOpen(true)}
                >
                  빠뜨린 항목 추가하기
                </button>
              </div>
            )}

            {actionError && !modalOpen && <Banner message={actionError} />}
          </ScreenBody>

          <SelectionBottomBar
            selectedCount={selected.length}
            totalLabel={totalLabel}
            actionLabel="다음"
            disabled={submitting}
            onAction={handleNext}
          />

          {modalOpen && (
            <ManualExpenseModal
              defaultCurrency={data.room.defaultCurrency}
              submitting={submitting}
              errorMessage={actionError}
              onSubmit={handleAddMissing}
              onClose={() => {
                setModalOpen(false);
                setActionError(null);
              }}
            />
          )}
        </>
      )}
    </MobileFrame>
  );
}

interface DateSection {
  key: string;
  label: string;
  items: SplitGroupPaymentSummary[];
}

/** 결제 시각 기준으로 날짜별로 묶는다. 시각을 모르는 건 마지막 묶음으로 보낸다. */
function groupByDate(payments: SplitGroupPaymentSummary[]): DateSection[] {
  const sections: DateSection[] = [];
  for (const payment of payments) {
    const key = payment.paidAt ? toDateKey(payment.paidAt) : 'unknown';
    const label = payment.paidAt ? formatDateSection(payment.paidAt) : '날짜 모름';
    const existing = sections.find((section) => section.key === key);
    if (existing) existing.items.push(payment);
    else sections.push({ key, label, items: [payment] });
  }
  return sections;
}
