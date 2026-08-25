import styles from './FieldLabel.module.css';

interface FieldLabelProps {
  text: string;
  /** 필수 필드에만 `*` 를 붙인다. 결제처·결제 시각은 선택이다 (FR-02). */
  required?: boolean;
}

export function FieldLabel({ text, required = false }: FieldLabelProps) {
  return (
    <p className={styles.label}>
      {text}
      {required ? (
        <span className={styles.required} aria-label="필수">
          *
        </span>
      ) : (
        <span className={styles.optional}>· 선택</span>
      )}
    </p>
  );
}
