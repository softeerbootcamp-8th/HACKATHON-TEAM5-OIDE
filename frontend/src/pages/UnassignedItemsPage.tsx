import { useCallback, useMemo, useState } from 'react';
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
import { ALL_GROUP_NAME } from '../constants/roomRules';
import { joinRoomPath, settlementStartPath, splitGroupsPath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { setPaymentSplit } from '../services/paymentService';
import {
  assignPaymentsToGroup,
  getSplitGroupOverview,
} from '../services/splitGroupService';
import { isApiError } from '../types/api';
import { formatAmount, formatTime } from '../utils/formatters';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './UnassignedItemsPage.module.css';

/**
 * D-12 자동 귀속 확인.
 *
 * 어느 그룹에도 담기지 않은 항목은 `전체` 그룹이 나눠서 낸다.
 * 정산을 막지 않고 사실만 알린다.
 */
export function UnassignedItemsPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(() => getSplitGroupOverview(shareCode), [shareCode]);
  const { status, data, error, retry } = useAsync(load, [shareCode]);

  const unassigned = useMemo(
    () => data?.payments.filter((payment) => payment.splitGroupId === null) ?? [],
    [data],
  );
  const allGroup = data?.groups.find((group) => group.type === 'ALL');

  const handleApplyRates = async () => {
    if (!data || !allGroup) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const allGroupPaymentIds = data.payments
        .filter((payment) => payment.splitGroupId === allGroup.id)
        .map((payment) => payment.id);
      await assignPaymentsToGroup(shareCode, allGroup.id, [
        ...allGroupPaymentIds,
        ...unassigned.map((payment) => payment.id),
      ]);
      await Promise.all(
        unassigned.map((payment) => setPaymentSplit(shareCode, payment.id, 'EQUAL', [])),
      );
      navigate(settlementStartPath(shareCode));
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '전체 그룹에 담지 못했어요.');
      setSubmitting(false);
    }
  };

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  return (
    <MobileFrame>
      <AppBar backTo={splitGroupsPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && (
        <>
          <ScreenBody>
            <ScreenHeader title={`선택하지 않은 항목 ${unassigned.length}건이 있어요`} />
            <div className={styles.content}>
              <ul className={styles.rows}>
                {unassigned.map((payment) => (
                  <li key={payment.id} className={styles.row}>
                    <span className={styles.merchant}>{payment.merchant ?? '결제처 없음'}</span>
                    <span className={styles.amount}>
                      {formatAmount(payment.amount, payment.currency)}
                    </span>
                    <span className={styles.meta}>
                      {payment.paidAt ? `${formatTime(payment.paidAt)} · ` : ''}
                      {payment.currency} · {ALL_GROUP_NAME} 그룹에 담김
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </ScreenBody>

          <BottomActionBar>
            {submitError && <Banner message={submitError} />}
            <Button
              disabled={!allGroup}
              loading={submitting}
              loadingLabel="그룹에 담고 있어요…"
              onClick={handleApplyRates}
            >
              이대로 환율 적용하기
            </Button>
            <Button variant="text" onClick={() => navigate(splitGroupsPath(shareCode))}>
              돌아가기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
