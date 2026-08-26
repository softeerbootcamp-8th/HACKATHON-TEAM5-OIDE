import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
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
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOT_COUNT,
} from '../constants/roomRules';
import { expenseMethodPath, joinRoomPath, screenshotParsingPath } from '../constants/routes';
import { useExpenseDraft } from '../hooks/useExpenseDraft';
import { useLeaveConsumedScreen } from '../hooks/useLeaveConsumedScreen';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import styles from './ScreenshotUploadPage.module.css';

/**
 * C-02 선택한 스크린샷 확인.
 * 상한을 넘겨 고르면 넘친 만큼만 거절하고 나머지는 그대로 담는다.
 */
export function ScreenshotUploadPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const { screenshots, addScreenshots, removeScreenshot } = useExpenseDraft();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);

  // 고른 파일이 사라졌으면 그릴 것이 없다.
  const leave = useLeaveConsumedScreen(expenseMethodPath(shareCode));
  useEffect(() => {
    if (screenshots.length === 0) leave();
  }, [screenshots.length, leave]);

  const remaining = MAX_SCREENSHOT_COUNT - screenshots.length;

  const handleAdd = (fileList: FileList | null) => {
    if (!fileList) return;
    const picked = Array.from(fileList);
    const supported = picked.filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type));
    const withinSize = supported.filter((file) => file.size <= MAX_SCREENSHOT_BYTES);
    const accepted = withinSize.slice(0, remaining);

    const unsupportedCount = picked.length - supported.length;
    const oversizedCount = supported.length - withinSize.length;
    const overflowCount = Math.max(0, withinSize.length - remaining);
    const warnings = [
      unsupportedCount > 0 ? `지원하지 않는 형식 ${unsupportedCount}장` : null,
      oversizedCount > 0 ? `10MB를 넘는 이미지 ${oversizedCount}장` : null,
      overflowCount > 0 ? `20장 제한 초과 ${overflowCount}장` : null,
    ].filter((message): message is string => message !== null);

    setSelectionWarning(warnings.length > 0 ? `${warnings.join(', ')}은 빼고 담았어요.` : null);
    if (accepted.length > 0) addScreenshots(accepted);
  };

  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  if (screenshots.length === 0) return null;

  return (
    <MobileFrame tone="white">
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
        {selectionWarning && <Banner message={selectionWarning} />}
        <Button onClick={() => navigate(screenshotParsingPath(shareCode))}>
          {screenshots.length}장 분석하기
        </Button>
      </BottomActionBar>
    </MobileFrame>
  );
}
