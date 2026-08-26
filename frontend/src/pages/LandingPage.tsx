import { useNavigate } from 'react-router-dom';
import logo from '../assets/enppang-logo.png';
import iconDollar from '../assets/icon-dollar.svg';
import iconLink from '../assets/icon-link.svg';
import iconReceipt from '../assets/icon-receipt.svg';
import { Button } from '../components/common/Button';
import { FeatureList } from '../components/common/FeatureList';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ROUTES } from '../constants/routes';
import styles from './LandingPage.module.css';

const FEATURES = [
  {
    icon: iconLink,
    title: '링크로 쉽고 빠르게',
    description: '링크를 공유하여 바로 함께 정산해요',
  },
  {
    icon: iconReceipt,
    title: '복잡한 n번 송금은 그만!',
    description: '결제 내역을 올리면 간단한 정산 방식을 알려드려요',
  },
  {
    icon: iconDollar,
    title: '귀찮은 환율 계산을 대신',
    description: '환율을 반영해 원화로 송금 금액을 알려드려요',
  },
];

/** A-01 랜딩. */
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <MobileFrame tone="white">
      <AppBar showBack={false} />
      <ScreenBody>
        <h1 className={styles.title}>
          <span className={styles.accent}>여행</span> 다녀오셨나요?
          <br />
          사진만 올리면 <span className={styles.accent}>정산</span>이 끝나요
        </h1>
        <div className={styles.middle}>
          <div className={styles.logoCenter}>
            <img src={logo} alt="엔빵" className={styles.logo} />
          </div>
          <FeatureList items={FEATURES} />
        </div>
      </ScreenBody>
      <BottomActionBar>
        <Button onClick={() => navigate(ROUTES.createMembers)}>정산방 만들기</Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
