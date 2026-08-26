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
import { joinRoomPath, settlementStartPath, splitGroupsPath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { updatePaymentInclusion } from '../services/paymentService';
import { getSplitGroupOverview } from '../services/splitGroupService';
import { isApiError } from '../types/api';
import { formatAmount, formatTime } from '../utils/formatters';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './UnassignedItemsPage.module.css';

/**
 * D-12 미선택 항목 제외 확인.
 *
 * 어느 그룹에도 담기지 않은 항목은 이번 정산 대상에서 제외한다.
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
    () =>
      data?.payments.filter(
        (payment) =>
          payment.payerMemberId === identity?.memberId && payment.splitGroupId === null,
      ) ?? [],
    [data, identity],
  );
  const handleApplyRates = async () => {
    if (!identity) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await Promise.all(
        unassigned.map((payment) => updatePaymentInclusion(shareCode, payment.id, false)),
      );
      navigate(settlementStartPath(shareCode));
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '미선택 항목을 제외하지 못했어요.');
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
    <MobileFrame tone="subtle">
      <AppBar backTo={splitGroupsPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && (
        <>
          <ScreenBody>
            <ScreenHeader
              className={styles.screenHeader}
              title={`선택하지 않은 항목 ${unassigned.length}건이 있어요`}
            />
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
                      {payment.currency}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </ScreenBody>

          <BottomActionBar>
            {submitError && <Banner message={submitError} />}
            <Button
              className={styles.primaryButton}
              loading={submitting}
              loadingLabel="정산 대상에서 제외하고 있어요…"
              onClick={handleApplyRates}
            >
              환율 적용하기
            </Button>
            <Button
              className={styles.textButton}
              variant="text"
              onClick={() => navigate(splitGroupsPath(shareCode))}
            >
              돌아가기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
