import styles from './FieldLabel.module.css';

interface FieldLabelProps {
  text: string;
  /** 필수 필드에만 `*` 를 붙인다. 결제처·결제 시각은 선택이다 (FR-02). */
  required?: boolean;
  size?: 'default' | 'large';
}

export function FieldLabel({ text, required = false, size = 'default' }: FieldLabelProps) {
  return (
    <p className={`${styles.label} ${size === 'large' ? styles.large : ''}`}>
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
