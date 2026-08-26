import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Stepper } from '../components/common/Stepper';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { MAX_MEMBER_COUNT, MIN_MEMBER_COUNT } from '../constants/roomRules';
import { ROUTES } from '../constants/routes';
import { useCreateRoomDraft } from '../hooks/useCreateRoomDraft';
import styles from './CreateRoomMemberCountPage.module.css';

/** A-02 인원 수. 최소 인원 아래로는 내려가지 않는다. */
export function CreateRoomMemberCountPage() {
  const navigate = useNavigate();
  const { draft, setMemberCount } = useCreateRoomDraft();

  return (
    <MobileFrame tone="white">
      <AppBar backTo={ROUTES.landing} />
      <ScreenBody>
        <ScreenHeader
          title="몇 명이 함께 정산하나요?"
          description={`본인을 포함해 ${MIN_MEMBER_COUNT}명 이상일 때 개설할 수 있어요.`}
        />
        <div className={styles.content}>
          <span className={styles.label}>총 정산 인원</span>
          <Stepper
            label="정산 인원 수"
            value={draft.memberCount}
            min={MIN_MEMBER_COUNT}
            max={MAX_MEMBER_COUNT}
            onChange={setMemberCount}
          />
        </div>
      </ScreenBody>
      <BottomActionBar>
        <Button onClick={() => navigate(ROUTES.createNicknames)}>다음</Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
