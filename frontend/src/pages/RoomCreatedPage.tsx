import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { LinkShareBox } from '../components/common/LinkShareBox';
import { LoadingState } from '../components/common/LoadingState';
import { SelectableMemberRow } from '../components/common/SelectableMemberRow';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { ROOM_TTL_DAYS } from '../constants/roomRules';
import { roomHomePath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getRoomByShareCode } from '../services/roomService';
import { buildShareUrl, formatShareUrlForDisplay } from '../utils/shareLink';
import styles from './RoomCreatedPage.module.css';

/**
 * A-05 방 생성 완료 · 링크 공유.
 *
 * 방을 만든 사람은 첫 번째 닉네임(displayOrder 0)을 본인으로 갖는다.
 */
export function RoomCreatedPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity, remember } = useLocalIdentity(shareCode);

  const { status, data: room, error, retry } = useAsync(
    () => getRoomByShareCode(shareCode),
    [shareCode],
  );

  const firstMember = room?.members[0];

  // 방을 만든 사람은 대개 맨 앞에 자기 닉네임을 적으므로 첫 번째를 기본으로 둔다.
  // 아니라면 아래 목록에서 눌러 바꿀 수 있다.
  useEffect(() => {
    if (firstMember && !identity) {
      remember({ memberId: firstMember.id, nickname: firstMember.nickname });
    }
  }, [firstMember, identity, remember]);

  const handleEnter = () => {
    navigate(roomHomePath(shareCode));
  };

  return (
    <MobileFrame tone="white">
      {/* 방이 이미 만들어져 되돌릴 수 없다. 링크를 잃지 않도록 뒤로가기를 두지 않는다. */}
      <AppBar showBack={false} />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState
          title="정산방을 불러오지 못했어요"
          description={error?.message}
          onRetry={retry}
        />
      )}

      {status === 'success' && room && (
        <>
          <ScreenBody>
            <ScreenHeader
              title="정산방이 만들어졌어요"
              description="함께 여행한 사람들에게 링크를 보내주세요."
            />
            <div className={styles.content}>
              <LinkShareBox
                displayUrl={formatShareUrlForDisplay(room.shareCode)}
                copyUrl={buildShareUrl(room.shareCode)}
              />
              <p className={styles.linkHint}>
                링크는 {ROOM_TTL_DAYS}일 동안 사용할 수 있어요
              </p>

              <h2 className={styles.sectionTitle}>참여자</h2>
              <p className={styles.sectionHint}>어느 분이신가요? 눌러서 골라주세요.</p>
              <ul className={styles.memberList}>
                {room.members.map((member) => (
                  <li key={member.id}>
                    <SelectableMemberRow
                      nickname={member.nickname}
                      selected={member.id === identity?.memberId}
                      onSelect={() =>
                        remember({ memberId: member.id, nickname: member.nickname })
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          </ScreenBody>
          <BottomActionBar>
            <Button onClick={handleEnter}>정산방으로 이동</Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
