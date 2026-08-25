import { useEffect, useState } from 'react';
import { DEFAULT_CURRENCY } from '../../constants/roomRules';
import type { CreatePaymentInput } from '../../types/payment';
import type { CurrencyCode } from '../../types/room';
import { parseDateTimeInput } from '../../utils/formatters';
import { AmountCurrencyInput } from '../common/AmountCurrencyInput';
import { Banner } from '../common/Banner';
import { Button } from '../common/Button';
import { FieldLabel } from '../common/FieldLabel';
import { TextField } from '../common/TextField';
import styles from './ManualExpenseModal.module.css';

interface ManualExpenseModalProps {
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (input: CreatePaymentInput) => void;
  onClose: () => void;
}

/**
 * D-05 의 `빠뜨린 항목 추가하기` 로 열리는 직접 입력 모달.
 *
 * 항목 선택 도중 빠진 결제를 그 자리에서 넣기 위한 것이라, 화면을 옮기지 않고
 * C-09 와 같은 입력을 모달로 보여준다.
 */
export function ManualExpenseModal({
  submitting,
  errorMessage,
  onSubmit,
  onClose,
}: ManualExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [merchant, setMerchant] = useState('');
  const [paidAtText, setPaidAtText] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const amountValid = amount.trim().length > 0 && Number(amount) > 0;
  const paidAtValid = paidAtText.trim().length === 0 || parseDateTimeInput(paidAtText) !== null;

  const handleSubmit = () => {
    onSubmit({
      merchant: merchant.trim() === '' ? null : merchant.trim(),
      paidAt:
        paidAtText.trim() === '' ? new Date().toISOString() : parseDateTimeInput(paidAtText),
      amount,
      currency,
      receiptImageId: null,
    });
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <h2 className={styles.title}>결제한 내용을 적어주세요</h2>

        <div className={styles.fields}>
          <div className={styles.field}>
            <FieldLabel text="결제 금액과 통화" required />
            <AmountCurrencyInput
              amount={amount}
              currency={currency}
              invalid={amount.length > 0 && !amountValid}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
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
            <FieldLabel text="결제 시각" />
            <TextField
              value={paidAtText}
              placeholder="비워두면 오늘로 기록돼요"
              aria-label="결제 시각"
              errorMessage={paidAtValid ? undefined : '2026-08-21 20:14 형식으로 적어주세요'}
              onChange={(event) => setPaidAtText(event.target.value)}
            />
          </div>

          <p className={styles.footnote}>결제처와 결제 시각은 없어도 등록할 수 있어요</p>
          {errorMessage && <Banner message={errorMessage} />}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            취소
          </button>
          <div className={styles.submit}>
            <Button
              disabled={!amountValid || !paidAtValid}
              loading={submitting}
              loadingLabel="등록하고 있어요…"
              onClick={handleSubmit}
            >
              등록하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
