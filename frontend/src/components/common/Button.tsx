import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'text';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** 제출 중 표시. 버튼을 비활성으로 만들고 문구를 바꾼다. */
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  variant = 'primary',
  loading = false,
  loadingLabel = '잠시만요…',
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`${styles.button} ${styles[variant]}`}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
