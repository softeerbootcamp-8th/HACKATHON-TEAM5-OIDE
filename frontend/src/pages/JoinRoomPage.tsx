import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { SelectableMemberRow } from '../components/common/SelectableMemberRow';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { roomHomePath } from '../constants/routes';
import { useAsync } from '../hooks/useAsync';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { getRoomByShareCode } from '../services/roomService';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './JoinRoomPage.module.css';

/**
 * A-06 링크 진입 · 닉네임 선택.
 *
 * 서버가 선점 상태를 갖지 않으므로 모든 닉네임을 똑같이 고를 수 있다.
 * 방이 만료됐으면(410) A-08 로 대체한다.
 */
export function JoinRoomPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { remember } = useLocalIdentity(shareCode);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { status, data: room, error, retry } = useAsync(
    () => getRoomByShareCode(shareCode),
    [shareCode],
  );

  if (status === 'error' && error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }

  const creatorNickname = room?.members[0]?.nickname;
  const selectedMember = room?.members.find((member) => member.id === selectedMemberId);

  const handleEnter = () => {
    if (!selectedMember) return;
    remember({ memberId: selectedMember.id, nickname: selectedMember.nickname });
    navigate(roomHomePath(shareCode));
  };

  return (
    <MobileFrame tone="white">
      {/* 링크로 들어온 최상위 화면이라 되돌아갈 곳이 없다. */}
      <AppBar />
      {status === 'loading' && <LoadingState />}

      {status === 'error' && (
        <ErrorState
          title={
            error?.code === 'ROOM_NOT_FOUND'
              ? '정산방을 찾을 수 없어요'
              : '정산방을 불러오지 못했어요'
          }
          description={error?.message}
          onRetry={error?.code === 'ROOM_NOT_FOUND' ? undefined : retry}
        />
      )}

      {status === 'success' && room && (
        <>
          <ScreenBody>
            <ScreenHeader
              title="어떤 분이신가요?"
              description={`${creatorNickname}님이 미리 등록해둔 닉네임 중에서 골라주세요.`}
            />
            <ul className={styles.memberList}>
              {room.members.map((member) => (
                <li key={member.id}>
                  <SelectableMemberRow
                    nickname={member.nickname}
                    selected={member.id === selectedMemberId}
                    onSelect={() => setSelectedMemberId(member.id)}
                  />
                </li>
              ))}
            </ul>
          </ScreenBody>
          <BottomActionBar>
            <Button disabled={!selectedMember} onClick={handleEnter}>
              정산방 들어가기
            </Button>
          </BottomActionBar>
        </>
      )}
    </MobileFrame>
  );
}
