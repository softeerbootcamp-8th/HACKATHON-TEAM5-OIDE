import { useEffect, useState } from 'react';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import type { CreatePaymentInput } from '../../types/payment';
import type { CurrencyCode } from '../../types/room';
import { toPaidAtIso } from '../../utils/formatters';
import { AmountCurrencyInput } from '../common/AmountCurrencyInput';
import { Banner } from '../common/Banner';
import { Button } from '../common/Button';
import { DatePickerSheet } from '../common/DatePickerSheet';
import { DateSelectField } from '../common/DateSelectField';
import { FieldLabel } from '../common/FieldLabel';
import { TextField } from '../common/TextField';
import { TimeInput } from '../common/TimeInput';
import styles from './ManualExpenseModal.module.css';

interface ManualExpenseModalProps {
  /** 방의 기본 통화. 고르지 않으면 이 통화로 등록한다. */
  defaultCurrency: CurrencyCode;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (input: CreatePaymentInput) => void;
  onClose: () => void;
}

/**
 * D-05 · D-06 의 `빠뜨린 항목 추가하기` 로 열리는 직접 입력 모달.
 *
 * 항목 선택 도중 빠진 결제를 그 자리에서 넣기 위한 것이라, 화면을 옮기지 않고
 * C-09 와 같은 입력을 모달로 보여준다. 날짜도 C-09 처럼 바텀시트로 고른다.
 */
export function ManualExpenseModal({
  defaultCurrency,
  submitting,
  errorMessage,
  onSubmit,
  onClose,
}: ManualExpenseModalProps) {
  const [amount, setAmount] = useState('');
  /** 사용자가 직접 고른 통화. 고르지 않았으면 방의 기본 통화를 쓴다 (C-09 와 같다). */
  const [pickedCurrency, setPickedCurrency] = useState<CurrencyCode | null>(null);
  const [merchant, setMerchant] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [paidHour, setPaidHour] = useState('');
  const [paidMinute, setPaidMinute] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // 날짜 시트가 떠 있으면 시트만 닫는다. 시트가 자기 Escape 를 처리한다.
      if (event.key === 'Escape' && !datePickerOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, datePickerOpen]);

  const currency = pickedCurrency ?? defaultCurrency;
  const amountValid = amount.trim().length > 0 && Number(amount) > 0;
  // 시간만 넣으면 어느 날의 몇 시인지 알 수 없다. 값을 조용히 버리지 않고 막는다 (C-09 와 같다).
  const timeNeedsDate = (paidHour !== '' || paidMinute !== '') && paidDate === '';

  const handleSubmit = () => {
    onSubmit({
      merchant: merchant.trim() === '' ? null : merchant.trim(),
      paidAt: toPaidAtIso(paidDate, paidHour, paidMinute),
      amount,
      currency,
      receiptImageId: null,
    });
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      style={{ bottom: keyboardInset }}
      onClick={onClose}
    >
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.scrollArea}>
          <h2 className={styles.title}>결제한 내용을 적어주세요</h2>

          <div className={styles.fields}>
            <div className={styles.field}>
              <FieldLabel text="결제 금액과 통화" required size="large" />
              <AmountCurrencyInput
                amount={amount}
                currency={currency}
                invalid={amount.length > 0 && !amountValid}
                onAmountChange={setAmount}
                onCurrencyChange={setPickedCurrency}
                autoFocus
                compact
              />
            </div>

            <div className={styles.field}>
              <FieldLabel text="결제처" size="large" />
              <TextField
                value={merchant}
                placeholder="예: 이치란 라멘"
                aria-label="결제처"
                strongBorder
                onChange={(event) => setMerchant(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <FieldLabel text="결제 날짜" size="large" />
              <DateSelectField
                value={paidDate}
                aria-label="결제 날짜"
                onClick={() => setDatePickerOpen(true)}
              />
            </div>

            <div className={styles.field}>
              <FieldLabel text="결제 시간" size="large" />
              <TimeInput
                hour={paidHour}
                minute={paidMinute}
                errorMessage={timeNeedsDate ? '결제 날짜를 먼저 골라주세요' : undefined}
                onHourChange={setPaidHour}
                onMinuteChange={setPaidMinute}
              />
            </div>

            <p className={styles.footnote}>결제처와 결제 시각은 없어도 등록할 수 있어요</p>
            {errorMessage && <Banner message={errorMessage} />}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            취소
          </button>
          <div className={styles.submit}>
            <Button
              className={styles.submitButton}
              disabled={!amountValid || timeNeedsDate}
              loading={submitting}
              loadingLabel="등록하고 있어요…"
              onClick={handleSubmit}
            >
              등록하기
            </Button>
          </div>
        </div>

        {/* 모달 위에 겹쳐 띄운다. panel 안에 두어 시트 클릭이 모달을 닫지 않게 한다. */}
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
      </div>
    </div>
  );
}
