import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { ProgressBar } from '../components/common/ProgressBar';
import { SkeletonRows } from '../components/common/SkeletonRows';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import {
  expenseMethodPath,
  manualExpensePath,
  parsedResultPath,
  screenshotUploadPath,
} from '../constants/routes';
import { useExpenseDraft } from '../hooks/useExpenseDraft';
import { useLeaveConsumedScreen } from '../hooks/useLeaveConsumedScreen';
import { usePaymentExtraction } from '../hooks/usePaymentExtraction';
import { RoomExpiredPage } from './RoomExpiredPage';
import styles from './ScreenshotParsingPage.module.css';

/**
 * C-04 파싱 중.
 *
 * 스크린샷을 한 번에 올리고 비동기 추출 작업을 폴링한다.
 * 한 장이 실패해도 나머지는 살리고, 등록할 결과가 없을 때만 오류 화면을 보여준다.
 */
export function ScreenshotParsingPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { screenshots, setParsed } = useExpenseDraft();
  const extraction = usePaymentExtraction(shareCode, screenshots);
  const consumedRef = useRef(false);
  const total = extraction.totalImages;

  const leave = useLeaveConsumedScreen(expenseMethodPath(shareCode));

  useEffect(() => {
    if (screenshots.length === 0) leave();
  }, [screenshots.length, leave]);

  useEffect(() => {
    const result = extraction.result;
    if (!result || result.drafts.length === 0 || consumedRef.current) return;
    consumedRef.current = true;
    setParsed(result.images, result.drafts);
    navigate(parsedResultPath(shareCode), { replace: true });
  }, [extraction.result, navigate, setParsed, shareCode]);

  if (extraction.error?.code === 'ROOM_EXPIRED') {
    return <RoomExpiredPage />;
  }

  const noExtractedPayments =
    extraction.status === 'success' && extraction.result?.drafts.length === 0;
  if (extraction.status === 'error' || noExtractedPayments) {
    return (
      <MobileFrame>
        <AppBar backTo={screenshotUploadPath(shareCode)} />
        <ErrorState
          title="스크린샷에서 결제 내역을 찾지 못했어요"
          description={'글자가 잘 보이는 사진으로 다시 올리거나,\n직접 입력해서 등록할 수 있어요.'}
        />
        <BottomActionBar>
          <Button onClick={() => navigate(manualExpensePath(shareCode))}>직접 입력하기</Button>
          <Button variant="text" onClick={() => navigate(screenshotUploadPath(shareCode))}>
            다시 고르기
          </Button>
        </BottomActionBar>
      </MobileFrame>
    );
  }

  const current = Math.min(extraction.finishedImages + 1, total);

  return (
    <MobileFrame>
      <AppBar showBack={false} />
      <ScreenBody>
        <ScreenHeader
          title="결제 내역을 읽고 있어요"
          description={`${total}장 중 ${current}장째 · 잠시만 기다려주세요`}
        />
        <div className={styles.content}>
          <ProgressBar
            value={total === 0 ? 0 : extraction.finishedImages / total}
            label="분석 진행률"
          />
          <SkeletonRows count={3} />
        </div>
      </ScreenBody>
    </MobileFrame>
  );
}
