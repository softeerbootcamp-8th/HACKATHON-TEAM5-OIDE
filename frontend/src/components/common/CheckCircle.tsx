import styles from './CheckCircle.module.css';

interface CheckCircleProps {
  checked: boolean;
}

/** 원형 체크 표시. 선택은 부모 행이 처리하고 이 컴포넌트는 모양만 담당한다. */
export function CheckCircle({ checked }: CheckCircleProps) {
  return (
    <span
      className={`${styles.circle} ${checked ? styles.checked : ''}`}
      aria-hidden="true"
    >
      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
        <path
          d="M1 4.5L4.5 8L11 1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
