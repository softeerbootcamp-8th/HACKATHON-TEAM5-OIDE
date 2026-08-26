import { useEffect, useState } from 'react';
import closeIcon from '../../assets/date-picker-close.svg';
import downIcon from '../../assets/date-picker-down.svg';
import leftIcon from '../../assets/date-picker-left.svg';
import rightIcon from '../../assets/date-picker-right.svg';
import type { DateTimeInputParts } from '../../utils/formatters';
import { Button } from './Button';
import { FieldLabel } from './FieldLabel';
import styles from './OptionalDateTimeFields.module.css';

interface OptionalDateTimeFieldsProps {
  value: DateTimeInputParts;
  onChange: (next: DateTimeInputParts) => void;
  errorMessage?: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export function OptionalDateTimeFields({
  value,
  onChange,
  errorMessage,
}: OptionalDateTimeFieldsProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    if (!isCalendarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCalendarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalendarOpen]);

  const openCalendar = () => {
    const selectedDate = parseLocalDate(value.date) ?? new Date();
    setPendingDate(formatLocalDate(selectedDate));
    setVisibleMonth(startOfMonth(selectedDate));
    setIsCalendarOpen(true);
  };

  const changeTime = (field: 'hour' | 'minute', next: string) => {
    onChange({ ...value, [field]: next.replace(/\D/g, '').slice(0, 2) });
  };

  const padTime = (field: 'hour' | 'minute') => {
    if (value[field].length === 1) {
      onChange({ ...value, [field]: value[field].padStart(2, '0') });
    }
  };

  return (
    <>
      <div className={styles.field}>
        <FieldLabel text="결제 날짜" />
        <button
          type="button"
          className={`${styles.dateButton} ${errorMessage ? styles.invalid : ''}`}
          aria-label="결제 날짜 선택"
          aria-invalid={Boolean(errorMessage)}
          onClick={openCalendar}
        >
          <span className={value.date ? styles.dateValue : styles.placeholder}>
            {value.date || '클릭해서 선택'}
          </span>
          <img className={styles.dateChevron} src={downIcon} alt="" />
        </button>
      </div>

      <div className={styles.field}>
        <FieldLabel text="결제 시간" />
        <div className={styles.timeRow}>
          <input
            className={`${styles.timeInput} ${errorMessage ? styles.invalid : ''}`}
            value={value.hour}
            placeholder="HH"
            inputMode="numeric"
            aria-label="결제 시간 시"
            aria-invalid={Boolean(errorMessage)}
            onChange={(event) => changeTime('hour', event.target.value)}
            onBlur={() => padTime('hour')}
          />
          <span className={styles.colon}>:</span>
          <input
            className={`${styles.timeInput} ${errorMessage ? styles.invalid : ''}`}
            value={value.minute}
            placeholder="MM"
            inputMode="numeric"
            aria-label="결제 시간 분"
            aria-invalid={Boolean(errorMessage)}
            onChange={(event) => changeTime('minute', event.target.value)}
            onBlur={() => padTime('minute')}
          />
        </div>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </div>

      {isCalendarOpen && (
        <div
          className={styles.backdrop}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsCalendarOpen(false);
          }}
        >
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-label="날짜 선택">
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>날짜 선택</h2>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="날짜 선택 닫기"
                onClick={() => setIsCalendarOpen(false)}
              >
                <img className={styles.closeIcon} src={closeIcon} alt="" />
              </button>
            </div>

            <div className={styles.monthHeader}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="이전 달"
                onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              >
                <img className={styles.arrowIcon} src={leftIcon} alt="" />
              </button>
              <div className={styles.monthLabel}>
                <span>{visibleMonth.getFullYear()}년</span>
                <label className={styles.monthSelectLabel}>
                  <span>{visibleMonth.getMonth() + 1}월</span>
                  <img className={styles.downIcon} src={downIcon} alt="" />
                  <select
                    className={styles.monthSelect}
                    value={visibleMonth.getMonth() + 1}
                    aria-label="월 선택"
                    onChange={(event) =>
                      setVisibleMonth(
                        new Date(visibleMonth.getFullYear(), Number(event.target.value) - 1, 1),
                      )
                    }
                  >
                    {MONTHS.map((month) => (
                      <option key={month} value={month}>
                        {month}월
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="다음 달"
                onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              >
                <img className={styles.arrowIcon} src={rightIcon} alt="" />
              </button>
            </div>

            <div className={styles.calendar}>
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className={styles.weekday}>
                  {weekday}
                </span>
              ))}
              {getCalendarDates(visibleMonth).map((date) => {
                const dateText = formatLocalDate(date);
                const isSelected = dateText === pendingDate;
                return (
                  <button
                    type="button"
                    key={dateText}
                    className={`${styles.day} ${
                      date.getMonth() === visibleMonth.getMonth() ? '' : styles.outsideDay
                    } ${isSelected ? styles.selectedDay : ''}`}
                    aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`}
                    aria-pressed={isSelected}
                    onClick={() => setPendingDate(dateText)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <Button
              className={styles.confirmButton}
              onClick={() => {
                onChange({ ...value, date: pendingDate });
                setIsCalendarOpen(false);
              }}
            >
              선택 완료
            </Button>
          </section>
        </div>
      )}
    </>
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDates(month: Date): Date[] {
  const firstDate = new Date(month.getFullYear(), month.getMonth(), 1);
  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(month.getFullYear(), month.getMonth(), index - firstDate.getDay() + 1),
  );
}

function parseLocalDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatLocalDate(date: Date): string {
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
