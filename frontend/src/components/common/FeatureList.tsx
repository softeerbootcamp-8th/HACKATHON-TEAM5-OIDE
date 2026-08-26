import styles from './FeatureList.module.css';

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface FeatureListProps {
  items: FeatureItem[];
}

/** 랜딩(A-01)의 서비스 특징 목록. */
export function FeatureList({ items }: FeatureListProps) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.title} className={styles.item}>
          <span className={styles.iconWrap}>
            <img src={item.icon} alt="" className={styles.icon} aria-hidden="true" />
          </span>
          <div className={styles.text}>
            <p className={styles.title}>{item.title}</p>
            <p className={styles.description}>{item.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
