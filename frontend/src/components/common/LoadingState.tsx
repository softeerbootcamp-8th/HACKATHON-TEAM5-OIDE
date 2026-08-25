import styles from './LoadingState.module.css';

interface LoadingStateProps {
  label?: string;
}

/** 조회 중 표시. */
export function LoadingState({ label = '불러오는 중이에요' }: LoadingStateProps) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
