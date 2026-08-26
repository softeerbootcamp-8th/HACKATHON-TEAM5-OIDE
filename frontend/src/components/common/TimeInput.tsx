import { useRef } from 'react';
import styles from './TimeInput.module.css';

interface TimeInputProps {
  /** 24시간 표기의 시. `''` 이거나 `00`~`23`. */
  hour: string;
  /** `''` 이거나 `00`~`59`. */
  minute: string;
  onHourChange: (next: string) => void;
  onMinuteChange: (next: string) => void;
  errorMessage?: string;
}

/** 두 자리를 넘겨받아 `09` 처럼 채운다. 비어 있으면 그대로 둔다. */
function padPart(value: string): string {
  return value === '' ? '' : value.padStart(2, '0');
}

/**
 * `시 : 분` 두 칸으로 나뉜 24시간 입력.
 *
 * 시를 다 넣으면 분으로 저절로 넘어간다. `9` 처럼 뒤에 숫자가 붙을 수 없는 값은
 * 한 자리만 눌러도 `09` 로 확정하고 넘긴다. 두 칸을 오가며 탭을 누르지 않게 하려는 것이다.
 */
export function TimeInput({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  errorMessage,
}: TimeInputProps) {
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);
  const hasError = Boolean(errorMessage);

  const handleHourChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    if (digits.length === 1 && Number(digits) < 3) {
      // 아직 `1` → `12` 처럼 두 자리가 될 수 있어 넘기지 않는다.
      onHourChange(digits);
      return;
    }
    if (digits === '') {
      onHourChange('');
      return;
    }
    onHourChange(String(Math.min(Number(digits), 23)).padStart(2, '0'));
    minuteRef.current?.focus();
  };

  const handleMinuteChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    if (digits === '' || (digits.length === 1 && Number(digits) < 6)) {
      onMinuteChange(digits);
      return;
    }
    onMinuteChange(String(Math.min(Number(digits), 59)).padStart(2, '0'));
  };

  return (
    <div className={styles.field}>
      <div className={styles.group}>
        <input
          ref={hourRef}
          className={`${styles.part} ${hasError ? styles.invalid : ''}`}
          value={hour}
          placeholder="00"
          inputMode="numeric"
          maxLength={2}
          aria-label="결제 시"
          aria-invalid={hasError}
          onChange={(event) => handleHourChange(event.target.value)}
          onBlur={() => onHourChange(padPart(hour))}
        />
        <span className={styles.separator} aria-hidden="true">
          :
        </span>
        <input
          ref={minuteRef}
          className={`${styles.part} ${hasError ? styles.invalid : ''}`}
          value={minute}
          placeholder="00"
          inputMode="numeric"
          maxLength={2}
          aria-label="결제 분"
          aria-invalid={hasError}
          onChange={(event) => handleMinuteChange(event.target.value)}
          onBlur={() => onMinuteChange(padPart(minute))}
          onKeyDown={(event) => {
            // 빈 분에서 지우면 시로 되돌아간다.
            if (event.key === 'Backspace' && minute === '') hourRef.current?.focus();
          }}
        />
      </div>
      {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
    </div>
  );
}
