import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** 0 ~ 1 */
  value: number;
  label: string;
}

/** 파싱 진행률 표시. */
export function ProgressBar({ value, label }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
    >
      <div className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  );
}
