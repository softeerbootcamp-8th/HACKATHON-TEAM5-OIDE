import type { ReactNode } from 'react';
import styles from './MobileFrame.module.css';

interface MobileFrameProps {
  children: ReactNode;
  tone?: 'default' | 'subtle' | 'white';
}

const TONE_CLASS = {
  default: '',
  subtle: 'subtle',
  white: 'white',
} as const;

/**
 * 모든 화면을 감싸는 최상위 컨테이너.
 * 모바일에서는 화면 전체 폭, 그보다 넓으면 가운데 정렬된 컬럼이 된다.
 */
export function MobileFrame({ children, tone = 'default' }: MobileFrameProps) {
  const toneClass = TONE_CLASS[tone];
  return (
    <div className={`${styles.frame} ${toneClass ? styles[toneClass] : ''}`}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
