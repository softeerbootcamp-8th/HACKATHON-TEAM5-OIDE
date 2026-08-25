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
    <MobileFrame>
      <AppBar backTo={ROUTES.landing} />
      <ScreenBody>
        <ScreenHeader
          title="몇 명이 함께 정산하나요?"
          description="본인을 포함한 인원을 골라주세요."
        />
        <div className={styles.content}>
          <Stepper
            label="정산 인원 수"
            value={draft.memberCount}
            min={MIN_MEMBER_COUNT}
            max={MAX_MEMBER_COUNT}
            onChange={setMemberCount}
          />
          <p className={styles.hint}>최소 {MIN_MEMBER_COUNT}명부터 만들 수 있어요</p>
        </div>
      </ScreenBody>
      <BottomActionBar>
        <Button onClick={() => navigate(ROUTES.createNicknames)}>다음</Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
