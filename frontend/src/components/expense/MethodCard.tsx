import type { ReactNode } from 'react';
import styles from './MethodCard.module.css';

interface MethodCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

/** C-01 의 등록 방식 카드. 카드를 누르는 것이 곧 진행이라 별도 CTA 가 없다. */
export function MethodCard({ icon, title, description, onClick }: MethodCardProps) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
    </button>
  );
}
