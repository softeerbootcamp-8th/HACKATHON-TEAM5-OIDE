import idleCheckIcon from '../../assets/check-circle-idle.svg';
import selectedCheckIcon from '../../assets/check-circle-selected.svg';
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
      <img
        className={styles.checkIcon}
        src={checked ? selectedCheckIcon : idleCheckIcon}
        alt=""
      />
    </span>
  );
}
