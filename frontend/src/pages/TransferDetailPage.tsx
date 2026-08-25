import { Navigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { AppBar } from '../components/layout/AppBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ALL_GROUP_NAME } from '../constants/roomRules';
import { joinRoomPath, transferListPath } from '../constants/routes';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { useSettlement } from '../hooks/useSettlement';
import type { Payment } from '../types/payment';
import { formatAmount } from '../utils/formatters';
import { formatKrw } from '../utils/krw';
import { findMemberBreakdown } from '../utils/settlementCalculation';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './TransferDetailPage.module.css';

/**
 * E-07 내 정산 상세.
 *
 * 송금 1건이 어떻게 나온 숫자인지 보여준다.
 * 결제한 금액 · 부담할 금액 · 보낼 금액과, 근거가 된 결제 내역을 함께 둔다 (FR-05).
 */
export function TransferDetailPage() {
  const { shareCode = '', index = '0' } = useParams<{ shareCode: string; index: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const { status, data, error, retry } = useSettlement(shareCode);

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  const transfer = data?.result.transfers[Number(index)];
  if (status === 'success' && !transfer) {
    return <Navigate to={transferListPath(shareCode)} replace />;
  }

  const sender = data?.result.members.find(
    (member) => member.memberId === transfer?.senderMemberId,
  );

  const groupNameOf = (payment: Payment): string => {
    const group = data?.groups.find((item) => item.id === payment.splitGroupId);
    if (!group) return `${ALL_GROUP_NAME} ${data?.allGroup?.memberIds.length ?? 0}명`;
    return group.type === 'ALL' ? `${group.name} ${group.memberIds.length}명` : group.name;
  };

  const breakdown =
    data && transfer
      ? findMemberBreakdown({
          memberId: transfer.senderMemberId,
          payments: data.targetPayments,
          shares: data.shares,
          rates: data.rateTable,
          fallbackMemberIds: data.allGroup?.memberIds ?? [],
          groupNameOf,
        })
      : [];

  // 보내는 사람이 결제자로 등록한 내역. 외화 원문도 함께 보여준다.
  const paidPayments =
    data?.targetPayments.filter((payment) => payment.payerMemberId === transfer?.senderMemberId) ??
    [];
  const paidForeign = paidPayments
    .filter((payment) => payment.currency !== 'KRW')
    .map((payment) => `${payment.currency} ${formatAmount(payment.amount, payment.currency)}`)
    .join(', ');

  return (
    <MobileFrame>
      <AppBar backTo={transferListPath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && transfer && sender && (
        <ScreenBody>
          <div className={styles.content}>
            <div className={styles.hero}>
              <span className={styles.parties}>
                <Avatar nickname={transfer.senderNickname} size="sm" />
                {transfer.senderNickname}
                <span className={styles.arrow} aria-label="에게">
                  →
                </span>
                <Avatar nickname={transfer.receiverNickname} size="sm" />
                {transfer.receiverNickname}
              </span>
              <span className={styles.heroAmount}>{formatKrw(transfer.amountKrw)}</span>
            </div>

            <div className={styles.figures}>
              <div className={styles.figureRow}>
                <span className={styles.figureLabel}>실제로 결제한 금액</span>
                <span className={styles.figureValue}>
                  {paidForeign ? `${paidForeign} · ` : ''}
                  {formatKrw(sender.paidKrw)}
                </span>
              </div>
              <div className={styles.figureRow}>
                <span className={styles.figureLabel}>추가로 부담해야 하는 금액</span>
                <span className={styles.figureValue}>{formatKrw(sender.owedKrw)}</span>
              </div>
              <div className={`${styles.figureRow} ${styles.figureRowStacked}`}>
                <span className={styles.figureLabel}>
                  {transfer.receiverNickname}이에게 보내야 하는 금액
                </span>
                <span className={styles.figureStrong}>
                  <span className={styles.strongValue}>{formatKrw(transfer.amountKrw)}</span>
                  <span className={styles.strongTotal}>
                    / {formatKrw(sender.payableKrw)} 중
                  </span>
                </span>
              </div>
            </div>

            <div>
              <p className={styles.sectionTitle}>내가 포함된 결제 내역</p>
            </div>

            <ul className={styles.breakdown}>
              {breakdown.map((row) => (
                <li key={row.paymentId} className={styles.item}>
                  <span className={styles.itemName}>
                    <span className={styles.merchant}>{row.merchant}</span>
                    <span className={styles.groupLabel}>{row.groupLabel}</span>
                  </span>
                  <span className={styles.itemAmount}>{formatKrw(row.amountKrw)}</span>
                </li>
              ))}
            </ul>
          </div>
        </ScreenBody>
      )}
    </MobileFrame>
  );
}

