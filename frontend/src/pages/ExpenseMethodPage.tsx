import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MethodCard } from '../components/expense/MethodCard';
import { AppBar } from '../components/layout/AppBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { ACCEPTED_IMAGE_TYPES, MAX_SCREENSHOT_COUNT } from '../constants/roomRules';
import { manualExpensePath, roomHomePath, screenshotUploadPath } from '../constants/routes';
import { useExpenseDraft } from '../hooks/useExpenseDraft';
import styles from './ExpenseMethodPage.module.css';

/**
 * C-01 등록 방식 선택.
 *
 * `스크린샷으로 등록`은 OS 사진 피커를 연다. 브라우저는 사진 라이브러리를 직접
 * 읽을 수 없어 와이어프레임의 `최근 항목` 그리드 대신 파일 선택을 쓴다.
 */
export function ExpenseMethodPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { addScreenshots, reset } = useExpenseDraft();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <ScreenHeader title={'결제 내역을\n어떻게 넣을까요?'} />
        <div className={styles.cards}>
          <MethodCard
            icon={<ReceiptIcon />}
            title="스크린샷으로 등록"
            description={`뱅킹 앱 결제 내역을 찍어 올리면 결제처·시각·금액·통화를 알아서 뽑아드려요. 한 번에 ${MAX_SCREENSHOT_COUNT}장까지 올릴 수 있어요.`}
            onClick={() => fileInputRef.current?.click()}
          />
          <MethodCard
            icon={<PencilIcon />}
            title="직접 입력"
            description="금액과 통화만 있으면 등록할 수 있어요."
            onClick={() => navigate(manualExpensePath(shareCode))}
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
    </MobileFrame>
  );
}

function ReceiptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3.5" y="1.5" width="11" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 5.5h5M6.5 8.5h5M6.5 11.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M12.2 2.3a1.6 1.6 0 0 1 2.3 2.3L6 13.1l-3 .9.9-3 8.3-8.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
