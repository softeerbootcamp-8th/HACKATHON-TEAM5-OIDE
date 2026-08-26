import styles from './StateMessage.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
}

/** 데이터가 아직 없을 때의 표시. 오류와 구분해서 쓴다. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.icon} aria-hidden="true" />
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
