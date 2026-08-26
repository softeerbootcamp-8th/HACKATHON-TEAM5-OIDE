import type { ReactNode } from 'react';
import styles from './ScreenHeader.module.css';

interface ScreenHeaderProps {
  /** 줄바꿈이 필요하면 \n 을 넣는다. 와이어프레임의 2줄 타이틀을 그대로 재현하기 위함이다. */
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}

/** 화면 상단의 타이틀 + 보조 설명 묶음. */
export function ScreenHeader({ title, description, className = '' }: ScreenHeaderProps) {
  return (
    <div className={`${styles.header} ${className}`}>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}
