import styles from './DateSectionHeader.module.css';

/** 날짜별 섹션 헤더. 예: `21일 금요일` */
export function DateSectionHeader({ label }: { label: string }) {
  return <h2 className={styles.header}>{label}</h2>;
}
