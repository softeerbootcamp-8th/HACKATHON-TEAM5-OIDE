import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AmountCurrencyInput } from '../components/common/AmountCurrencyInput';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { DatePickerSheet } from '../components/common/DatePickerSheet';
import { DateSelectField } from '../components/common/DateSelectField';
import { ErrorState } from '../components/common/ErrorState';
import { FieldLabel } from '../components/common/FieldLabel';
import { LoadingState } from '../components/common/LoadingState';
import { TextField } from '../components/common/TextField';
import { TimeInput } from '../components/common/TimeInput';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { expenseMethodPath, myExpensesPath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { createPayment } from '../services/paymentService';
import { getRoomByShareCode } from '../services/roomService';
import { isApiError } from '../types/api';
import type { CurrencyCode } from '../types/room';
import { toPaidAtIso } from '../utils/formatters';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './ManualExpensePage.module.css';

/**
 * C-09 직접 입력.
 * 필수는 금액·통화뿐이다. 결제처·결제 날짜·시간을 필수로 만들지 않는다 (FR-02).
 */
export function ManualExpensePage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);

  // 통화 기본값이 방을 따르므로 방을 받은 뒤에 입력을 보여준다.
  const load = useCallback(() => getRoomByShareCode(shareCode), [shareCode]);
  const { status, data: room, error, retry } = useAsync(load, [shareCode]);

  const [amount, setAmount] = useState('');
  /** 사용자가 직접 고른 통화. 고르지 않았으면 방의 기본 통화를 쓴다. */
  const [pickedCurrency, setPickedCurrency] = useState<CurrencyCode | null>(null);
  const [merchant, setMerchant] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [paidHour, setPaidHour] = useState('');
  const [paidMinute, setPaidMinute] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amountValid = amount.trim().length > 0 && Number(amount) > 0;
  // 시간만 넣으면 어느 날의 몇 시인지 알 수 없다. 값을 조용히 버리지 않고 막는다.
  const timeNeedsDate = (paidHour !== '' || paidMinute !== '') && paidDate === '';
  const canSubmit = amountValid && !timeNeedsDate;

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }

  const handleSubmit = async (currency: CurrencyCode) => {
    if (!identity) {
      setSubmitError('내 닉네임을 먼저 골라주세요.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      await createPayment(shareCode, identity.memberId, {
        merchant: merchant.trim() === '' ? null : merchant.trim(),
        paidAt: toPaidAtIso(paidDate, paidHour, paidMinute),
        amount,
        currency,
        receiptImageId: null,
      });
      navigate(myExpensesPath(shareCode), { replace: true });
    } catch (caught) {
      setSubmitError(
        isApiError(caught) ? caught.message : '등록하지 못했어요. 잠시 후 다시 시도해주세요.',
      );
      setSubmitting(false);
    }
  };

  const currency = pickedCurrency ?? room?.defaultCurrency;

  return (
    <MobileFrame tone="white">
      <AppBar backTo={expenseMethodPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState
          title="정산방을 불러오지 못했어요"
          description={error?.message}
          onRetry={retry}
        />
      )}

      {status === 'success' && currency && (
        <>
          <ScreenBody>
            <ScreenHeader title="결제한 내용을 적어주세요" />
            <div className={styles.content}>
              <div className={styles.field}>
                <FieldLabel text="결제 금액과 통화" required />
                <AmountCurrencyInput
                  amount={amount}
                  currency={currency}
                  invalid={amount.length > 0 && !amountValid}
                  onAmountChange={setAmount}
                  onCurrencyChange={setPickedCurrency}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <FieldLabel text="결제처" />
                <TextField
                  value={merchant}
                  placeholder="예: 이치란 라멘"
                  aria-label="결제처"
                  onChange={(event) => setMerchant(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <FieldLabel text="결제 날짜" />
                <DateSelectField
                  value={paidDate}
                  aria-label="결제 날짜"
                  onClick={() => setDatePickerOpen(true)}
                />
              </div>

              <div className={styles.field}>
                <FieldLabel text="결제 시간" />
                <TimeInput
                  hour={paidHour}
                  minute={paidMinute}
                  errorMessage={timeNeedsDate ? '결제 날짜를 먼저 골라주세요' : undefined}
                  onHourChange={setPaidHour}
                  onMinuteChange={setPaidMinute}
                />
              </div>

              <p className={styles.footnote}>
                결제처와 결제 날짜 · 시간은 없어도 등록할 수 있어요
              </p>
            </div>
          </ScreenBody>

          <BottomActionBar>
            {submitError && <Banner message={submitError} />}
            <Button
              disabled={!canSubmit}
              loading={submitting}
              loadingLabel="등록하고 있어요…"
              onClick={() => handleSubmit(currency)}
            >
              등록하기
            </Button>
          </BottomActionBar>

          {datePickerOpen && (
            <DatePickerSheet
              value={paidDate}
              onConfirm={(next) => {
                setPaidDate(next);
                setDatePickerOpen(false);
              }}
              onClose={() => setDatePickerOpen(false)}
            />
          )}
        </>
      )}
    </MobileFrame>
  );
}
