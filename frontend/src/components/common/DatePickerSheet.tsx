import { useEffect, useState } from 'react';
import { formatDateInput, parseDateInput } from '../../utils/formatters';
import { Button } from './Button';
import styles from './DatePickerSheet.module.css';

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index);

interface DatePickerSheetProps {
  /** `YYYY-MM-DD`. 비어 있으면 이번 달을 펼치고 아무 날도 고르지 않은 채 시작한다. */
  value: string;
  onConfirm: (next: string) => void;
  onClose: () => void;
}

/**
 * 결제 날짜를 고르는 바텀시트 (Bottom Sheet / Date Picker).
 *
 * 고른 날짜는 `확인` 을 누를 때까지 시트 안에만 머문다.
 * 달을 넘겨보다 닫아도 원래 값이 바뀌지 않아야 하기 때문이다.
 */
export function DatePickerSheet({ value, onConfirm, onClose }: DatePickerSheetProps) {
  const [selected, setSelected] = useState(value);
  const [view, setView] = useState(() => {
    const base = parseDateInput(value) ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const { year, month } = view;
  // 1일이 놓일 칸(일=0). 앞의 빈 칸은 요소를 두지 않고 grid 시작 열로 비운다.
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="날짜 선택"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>날짜 선택</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.navigator}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => shiftMonth(-1)}
            aria-label="이전 달"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className={styles.period}>
            <p className={styles.year}>{year} 년</p>
            <span className={styles.monthDropdown}>
              <span className={styles.month}>{month + 1}월</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <select
                className={styles.monthSelect}
                value={month}
                aria-label="월 선택"
                onChange={(event) => setView({ year, month: Number(event.target.value) })}
              >
                {MONTH_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option + 1}월
                  </option>
                ))}
              </select>
            </span>
          </div>

          <button
            type="button"
            className={styles.iconButton}
            onClick={() => shiftMonth(1)}
            aria-label="다음 달"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M6 12L10 8L6 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.calendar}>
          <div className={styles.weekRow}>
            {WEEKDAY_HEADERS.map((weekday) => (
              <p key={weekday} className={styles.weekdayHeader}>
                {weekday}
              </p>
            ))}
          </div>

          <div className={styles.dateGrid}>
            {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => {
              const dateText = formatDateInput(new Date(year, month, day));
              const isSelected = dateText === selected;
              return (
                <button
                  key={day}
                  type="button"
                  className={`${styles.dayCell} ${isSelected ? styles.daySelected : ''}`}
                  style={day === 1 ? { gridColumnStart: firstWeekday + 1 } : undefined}
                  aria-pressed={isSelected}
                  onClick={() => setSelected(dateText)}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <Button disabled={selected === ''} onClick={() => onConfirm(selected)}>
          확인
        </Button>
      </div>
    </div>
  );
}
