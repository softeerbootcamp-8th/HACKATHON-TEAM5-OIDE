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
import { findCurrency } from '../constants/currencies';
import { joinRoomPath, settlementStartPath, settlementSummaryPath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import {
  confirmSettlement,
  getSettlementPreview,
} from '../services/settlementService';
import { getSplitGroupOverview } from '../services/splitGroupService';
import { isApiError } from '../types/api';
import { formatQuotedAt } from '../utils/krw';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './RateEditPage.module.css';

/**
 * E-04 환율 직접 수정.
 *
 * 기본 흐름에 노출하지 않고 E-01 의 텍스트 링크로만 들어온다.
 * 여기서 바꾼 환율은 방 전체 정산 결과에 적용된다 (FR-04).
 */
export function RateEditPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const { goBack } = useBackNavigation(settlementStartPath(shareCode));
  const load = useCallback(async () => {
    const [overview, preview] = await Promise.all([
      getSplitGroupOverview(shareCode),
      getSettlementPreview(shareCode),
    ]);
    return { payments: overview.payments, preview };
  }, [shareCode]);
  const { status, data, error, retry } = useAsync(load, [shareCode]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  const targetCurrencies = [
    ...new Set(data?.payments.map((payment) => payment.currency) ?? []),
  ];
  const editableRates = targetCurrencies.map((currency) => ({
    currency,
    rate: data?.preview.rates.find((item) => item.currency === currency),
  }));
  const valid = editableRates.every(({ currency, rate }) => {
    const current = values[currency] ?? rate?.rateToKrw ?? '';
    return current.trim().length > 0 && Number(current) > 0;
  });

  const handleApply = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await confirmSettlement(
        shareCode,
        Object.entries(values).map(([currency, rateToKrw]) => ({ currency, rateToKrw })),
      );
      navigate(settlementSummaryPath(shareCode), { replace: true });
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '환율을 저장하지 못했어요.');
      setSubmitting(false);
    }
  };

  if (status === 'success' && data && targetCurrencies.length === 0) {
    return <Navigate to={settlementStartPath(shareCode)} replace />;
  }

  return (
    <MobileFrame tone="white">
      <AppBar backTo={settlementStartPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && editableRates.length > 0 && (
        <>
          <ScreenBody>
            <ScreenHeader title={'쓰고 싶은 환율이\n따로 있나요?'} />
            <div className={styles.content}>
              {editableRates.map(({ currency, rate }) => {
                const unit = findCurrency(currency).unit;
                const current = values[currency] ?? rate?.rateToKrw ?? '';
                const isValid = current.trim().length > 0 && Number(current) > 0;
                return (
                  <div key={currency} className={styles.rateBlock}>
                    <p className={styles.label}>
                      {currency} · 1{unit}당 원화
                    </p>
                    <div
                      className={`${styles.inputWrapper} ${isValid ? '' : styles.invalid}`}
                    >
                      <input
                        className={styles.input}
                        value={current}
                        inputMode="decimal"
                        aria-label={`1${unit}당 원화`}
                        aria-invalid={!isValid}
                        onChange={(event) =>
                          setValues((currentValues) => ({
                            ...currentValues,
                            [currency]: event.target.value.replace(/[^\d.]/g, ''),
                          }))
                        }
                      />
                      <span className={styles.suffix}>원</span>
                    </div>
                    <div className={styles.helperRow}>
                      <span>자동 환율</span>
                      <span className={isValid ? '' : styles.error}>
                        {!isValid
                          ? '0보다 큰 숫자를 적어주세요'
                          : rate?.rateToKrw && rate.quotedAt
                            ? `${Number(rate.rateToKrw).toLocaleString('ko-KR')}원 · ${formatQuotedAt(rate.quotedAt).replace(/^\S+ /, '')}`
                            : '직접 입력이 필요해요'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScreenBody>

          <BottomActionBar>
            {submitError && <Banner message={submitError} />}
            <Button
              disabled={!valid}
              loading={submitting}
              loadingLabel="적용하고 있어요…"
              onClick={handleApply}
            >
              이 환율로 정산하기
            </Button>
            <Button
              variant="text"
              disabled={submitting}
              onClick={() => goBack()}
            >
              자동 환율로 되돌리기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
