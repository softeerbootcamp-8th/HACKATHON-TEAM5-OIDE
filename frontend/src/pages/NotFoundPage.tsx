import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ROUTES } from '../constants/routes';

/** 정의되지 않은 경로. */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <MobileFrame>
      <AppBar showBack={false} />
      <EmptyState
        title="찾을 수 없는 화면이에요"
        description="주소를 다시 확인해주세요."
      />
      <BottomActionBar>
        <Button onClick={() => navigate(ROUTES.landing)}>처음으로</Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
