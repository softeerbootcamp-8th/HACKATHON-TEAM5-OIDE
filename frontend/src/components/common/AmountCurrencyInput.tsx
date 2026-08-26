import { findCurrency } from '../../constants/currencies';
import type { CurrencyCode } from '../../types/room';
import { sanitizeAmountInput } from '../../utils/formatters';
import { CurrencySelect } from './CurrencySelect';
import styles from './AmountCurrencyInput.module.css';

interface AmountCurrencyInputProps {
  amount: string;
  currency: CurrencyCode;
  onAmountChange: (next: string) => void;
  onCurrencyChange: (next: CurrencyCode) => void;
  invalid?: boolean;
  autoFocus?: boolean;
  compact?: boolean;
}

/**
 * 금액 + 통화를 한 줄로 묶은 입력. 결제 금액은 통화 없이 의미가 없어 항상 함께 다룬다.
 * 소수 자릿수는 선택한 통화를 따른다 (JPY·KRW 는 정수).
 */
export function AmountCurrencyInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  invalid = false,
  autoFocus = false,
  compact = false,
}: AmountCurrencyInputProps) {
  const fractionDigits = findCurrency(currency).fractionDigits;

  return (
    <div className={`${styles.group} ${compact ? styles.compact : ''}`}>
      <CurrencySelect value={currency} onChange={onCurrencyChange} variant="compact" />

      <div className={`${styles.amountWrapper} ${invalid ? styles.invalid : ''}`}>
        <input
          className={styles.amount}
          value={amount}
          placeholder="0"
          inputMode="decimal"
          aria-label="결제 금액"
          aria-invalid={invalid}
          autoFocus={autoFocus}
          onChange={(event) =>
            onAmountChange(sanitizeAmountInput(event.target.value, fractionDigits))
          }
        />
      </div>
    </div>
  );
}
