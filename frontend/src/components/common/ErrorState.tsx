import styles from './StateMessage.module.css';

interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** 화면 전용 아이콘. 없으면 기본 자리 표시를 쓴다. 문구가 같은 말을 하므로 장식이다. */
  iconSrc?: string;
}

/** 조회 실패 표시. 재시도 수단을 반드시 함께 준다. */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = '다시 시도',
  iconSrc,
}: ErrorStateProps) {
  return (
    <div className={styles.wrapper} role="alert">
      {iconSrc ? (
        <img className={styles.iconImage} src={iconSrc} alt="" aria-hidden="true" />
      ) : (
        <div className={styles.icon} aria-hidden="true" />
      )}
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
