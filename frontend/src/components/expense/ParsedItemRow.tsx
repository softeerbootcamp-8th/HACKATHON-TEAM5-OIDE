import type { ParsedPaymentDraft } from '../../types/payment';
import { formatAmount, formatDayTime } from '../../utils/formatters';
import styles from './ParsedItemRow.module.css';

interface ParsedItemRowProps {
  draft: ParsedPaymentDraft;
  onClick: () => void;
}

/**
 * C-05 · C-07 · C-08 이 공유하는 파싱 결과 행.
 *
 * 못 읽은 필드는 값 자리에 그대로 이유를 적는다. 어떤 필드가 비었는지
 * 사용자가 화면에서 바로 알 수 있어야 한다.
 */
export function ParsedItemRow({ draft, onClick }: ParsedItemRowProps) {
  const missingAmount = draft.amount === null;
  const missingCurrency = draft.currency === null;
  const needsInput = missingAmount || missingCurrency;

  return (
    <button
      type="button"
      className={`${styles.row} ${needsInput ? styles.needsInput : ''}`}
      onClick={onClick}
    >
      <span className={styles.body}>
        <span className={styles.merchant}>{draft.merchant ?? '결제처를 못 읽었어요'}</span>

        {missingAmount ? (
          <span className={styles.missingValue}>금액을 못 읽었어요</span>
        ) : (
          <span className={styles.amount}>
            {formatAmount(draft.amount!, draft.currency ?? 'JPY')}
          </span>
        )}

        <span className={styles.meta}>
          {draft.paidAt ? formatDayTime(draft.paidAt) : '시각 모름'}
          {' · '}
          {missingCurrency ? (
            <span className={styles.missingMeta}>통화를 못 읽었어요</span>
          ) : (
            draft.currency
          )}
        </span>
      </span>

      <span className={`${styles.action} ${needsInput ? styles.actionStrong : ''}`}>
        {needsInput ? '입력' : '수정'}
      </span>
    </button>
  );
}
