import type { ReactNode } from 'react';
import styles from './BottomActionBar.module.css';

/**
 * 화면 하단에 고정되는 액션 영역.
 * 홈 인디케이터에 가리지 않도록 safe-area 를 더한다.
 */
export function BottomActionBar({ children }: { children: ReactNode }) {
  return <div className={styles.bar}>{children}</div>;
}
