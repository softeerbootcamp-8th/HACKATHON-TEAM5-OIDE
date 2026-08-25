import { useEffect, useRef, useState } from 'react';
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
import { parseReceiptImage } from '../services/paymentService';
import type { ParsedPaymentDraft, ReceiptImage } from '../types/payment';
import styles from './ScreenshotParsingPage.module.css';

/**
 * C-04 파싱 중.
 *
 * 스크린샷을 한 장씩 요청하고 완료 개수로 진행률을 센다.
 * 한 장이 실패해도 나머지는 살리고, 전부 실패했을 때만 오류 화면을 보여준다.
 */
export function ScreenshotParsingPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { screenshots, setParsed } = useExpenseDraft();

  const [doneCount, setDoneCount] = useState(0);
  const [failed, setFailed] = useState(false);
  /** 업로드를 두 번 시작하지 않도록 하는 잠금. */
  const startedRef = useRef(false);
  /** 아직 이 화면에 있는지. 떠났으면 결과 화면으로 밀지 않는다. */
  const onScreenRef = useRef(true);

  const total = screenshots.length;

  // StrictMode 는 이 효과를 두 번 실행하지만 ref 는 살아남는다.
  // 취소 플래그로 중단하면 두 번째 실행이 잠금에 막혀 아무도 이어받지 못하므로,
  // 시작은 한 번만 하되 중간에 끊지 않는다.
  useEffect(() => {
    onScreenRef.current = true;
    return () => {
      onScreenRef.current = false;
    };
  }, []);

  const leave = useLeaveConsumedScreen(expenseMethodPath(shareCode));

  useEffect(() => {
    if (total === 0) {
      leave();
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const images: ReceiptImage[] = [];
      const drafts: ParsedPaymentDraft[] = [];

      for (const [index, screenshot] of screenshots.entries()) {
        try {
          const result = await parseReceiptImage(shareCode, screenshot.file, index);
          images.push(result.image);
          drafts.push(...result.drafts);
        } catch {
          // 이 장은 건너뛴다. 아래에서 전체 실패 여부만 따진다.
        }
        setDoneCount(index + 1);
      }

      if (drafts.length === 0) {
        setFailed(true);
        return;
      }

      setParsed(images, drafts);
      if (onScreenRef.current) {
        navigate(parsedResultPath(shareCode), { replace: true });
      }
    })();
  }, [total, screenshots, shareCode, navigate, setParsed, leave]);

  if (failed) {
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

  const current = Math.min(doneCount + 1, total);

  return (
    <MobileFrame>
      <AppBar showBack={false} />
      <ScreenBody>
        <ScreenHeader
          title="결제 내역을 읽고 있어요"
          description={`${total}장 중 ${current}장째 · 잠시만 기다려주세요`}
        />
        <div className={styles.content}>
          <ProgressBar value={total === 0 ? 0 : doneCount / total} label="분석 진행률" />
          <SkeletonRows count={3} />
        </div>
      </ScreenBody>
    </MobileFrame>
  );
}
