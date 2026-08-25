import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AmountCurrencyInput } from '../components/common/AmountCurrencyInput';
import { Button } from '../components/common/Button';
import { FieldLabel } from '../components/common/FieldLabel';
import { ImagePreviewModal } from '../components/common/ImagePreviewModal';
import { TextField } from '../components/common/TextField';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { DEFAULT_CURRENCY } from '../constants/roomRules';
import { parsedResultPath } from '../constants/routes';
import { useExpenseDraft } from '../hooks/useExpenseDraft';
import type { CurrencyCode } from '../types/room';
import { formatDateTimeInput, parseDateTimeInput } from '../utils/formatters';
import styles from './ParsedItemEditPage.module.css';

/**
 * C-06 파싱 항목 수정.
 *
 * 네 필드 모두 수정할 수 있어야 한다 (FR-02). 필수는 금액·통화뿐이고
 * 결제처·결제 시각은 비워둘 수 있다.
 */
export function ParsedItemEditPage() {
  const navigate = useNavigate();
  const { shareCode = '', draftId = '' } = useParams<{ shareCode: string; draftId: string }>();
  const { drafts, images, updateDraft } = useExpenseDraft();

  const draft = drafts.find((item) => item.id === draftId);
  const image = images.find((item) => item.id === draft?.receiptImageId);

  const [merchant, setMerchant] = useState(draft?.merchant ?? '');
  const [paidAtText, setPaidAtText] = useState(
    draft?.paidAt ? formatDateTimeInput(draft.paidAt) : '',
  );
  const [amount, setAmount] = useState(draft?.amount ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(draft?.currency ?? DEFAULT_CURRENCY);
  const [showPreview, setShowPreview] = useState(false);

  // 새로고침 등으로 초안이 사라진 경우. 렌더 도중 navigate 를 부르면 멈추므로
  // 선언형 Navigate 로 되돌린다.
  if (!draft) {
    return <Navigate to={parsedResultPath(shareCode)} replace />;
  }

  const amountValid = amount.trim().length > 0 && Number(amount) > 0;
  const paidAtValid = paidAtText.trim().length === 0 || parseDateTimeInput(paidAtText) !== null;
  const canSave = amountValid && paidAtValid;

  const handleSave = () => {
    updateDraft(draft.id, {
      merchant: merchant.trim() === '' ? null : merchant.trim(),
      paidAt: paidAtText.trim() === '' ? null : parseDateTimeInput(paidAtText),
      amount,
      currency,
    });
    // 수정은 C-05 의 한 상태이므로 기록을 늘리지 않는다.
    navigate(parsedResultPath(shareCode), { replace: true });
  };

  return (
    <MobileFrame>
      <AppBar backTo={parsedResultPath(shareCode)} />
      <ScreenBody>
        <div className={styles.content}>
          {image && (
            <div className={styles.source}>
              <button
                type="button"
                className={styles.thumbButton}
                onClick={() => setShowPreview(true)}
                aria-label="원본 스크린샷 크게 보기"
              >
                <img className={styles.thumbImage} src={image.url} alt="" />
              </button>
              <span className={styles.sourceText}>
                <span className={styles.sourceTitle}>원본 스크린샷</span>
                <span className={styles.sourceHint}>읽은 내용과 다르면 직접 고칠 수 있어요</span>
              </span>
            </div>
          )}

          <div className={styles.field}>
            <FieldLabel text="결제처" />
            <TextField
              value={merchant}
              placeholder="예: 이치란 라멘"
              aria-label="결제처"
              onChange={(event) => setMerchant(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <FieldLabel text="결제 시각" />
            <TextField
              value={paidAtText}
              placeholder="2026-08-21 20:14"
              aria-label="결제 시각"
              errorMessage={paidAtValid ? undefined : '2026-08-21 20:14 형식으로 적어주세요'}
              onChange={(event) => setPaidAtText(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <FieldLabel text="결제 금액과 통화" required />
            <AmountCurrencyInput
              amount={amount}
              currency={currency}
              invalid={amount.length > 0 && !amountValid}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
            />
          </div>
        </div>
      </ScreenBody>

      <BottomActionBar>
        <Button disabled={!canSave} onClick={handleSave}>
          수정 완료
        </Button>
      </BottomActionBar>

      {showPreview && image && (
        <ImagePreviewModal
          url={image.url}
          alt="원본 스크린샷"
          onClose={() => setShowPreview(false)}
        />
      )}
    </MobileFrame>
  );
}
