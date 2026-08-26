import styles from './Stepper.module.css';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  /** 스크린리더용 이름. */
  label: string;
}

/** 인원 수 증감 컨트롤. 하한·상한에서 해당 버튼이 비활성된다. */
export function Stepper({ value, min, max, onChange, label }: StepperProps) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={`${label} 줄이기`}
      >
        −
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={`${label} 늘리기`}
      >
        +
      </button>
    </div>
  );
}
