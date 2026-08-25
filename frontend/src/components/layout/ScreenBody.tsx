import type { ReactNode } from 'react';
import styles from './ScreenBody.module.css';

/** 하단 고정 바 위쪽의 스크롤 영역. */
export function ScreenBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}
