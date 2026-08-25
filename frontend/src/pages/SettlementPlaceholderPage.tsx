import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { splitGroupsPath } from '../constants/routes';

/**
 * flow #4(환율 · 최종 정산) 자리표시.
 * 분담을 마친 뒤의 진입점이 끊기지 않도록 경로만 잡아둔다.
 */
export function SettlementPlaceholderPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();

  return (
    <MobileFrame>
      <AppBar backTo={splitGroupsPath(shareCode)} />
      <EmptyState
        title="환율 적용은 준비 중이에요"
        description={'지금 시점의 환율로 계산해\n누가 누구에게 얼마를 보낼지 알려드릴 예정이에요.'}
      />
      <BottomActionBar>
        <Button onClick={() => navigate(splitGroupsPath(shareCode))}>그룹으로 돌아가기</Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
