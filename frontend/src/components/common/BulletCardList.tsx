import styles from './BulletCardList.module.css';

interface BulletCardListProps {
  items: string[];
}

/** 랜딩(A-01)의 서비스 특징 카드 목록. */
export function BulletCardList({ items }: BulletCardListProps) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item} className={styles.item}>
          <span className={styles.dot} aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}
