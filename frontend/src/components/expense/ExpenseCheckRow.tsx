import type { Payment } from '../../types/payment';
import { formatAmount, formatTime } from '../../utils/formatters';
import { CheckCircle } from '../common/CheckCircle';
import styles from './ExpenseCheckRow.module.css';

interface ExpenseCheckRowProps {
  payment: Payment;
  /** 고른 상태. 지정하지 않으면 결제 내역의 정산 포함 여부를 따른다. */
  checked?: boolean;
  /**
   * 다른 그룹이 이미 가져간 항목의 그룹 이름.
   * 지정하면 고를 수 없고 어느 그룹에 담겼는지 함께 보여준다.
   */
  assignedGroupName?: string;
  onToggle: () => void;
}

/**
 * 결제 내역 카드. B-02 의 정산 포함 선택과 D-05 · D-06 의 항목 선택이 함께 쓴다.
 *
 * 고르지 않은 카드는 흐리게 하지 않는다. 아직 안 고른 것이지 못 고르는 것이
 * 아니라서 상태는 체크 표시로만 구분한다. 다른 그룹이 가져간 항목만 예외로
 * 흐리게 하고, 목록에서 감추지는 않는다.
 */
export function ExpenseCheckRow({
  payment,
  checked,
  assignedGroupName,
  onToggle,
}: ExpenseCheckRowProps) {
  const isChecked = checked ?? payment.includedInSettlement;
  const takenByOtherGroup = Boolean(assignedGroupName);

  return (
    <button
      type="button"
      className={`${styles.row} ${takenByOtherGroup ? styles.taken : ''}`}
      onClick={onToggle}
      disabled={takenByOtherGroup}
      aria-pressed={isChecked}
    >
      <span className={styles.body}>
        <span className={styles.merchant}>{payment.merchant ?? '결제처 없음'}</span>
        <span className={styles.amount}>{formatAmount(payment.amount, payment.currency)}</span>
        <span className={styles.meta}>
          {payment.paidAt ? `${formatTime(payment.paidAt)} · ` : ''}
          {payment.currency}
          {assignedGroupName ? ` · ${assignedGroupName} 그룹에 담김` : ''}
        </span>
      </span>
      <CheckCircle checked={isChecked} />
    </button>
  );
}
