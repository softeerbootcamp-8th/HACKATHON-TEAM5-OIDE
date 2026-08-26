import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { joinRoomPath, settlementDonePath, transferDetailPath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getConfirmedSettlement } from '../services/settlementService';
import { copyToClipboard } from '../utils/clipboard';
import { formatKrw, formatQuotedAt, formatRateLine } from '../utils/krw';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './TransferListPage.module.css';

/**
 * E-06 송금 리스트.
 *
 * 받을 돈과 보낼 돈을 상계해 가장 적은 횟수만 보여준다.
 * 모든 참여자 쌍의 채무를 그대로 나열하지 않는다 (FR-05).
 * 방은 7일 뒤 사라지므로 단톡방에 옮겨둘 수 있게 복사를 제공한다.
 */
export function TransferListPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const load = useCallback(() => getConfirmedSettlement(shareCode), [shareCode]);
  const { status, data, error, retry } = useAsync(load, [shareCode]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }
  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }

  const transfers = data?.transfers ?? [];
  const primaryRate = data?.rates.find((rate) => rate.currency !== 'KRW');

  const handleCopy = async () => {
    const lines = transfers.map(
      (transfer) =>
        `${transfer.senderNickname} → ${transfer.receiverNickname} ${formatKrw(transfer.amountKrw)}`,
    );
    if (primaryRate?.rateToKrw && primaryRate.quotedAt) {
      lines.push(
        '',
        `적용된 환율 ${formatRateLine(primaryRate.currency, primaryRate.rateToKrw)} · ${formatQuotedAt(primaryRate.quotedAt)}`,
      );
    }
    const succeeded = await copyToClipboard(lines.join('\n'));
    setCopyState(succeeded ? 'copied' : 'failed');
    window.setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <MobileFrame>
      <AppBar backTo={settlementDonePath(shareCode)} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState title="불러오지 못했어요" description={error?.message} onRetry={retry} />
      )}

      {status === 'success' && data && (
        <>
          <ScreenBody>
            <ScreenHeader
              title={
                transfers.length === 0
                  ? '주고받을 돈이 없어요'
                  : `이렇게 ${transfers.length}번만 보내면 끝나요`
              }
              description={
                transfers.length === 0
                  ? undefined
                  : '주고받을 돈을 서로 퉁쳐서 가장 적은 횟수로 정리했어요.'
              }
            />

            {transfers.length === 0 ? (
              <EmptyState
                title="딱 맞게 나뉘었어요"
                description="서로 보낼 돈이 남지 않았어요"
              />
            ) : (
              <div className={styles.content}>
                <ul className={styles.transfers}>
                  {transfers.map((transfer, index) => (
                    <li key={`${transfer.senderMemberId}-${transfer.receiverMemberId}-${index}`}>
                      <button
                        type="button"
                        className={styles.transfer}
                        onClick={() => navigate(transferDetailPath(shareCode, index))}
                      >
                        <span className={styles.person}>
                          <Avatar nickname={transfer.senderNickname} size="sm" />
                          {transfer.senderNickname}
                        </span>
                        <span className={styles.arrow} aria-label="에게">
                          →
                        </span>
                        <span className={styles.person}>
                          <Avatar nickname={transfer.receiverNickname} size="sm" />
                          {transfer.receiverNickname}
                        </span>
                        <span className={styles.spacer} />
                        <span className={styles.amount}>{formatKrw(transfer.amountKrw)}</span>
                      </button>
                    </li>
                  ))}
                </ul>

                {primaryRate?.rateToKrw && primaryRate.quotedAt && (
                  <div className={styles.rateBox}>
                    <span className={styles.rateLabel}>적용된 환율</span>
                    <span className={styles.rateValue}>
                      {formatRateLine(primaryRate.currency, primaryRate.rateToKrw)} ·{' '}
                      {formatQuotedAt(primaryRate.quotedAt)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </ScreenBody>

          <BottomActionBar>
            <Button disabled={transfers.length === 0} onClick={handleCopy}>
              {copyState === 'copied'
                ? '복사했어요'
                : copyState === 'failed'
                  ? '복사하지 못했어요'
                  : '클립보드에 복사'}
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
