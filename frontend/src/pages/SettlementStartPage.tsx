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
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { findCurrency } from '../constants/currencies';
import {
  joinRoomPath,
  rateEditPath,
  settlementSummaryPath,
  splitGroupsPath,
} from '../constants/routes';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { useAsync } from '../hooks/useAsync';
import {
  confirmSettlement,
  getSettlementPreview,
} from '../services/settlementService';
import { getSplitGroupOverview } from '../services/splitGroupService';
import { isApiError } from '../types/api';
import { formatQuotedAt, formatRateLine } from '../utils/krw';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './SettlementStartPage.module.css';

/**
 * E-01 정산 실행 확인.
 *
 * 환율은 방을 개설한 시점으로 고정되어 모든 참여자에게 똑같이 적용된다.
 * 환율 수정은 기본 흐름에 두지 않고 아래 텍스트 링크로만 들어간다 (FR-04).
 */
export function SettlementStartPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [overview, preview] = await Promise.all([
      getSplitGroupOverview(shareCode),
      getSettlementPreview(shareCode),
    ]);
    return { ...overview, preview };
  }, [shareCode]);
  const { status, data, error, retry } = useAsync(load, [shareCode]);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  // 결제 통화만 환율이 필요하다. 원화 결제는 환산하지 않는다.
  const usedCurrencies = [
    ...new Set(
      data?.payments
        .filter((payment) => payment.currency !== 'KRW')
        .map((payment) => payment.currency) ?? [],
    ),
  ];
  const shownRates =
    data?.preview.rates.filter((rate) => usedCurrencies.includes(rate.currency)) ?? [];
  const visibleGroups =
    data?.groups.filter(
      (group) => group.type === 'ALL' || group.creatorMemberId === identity.memberId,
    ) ?? [];

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await confirmSettlement(shareCode);
      navigate(settlementSummaryPath(shareCode));
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '정산을 확정하지 못했어요.');
      setSubmitting(false);
    }
  };

  return (
    <MobileFrame tone="white">
      <AppBar backTo={splitGroupsPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <ScreenHeader
              title="지금 환율로 정산할게요"
              description={'방을 개설한 시점의 환율이\n모든 사람에게 동일하게 적용돼요.'}
            />

            {data.payments.length === 0 ? (
              <EmptyState
                title="정산할 항목이 없어요"
                description="결제 내역을 먼저 정산 대상으로 골라주세요"
              />
            ) : (
              <div className={styles.content}>
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>그룹</span>
                    <span className={styles.chips}>
                      {visibleGroups.map((group) => (
                        <span key={group.id} className={styles.chip}>
                          {group.name}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>정산할 항목</span>
                    <span className={styles.summaryValue}>{data.payments.length}건</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>통화</span>
                    <span className={styles.summaryValue}>
                      {usedCurrencies.join(', ') || 'KRW'}
                    </span>
                  </div>
                </div>

                {shownRates.map(
                  (rate) =>
                    rate.rateToKrw &&
                    rate.quotedAt && (
                      <div key={rate.currency} className={styles.rateBox}>
                        <span className={styles.rateName}>
                          <span className={styles.rateCurrency}>
                            {rate.currency} · {findCurrency(rate.currency).name}
                          </span>
                          <span className={styles.rateQuotedAt}>
                            {formatQuotedAt(rate.quotedAt)}
                          </span>
                        </span>
                        <span className={styles.rateValue}>
                          {formatRateLine(rate.currency, rate.rateToKrw)}
                        </span>
                      </div>
                    ),
                )}

                {data.preview.invalidPaymentIds.length > 0 && (
                  <Banner message="나누기가 끝나지 않은 결제 항목이 있어요" />
                )}
                {data.preview.missingCurrencies.length > 0 && (
                  <Banner
                    message={`${data.preview.missingCurrencies.join(', ')} 환율을 직접 입력해주세요`}
                  />
                )}
              </div>
            )}
          </ScreenBody>

          <BottomActionBar>
            {submitError && <Banner message={submitError} />}
            <Button
              disabled={data.payments.length === 0 || !data.preview.settlementAvailable}
              loading={submitting}
              loadingLabel="정산하고 있어요…"
              onClick={handleConfirm}
            >
              다음
            </Button>
            <Button variant="text" onClick={() => navigate(rateEditPath(shareCode))}>
              환율 직접 입력하기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
