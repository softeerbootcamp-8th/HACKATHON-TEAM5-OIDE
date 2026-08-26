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
 * 새로 누른 숫자를 살리기 위해 뒤에서 두 자리를 남긴다.
 *
 * 앞에서 자르면 `00` 처럼 두 자리가 이미 찬 칸에 다시 입력할 때 누른 숫자가 잘려
 * 값이 바뀌지 않는다. 커서가 값 앞에 놓였을 때도 마찬가지다.
 */
function takeLastTwoDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(-2);
}

/** 범위를 넘는 값을 최대치로 맞추고 `09` 처럼 두 자리로 만든다. */
function clampPart(digits: string, max: number): string {
  return String(Math.min(Number(digits), max)).padStart(2, '0');
}

/**
 * `시 : 분` 두 칸으로 나뉜 24시간 입력.
 *
 * 두 자리를 채우면 분으로 저절로 넘어간다. 한 자리만 누르고 칸을 벗어나면 `7` → `07` 로
 * 채운다. 입력 중에는 값을 손대지 않는다. 한 자리를 곧바로 두 자리로 확정하면 뒤이어 누른
 * 숫자가 이미 넘어간 분 칸으로 들어가기 때문이다.
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
    const digits = takeLastTwoDigits(raw);
    if (digits.length < 2) {
      // 아직 `1` → `12` 처럼 두 자리가 될 수 있어 손대지 않는다.
      onHourChange(digits);
      return;
    }
    onHourChange(clampPart(digits, 23));
    minuteRef.current?.focus();
  };

  const handleMinuteChange = (raw: string) => {
    const digits = takeLastTwoDigits(raw);
    onMinuteChange(digits.length < 2 ? digits : clampPart(digits, 59));
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
          aria-label="결제 시"
          aria-invalid={hasError}
          onFocus={(event) => event.target.select()}
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
          aria-label="결제 분"
          aria-invalid={hasError}
          onFocus={(event) => event.target.select()}
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
