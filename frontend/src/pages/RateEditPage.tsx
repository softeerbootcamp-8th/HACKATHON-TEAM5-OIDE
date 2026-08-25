import { useState } from 'react';
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
import { joinRoomPath, settlementStartPath } from '../constants/routes';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { useSettlement } from '../hooks/useSettlement';
import { clearManualRate, setManualRate } from '../services/settlementService';
import { isApiError } from '../types/api';
import { SEED_RATES } from '../mocks/mockRates';
import { formatQuotedAt } from '../utils/krw';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './RateEditPage.module.css';

/**
 * E-04 환율 직접 수정.
 *
 * 기본 흐름에 노출하지 않고 E-01 의 텍스트 링크로만 들어온다.
 * 여기서 바꾼 환율은 방 전원에게 적용되고, 누가 바꿨는지 함께 남는다 (FR-04).
 */
export function RateEditPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const { status, data, error, retry } = useSettlement(shareCode);

  const [value, setValue] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  // 외화가 여러 개면 첫 번째를 고친다. 통화별 수정은 화면이 생기면 붙인다.
  const targetCurrency =
    data?.targetPayments.find((payment) => payment.currency !== 'KRW')?.currency ?? 'JPY';
  const rate = data?.rates.find((item) => item.currency === targetCurrency);
  const autoRate = SEED_RATES[targetCurrency] ?? '0';

  const current = value ?? rate?.rateToKrw ?? '';
  const numeric = Number(current);
  const valid = current.trim().length > 0 && numeric > 0;

  const handleApply = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await setManualRate(shareCode, targetCurrency, current, identity.nickname);
      navigate(settlementStartPath(shareCode), { replace: true });
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '환율을 저장하지 못했어요.');
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await clearManualRate(shareCode);
      navigate(settlementStartPath(shareCode), { replace: true });
    } catch (caught) {
      setSubmitError(isApiError(caught) ? caught.message : '되돌리지 못했어요.');
      setSubmitting(false);
    }
  };

  const unit = findCurrency(targetCurrency).unit;

  return (
    <MobileFrame>
      <AppBar backTo={settlementStartPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && rate && (
        <>
          <ScreenBody>
            <ScreenHeader title={'쓰고 싶은 환율이\n따로 있나요?'} />
            <div className={styles.content}>
              <p className={styles.label}>
                {targetCurrency} · 1{unit}당 원화
              </p>
              <div className={`${styles.inputWrapper} ${valid ? '' : styles.invalid}`}>
                <input
                  className={styles.input}
                  value={current}
                  inputMode="decimal"
                  aria-label={`1${unit}당 원화`}
                  aria-invalid={!valid}
                  onChange={(event) => setValue(event.target.value.replace(/[^\d.]/g, ''))}
                />
                <span className={styles.suffix}>원</span>
              </div>
              <div className={styles.helperRow}>
                <span>자동 환율</span>
                <span className={valid ? '' : styles.error}>
                  {valid
                    ? `${Number(autoRate).toLocaleString('ko-KR')}원 · ${formatQuotedAt(rate.quotedAt).replace(/^\S+ /, '')}`
                    : '0보다 큰 숫자를 적어주세요'}
                </span>
              </div>
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
            <Button variant="text" onClick={handleReset}>
              자동 환율로 되돌리기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}

