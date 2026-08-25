import styles from './StateMessage.module.css';

interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** 조회 실패 표시. 재시도 수단을 반드시 함께 준다. */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = '다시 시도',
}: ErrorStateProps) {
  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.icon} aria-hidden="true" />
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {onRetry && (
        <div className={styles.action}>
          <button type="button" className={styles.retryButton} onClick={onRetry}>
            {retryLabel}
          </button>
        </div>
      )}
    </div>
  );
}
