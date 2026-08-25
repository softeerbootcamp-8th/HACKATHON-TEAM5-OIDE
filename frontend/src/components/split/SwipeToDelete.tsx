import { useRef, useState, type ReactNode } from 'react';
import styles from './SwipeToDelete.module.css';

/** 카드를 밀어낼 거리. 이만큼 드러난 자리에 삭제 버튼이 보인다. */
const REVEAL_PX = 62;
/** 이 정도 이상 끌어야 열린다. */
const DRAG_THRESHOLD_PX = 24;

interface SwipeToDeleteProps {
  children: ReactNode;
  /** 스크린리더와 길게 누르기 대체 동작에 쓰는 이름. */
  label: string;
  onDelete: () => void;
}

/**
 * 옆으로 밀면 삭제 버튼이 드러나는 래퍼.
 *
 * 터치가 없는 환경에서도 지울 수 있도록 길게 누르기를 함께 받는다.
 */
export function SwipeToDelete({ children, label, onDelete }: SwipeToDeleteProps) {
  const [opened, setOpened] = useState(false);
  const startXRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);

  const handlePointerDown = (event: React.PointerEvent) => {
    startXRef.current = event.clientX;
    longPressRef.current = window.setTimeout(() => setOpened(true), 600);
  };

  const clearLongPress = () => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    clearLongPress();
    const startX = startXRef.current;
    startXRef.current = null;
    if (startX === null) return;

    const moved = event.clientX - startX;
    if (moved > DRAG_THRESHOLD_PX) setOpened(true);
    if (moved < -DRAG_THRESHOLD_PX) setOpened(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.deleteLayer} data-opened={opened}>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={onDelete}
          tabIndex={opened ? 0 : -1}
          aria-label={`${label} 삭제`}
          aria-hidden={!opened}
        >
          ✕
        </button>
      </div>
      <div
        className={styles.content}
        style={{ transform: `translateX(${opened ? REVEAL_PX : 0}px)` }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={clearLongPress}
        onPointerLeave={clearLongPress}
      >
        {children}
      </div>
    </div>
  );
}
