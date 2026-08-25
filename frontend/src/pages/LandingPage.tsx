import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { BulletCardList } from '../components/common/BulletCardList';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { ROUTES } from '../constants/routes';
import { ROOM_TTL_DAYS } from '../constants/roomRules';
import styles from './LandingPage.module.css';

/** A-01 랜딩. 설치·가입이 없다는 점과 7일 후 삭제를 여기에서 알린다. */
export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    '앱 설치도, 회원가입도 필요 없어요',
    '링크를 공유하면 바로 함께 정산해요',
    `정산방은 만든 날부터 ${ROOM_TTL_DAYS}일 뒤 사라져요`,
  ];

  return (
    <MobileFrame>
      <AppBar showBack={false} />
      <ScreenBody>
        <ScreenHeader
          title={'여행 정산,\n사진만 올리면 끝나요'}
          description={
            '결제 내역 스크린샷을 올리면 환율까지 반영해\n누가 누구에게 얼마를 보내면 되는지 알려드려요.'
          }
        />
        <div className={styles.intro}>
          <BulletCardList items={features} />
        </div>
      </ScreenBody>
      <BottomActionBar>
        <Button onClick={() => navigate(ROUTES.createMembers)}>정산방 만들기</Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
