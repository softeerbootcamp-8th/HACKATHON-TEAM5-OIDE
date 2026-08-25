import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import {
  AddScreenshotTile,
  ScreenshotThumbnail,
} from '../components/expense/ScreenshotThumbnail';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { ACCEPTED_IMAGE_TYPES, MAX_SCREENSHOT_COUNT } from '../constants/roomRules';
import { expenseMethodPath, screenshotParsingPath } from '../constants/routes';
import { useExpenseDraft } from '../hooks/useExpenseDraft';
import { useLeaveConsumedScreen } from '../hooks/useLeaveConsumedScreen';
import styles from './ScreenshotUploadPage.module.css';

/**
 * C-02 선택한 스크린샷 확인.
 * 상한을 넘겨 고르면 넘친 만큼만 거절하고 나머지는 그대로 담는다.
 */
export function ScreenshotUploadPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { screenshots, addScreenshots, removeScreenshot } = useExpenseDraft();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef(0);

  // 고른 파일이 사라졌으면 그릴 것이 없다.
  const leave = useLeaveConsumedScreen(expenseMethodPath(shareCode));
  useEffect(() => {
    if (screenshots.length === 0) leave();
  }, [screenshots.length, leave]);

  const remaining = MAX_SCREENSHOT_COUNT - screenshots.length;

  const handleAdd = (fileList: FileList | null) => {
    if (!fileList) return;
    const picked = Array.from(fileList);
    overflowRef.current = Math.max(0, picked.length - remaining);
    addScreenshots(picked.slice(0, remaining));
  };

  if (screenshots.length === 0) return null;

  return (
    <MobileFrame>
      <AppBar backTo={expenseMethodPath(shareCode)} />
      <ScreenBody>
        <ScreenHeader title="선택한 스크린샷을 확인해주세요" />
        <div className={styles.content}>
          <div className={styles.grid}>
            {screenshots.map((screenshot, index) => (
              <ScreenshotThumbnail
                key={screenshot.key}
                url={screenshot.previewUrl}
                index={index}
                onRemove={() => removeScreenshot(screenshot.key)}
              />
            ))}
            {remaining > 0 && (
              <AddScreenshotTile onClick={() => fileInputRef.current?.click()} />
            )}
          </div>
          <p className={styles.counter}>
            {screenshots.length}/{MAX_SCREENSHOT_COUNT}
          </p>
        </div>

        <input
          ref={fileInputRef}
          className={styles.fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          onChange={(event) => handleAdd(event.target.files)}
        />
      </ScreenBody>
      <BottomActionBar>
        {overflowRef.current > 0 && (
          <Banner
            message={`한 번에 ${MAX_SCREENSHOT_COUNT}장까지 올릴 수 있어요. ${overflowRef.current}장은 빼고 담았어요.`}
          />
        )}
        <Button onClick={() => navigate(screenshotParsingPath(shareCode))}>
          {screenshots.length}장 분석하기
        </Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
