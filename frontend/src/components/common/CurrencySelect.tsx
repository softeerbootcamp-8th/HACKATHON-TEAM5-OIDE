import { useEffect, useId, useRef, useState } from 'react';
import { CURRENCY_OPTIONS, findCurrency } from '../../constants/currencies';
import type { CurrencyCode } from '../../types/room';
import styles from './CurrencySelect.module.css';

/** 목록에 한 번에 보여줄 통화 수. 나머지는 스크롤해서 본다. */
const VISIBLE_OPTION_COUNT = 5;

interface CurrencySelectProps {
  value: CurrencyCode;
  onChange: (next: CurrencyCode) => void;
  /** `full` 은 한 줄을 다 쓰고 `JPY (엔)`, `compact` 는 금액 옆 좁은 칸에 코드만 보인다. */
  variant?: 'full' | 'compact';
}

/**
 * 통화 선택 드롭다운.
 *
 * 지원 통화가 21개라 네이티브 select 는 기기마다 전혀 다른 모양(안드로이드 목록,
 * iOS 휠)으로 뜬다. 어디서나 같게 보이도록 목록을 직접 그린다.
 */
export function CurrencySelect({ value, onChange, variant = 'full' }: CurrencySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = CURRENCY_OPTIONS.findIndex((option) => option.code === value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  // 아래에 목록이 다 들어가지 않으면 위로 편다.
  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // 짚고 있는 항목만 목록 안에서 움직인다. scrollIntoView 는 화면 전체를 움직여서 쓰지 않는다.
    const list = listRef.current;
    const item = list?.children[activeIndex] as HTMLElement | undefined;
    if (!list || !item) return;

    const bottom = item.offsetTop + item.offsetHeight;
    if (item.offsetTop < list.scrollTop) {
      list.scrollTop = item.offsetTop;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [open, activeIndex]);

  const openList = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const needed = VISIBLE_OPTION_COUNT * 48 + 8;
      setDropUp(rect.bottom + needed > window.innerHeight && rect.top > needed);
    }
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const commit = (code: CurrencyCode) => {
    onChange(code);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) =>
        Math.min(Math.max(current + delta, 0), CURRENCY_OPTIONS.length - 1),
      );
      return;
    }
    if (open && (event.key === 'Enter' || event.key === ' ')) {
      // 기본 동작을 막지 않으면 뒤이어 click 이 일어나 목록이 도로 닫힌다.
      event.preventDefault();
      commit(CURRENCY_OPTIONS[activeIndex].code);
    }
  };

  const selected = findCurrency(value);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${variant === 'compact' ? styles.compact : ''}`}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-label="통화"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.triggerText}>
          {variant === 'compact' ? selected.code : selected.label}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          className={`${styles.panel} ${dropUp ? styles.dropUp : ''}`}
          role="listbox"
          aria-label="통화"
        >
          {CURRENCY_OPTIONS.map((option, index) => (
            <li
              key={option.code}
              id={`${listId}-${index}`}
              className={`${styles.option} ${index === activeIndex ? styles.active : ''} ${
                option.code === value ? styles.selected : ''
              }`}
              role="option"
              aria-selected={option.code === value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(option.code)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
