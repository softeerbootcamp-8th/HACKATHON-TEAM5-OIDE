import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { DateSectionHeader } from '../components/expense/DateSectionHeader';
import { ExpenseCheckRow } from '../components/expense/ExpenseCheckRow';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import {
  expenseMethodPath,
  joinRoomPath,
  manualExpensePath,
  roomHomePath,
  splitGroupsPath,
} from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getPayments, updatePaymentInclusion } from '../services/paymentService';
import { getRoomByShareCode } from '../services/roomService';
import { isApiError } from '../types/api';
import type { Payment } from '../types/payment';
import type { SettlementRoom } from '../types/room';
import { formatDateSection, toDateKey } from '../utils/formatters';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './MyExpenseListPage.module.css';

interface ExpenseListData {
  room: SettlementRoom;
  payments: Payment[];
}

/**
 * B-02 결제 내역 리스트.
 *
 * 날짜별로 묶고, 각 행의 원형 체크로 정산에 포함할지 고른다.
 * 개인 지출은 여기서 빼면 된다 (FR-02).
 */
export function MyExpenseListPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const myMemberId = identity?.memberId;

  // CTA 가 `내 정산 인원 선택하기` 이므로 이 화면은 내가 등록한 내역만 다룬다.
  const load = useCallback(async (): Promise<ExpenseListData> => {
    const [room, payments] = await Promise.all([
      getRoomByShareCode(shareCode),
      getPayments(shareCode, myMemberId),
    ]);
    return { room, payments };
  }, [shareCode, myMemberId]);

  const { status, data, error, retry } = useAsync(load, [shareCode, myMemberId]);

  // 체크는 즉시 반영하고 서버 저장은 뒤따르게 한다. 실패하면 되돌린다.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [toggleError, setToggleError] = useState<string | null>(null);

  const payments = useMemo(() => {
    if (!data) return [];
    return data.payments.map((payment) =>
      payment.id in overrides
        ? { ...payment, includedInSettlement: overrides[payment.id] }
        : payment,
    );
  }, [data, overrides]);

  const sections = useMemo(() => groupByDate(payments), [payments]);
  const includedCount = payments.filter((payment) => payment.includedInSettlement).length;

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }

  // 닉네임을 아직 고르지 않았다면 누구의 내역인지 알 수 없다.
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  const handleToggle = async (payment: Payment) => {
    const next = !payment.includedInSettlement;
    setOverrides((current) => ({ ...current, [payment.id]: next }));
    setToggleError(null);

    try {
      await updatePaymentInclusion(shareCode, payment.id, next);
    } catch (caught) {
      setOverrides((current) => ({ ...current, [payment.id]: !next }));
      setToggleError(
        isApiError(caught) ? caught.message : '변경 사항을 저장하지 못했어요.',
      );
    }
  };

  return (
    <MobileFrame>
      <AppBar backTo={roomHomePath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState
          title="결제 내역을 불러오지 못했어요"
          description={error?.message}
          onRetry={retry}
        />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <div className={styles.titleRow}>
              {/* 방 이름은 B-01 에서 이미 보여줬다. 여기서는 이 화면에서 할 일을 적는다. */}
              <h1 className={styles.title}>정산할 항목을 선택해주세요</h1>
              <button
                type="button"
                className={styles.addButton}
                onClick={() => navigate(manualExpensePath(shareCode))}
              >
                <PlusIcon />
                추가하기
              </button>
            </div>

            {payments.length === 0 ? (
              <EmptyState
                title="아직 등록된 결제 내역이 없어요"
                description="결제 내역을 추가하고 정산을 요청하세요"
              />
            ) : (
              <div className={styles.content}>
                {sections.map((section) => (
                  <section key={section.key} className={styles.section}>
                    <DateSectionHeader label={section.label} />
                    <div className={styles.rows}>
                      {section.items.map((payment) => (
                        <ExpenseCheckRow
                          key={payment.id}
                          payment={payment}
                          onToggle={() => handleToggle(payment)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </ScreenBody>

          <BottomActionBar>
            {toggleError && <Banner message={toggleError} />}
            {payments.length === 0 ? (
              <Button onClick={() => navigate(expenseMethodPath(shareCode))}>
                결제 내역 추가
              </Button>
            ) : (
              <Button
                disabled={includedCount === 0}
                onClick={() => navigate(splitGroupsPath(shareCode))}
              >
                내 정산 인원 선택하기
              </Button>
            )}
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}

interface DateSection {
  key: string;
  label: string;
  items: Payment[];
}

/** 결제 시각 기준으로 날짜별로 묶는다. 시각을 모르는 건 마지막 묶음으로 보낸다. */
function groupByDate(payments: Payment[]): DateSection[] {
  const sections: DateSection[] = [];

  for (const payment of payments) {
    const key = payment.paidAt ? toDateKey(payment.paidAt) : 'unknown';
    const label = payment.paidAt ? formatDateSection(payment.paidAt) : '날짜 모름';
    const existing = sections.find((section) => section.key === key);
    if (existing) {
      existing.items.push(payment);
    } else {
      sections.push({ key, label, items: [payment] });
    }
  }

  return sections;
}

function PlusIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path
        d="M8.5 4v9M4 8.5h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
