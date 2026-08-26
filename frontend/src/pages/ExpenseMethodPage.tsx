import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import manualIcon from '../assets/method-manual.png';
import screenshotIcon from '../assets/method-screenshot.png';
import { Button } from '../components/common/Button';
import { MethodCard } from '../components/expense/MethodCard';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { ACCEPTED_IMAGE_TYPES, MAX_SCREENSHOT_COUNT } from '../constants/roomRules';
import { manualExpensePath, roomHomePath, screenshotUploadPath } from '../constants/routes';
import { useExpenseDraft } from '../hooks/useExpenseDraft';
import styles from './ExpenseMethodPage.module.css';

type ExpenseMethod = 'screenshot' | 'manual';

/**
 * C-01 등록 방식 선택.
 *
 * 카드는 선택만 하고 진행은 하단 `다음` 이 맡는다.
 * `스크린샷으로 등록하기`는 OS 사진 피커를 연다. 브라우저는 사진 라이브러리를 직접
 * 읽을 수 없어 와이어프레임의 `최근 항목` 그리드 대신 파일 선택을 쓴다.
 */
export function ExpenseMethodPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { addScreenshots, reset } = useExpenseDraft();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<ExpenseMethod | null>(null);

  const handleNext = () => {
    if (method === 'screenshot') {
      fileInputRef.current?.click();
      return;
    }
    if (method === 'manual') {
      navigate(manualExpensePath(shareCode));
    }
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    reset();
    addScreenshots(Array.from(fileList).slice(0, MAX_SCREENSHOT_COUNT));
    navigate(screenshotUploadPath(shareCode));
  };

  return (
    <MobileFrame>
      <AppBar backTo={roomHomePath(shareCode)} />
      <ScreenBody>
        <ScreenHeader title={'두 가지 방법 중 하나를 선택해\n결제 내역을 입력할 수 있어요'} />
        <div className={styles.cards}>
          <MethodCard
            badge="뱅킹 캡쳐"
            iconSrc={screenshotIcon}
            iconSize={76}
            title={'스크린샷으로\n등록하기'}
            selected={method === 'screenshot'}
            onSelect={() => setMethod('screenshot')}
          />
          <MethodCard
            badge="금액 입력"
            iconSrc={manualIcon}
            iconSize={70}
            title={'직접 내역\n입력하기'}
            selected={method === 'manual'}
            onSelect={() => setMethod('manual')}
          />
        </div>

        <input
          ref={fileInputRef}
          className={styles.fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          onChange={(event) => handleFilesSelected(event.target.files)}
        />
      </ScreenBody>
      <BottomActionBar>
        <Button disabled={method === null} onClick={handleNext}>
          다음
        </Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
