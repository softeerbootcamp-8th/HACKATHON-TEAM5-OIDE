import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AmountCurrencyInput } from '../components/common/AmountCurrencyInput';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { FieldLabel } from '../components/common/FieldLabel';
import { OptionalDateTimeFields } from '../components/common/OptionalDateTimeFields';
import { TextField } from '../components/common/TextField';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { DEFAULT_CURRENCY } from '../constants/roomRules';
import { expenseMethodPath, myExpensesPath } from '../constants/routes';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { createPayment } from '../services/paymentService';
import { isApiError } from '../types/api';
import type { CurrencyCode } from '../types/room';
import {
  formatDateTimeInputParts,
  hasDateTimeInput,
  parseDateTimeInputParts,
} from '../utils/formatters';
import styles from './ManualExpensePage.module.css';

/**
 * C-09 직접 입력.
 * 필수는 금액·통화뿐이다. 결제처·결제 시각을 필수로 만들지 않는다 (FR-02).
 */
export function ManualExpensePage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [merchant, setMerchant] = useState('');
  const [paidAt, setPaidAt] = useState(formatDateTimeInputParts());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amountValid = amount.trim().length > 0 && Number(amount) > 0;
  const parsedPaidAt = parseDateTimeInputParts(paidAt);
  const paidAtValid = !hasDateTimeInput(paidAt) || parsedPaidAt !== null;
  const canSubmit = amountValid && paidAtValid;

  const handleSubmit = async () => {
    if (!identity) {
      setSubmitError('내 닉네임을 먼저 골라주세요.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      await createPayment(shareCode, identity.memberId, {
        merchant: merchant.trim() === '' ? null : merchant.trim(),
        paidAt: parsedPaidAt,
        amount,
        currency,
        receiptImageId: null,
      });
      navigate(myExpensesPath(shareCode), { replace: true });
    } catch (error) {
      setSubmitError(
        isApiError(error) ? error.message : '등록하지 못했어요. 잠시 후 다시 시도해주세요.',
      );
      setSubmitting(false);
    }
  };

  return (
    <MobileFrame>
      <AppBar backTo={expenseMethodPath(shareCode)} />
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

          <OptionalDateTimeFields
            value={paidAt}
            errorMessage={paidAtValid ? undefined : '날짜와 시간을 모두 올바르게 입력해주세요'}
            onChange={setPaidAt}
          />

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
          onClick={handleSubmit}
        >
          등록하기
        </Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
