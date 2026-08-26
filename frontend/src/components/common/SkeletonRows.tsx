import styles from './SkeletonRows.module.css';

interface SkeletonRowsProps {
  count?: number;
}

/** 파싱 중 자리표시. 결과가 들어올 자리를 미리 보여준다. */
export function SkeletonRows({ count = 3 }: SkeletonRowsProps) {
  return (
    <div className={styles.list} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.row}>
          <div className={styles.thumb} />
          <div className={styles.lines}>
            <div className={styles.line} />
            <div className={`${styles.line} ${styles.short}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
