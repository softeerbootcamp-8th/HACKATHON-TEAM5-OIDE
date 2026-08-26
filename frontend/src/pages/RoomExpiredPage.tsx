import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ROOM_TTL_DAYS } from '../constants/roomRules';
import { ROUTES } from '../constants/routes';

/**
 * A-08 만료된 방.
 * 복구할 수 없다는 사실을 분명히 하고 새 방을 만들도록 안내한다.
 */
export function RoomExpiredPage() {
  const navigate = useNavigate();

  return (
    <MobileFrame tone="white">
      <AppBar showBack={false} />
      <EmptyState
        title="이 정산방은 사라졌어요"
        description={`정산방은 만든 날부터 ${ROOM_TTL_DAYS}일 동안만 유지돼요.\n새 정산방을 만들어 다시 시작할 수 있어요.`}
      />
      <BottomActionBar>
        <Button onClick={() => navigate(ROUTES.landing)}>새 정산방 만들기</Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
