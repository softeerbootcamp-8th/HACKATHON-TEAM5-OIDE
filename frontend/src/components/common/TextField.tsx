import type { InputHTMLAttributes } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
  value: string;
  /** 우측 하단 안내. 에러가 있으면 에러 문구로 대체된다. */
  helperText?: string;
  /** 원인별 검증 에러 문구. */
  errorMessage?: string;
  /** 지정하면 `n/max` 카운터를 helperText 뒤에 붙인다. */
  maxLengthHint?: number;
}

/**
 * 단일 줄 입력.
 * 카운터와 에러 문구가 같은 줄에 놓이는 와이어프레임 구조를 그대로 따른다.
 */
export function TextField({
  value,
  helperText,
  errorMessage,
  maxLengthHint,
  ...rest
}: TextFieldProps) {
  const hasError = Boolean(errorMessage);
  const counter =
    maxLengthHint !== undefined ? `${value.length}/${maxLengthHint}` : null;

  return (
    <div className={styles.field}>
      <div className={`${styles.inputWrapper} ${hasError ? styles.invalid : ''}`}>
        <input
          {...rest}
          className={styles.input}
          value={value}
          aria-invalid={hasError}
        />
      </div>
      <div className={styles.helperRow}>
        {hasError ? (
          <span className={styles.errorMessage}>{errorMessage}</span>
        ) : (
          helperText && <span>{helperText}</span>
        )}
        {counter && <span>· {counter}</span>}
      </div>
    </div>
  );
}
