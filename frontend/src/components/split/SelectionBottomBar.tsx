import styles from './SelectionBottomBar.module.css';

interface SelectionBottomBarProps {
  selectedCount: number;
  /** 이미 통화 기호까지 붙인 문자열. */
  totalLabel: string;
  actionLabel: string;
  disabled?: boolean;
  onAction: () => void;
}

/** D-05 · D-06 하단의 선택 요약 + 진행 버튼. */
export function SelectionBottomBar({
  selectedCount,
  totalLabel,
  actionLabel,
  disabled = false,
  onAction,
}: SelectionBottomBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.summary}>
        <span className={styles.count}>{selectedCount}건 선택</span>
        <span className={styles.total}>{totalLabel}</span>
      </span>
      <button type="button" className={styles.action} onClick={onAction} disabled={disabled}>
        {actionLabel}
      </button>
    </div>
  );
}
