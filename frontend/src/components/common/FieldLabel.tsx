import styles from './FieldLabel.module.css';

interface FieldLabelProps {
  text: string;
  /** 필수 필드에만 `*` 를 붙인다. 결제처·결제 날짜·시간은 선택이다 (FR-02). */
  required?: boolean;
  /** 선택 필드의 `· 선택` 표시. C-06 결제처처럼 표시하지 않는 라벨이 있다. */
  showOptionalHint?: boolean;
}

export function FieldLabel({
  text,
  required = false,
  showOptionalHint = true,
}: FieldLabelProps) {
  return (
    <p className={styles.label}>
      {text}
      {required && (
        <span className={styles.required} aria-label="필수">
          *
        </span>
      )}
      {!required && showOptionalHint && <span className={styles.optional}>· 선택</span>}
    </p>
  );
}
