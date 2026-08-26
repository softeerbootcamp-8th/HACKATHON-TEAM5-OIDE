import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { CurrencySelect } from '../components/common/CurrencySelect';
import { DatePickerSheet } from '../components/common/DatePickerSheet';
import { DateSelectField } from '../components/common/DateSelectField';
import { FieldLabel } from '../components/common/FieldLabel';
import { ImagePreviewModal } from '../components/common/ImagePreviewModal';
import { TextField } from '../components/common/TextField';
import { TimeInput } from '../components/common/TimeInput';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { findCurrency } from '../constants/currencies';
import { DEFAULT_CURRENCY } from '../constants/roomRules';
import { joinRoomPath, parsedResultPath } from '../constants/routes';
import { useExpenseDraft } from '../hooks/useExpenseDraft';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import type { CurrencyCode } from '../types/room';
import { sanitizeAmountInput, splitPaidAtInput, toPaidAtIso } from '../utils/formatters';
import styles from './ParsedItemEditPage.module.css';

/**
 * C-06 파싱 항목 수정.
 *
 * 다섯 필드 모두 수정할 수 있어야 한다 (FR-02). 필수는 금액·통화뿐이고
 * 결제처·결제 날짜·시간은 비워둘 수 있다.
 * 날짜·시간 입력은 C-09 직접 입력과 같은 방식을 쓴다.
 */
export function ParsedItemEditPage() {
  const navigate = useNavigate();
  const { shareCode = '', draftId = '' } = useParams<{ shareCode: string; draftId: string }>();
  const { identity } = useLocalIdentity(shareCode);
  const { drafts, images, updateDraft } = useExpenseDraft();

  const draft = drafts.find((item) => item.id === draftId);
  const image = images.find((item) => item.id === draft?.receiptImageId);
  const initialPaidAt = splitPaidAtInput(draft?.paidAt ?? null);

  const [merchant, setMerchant] = useState(draft?.merchant ?? '');
  const [paidDate, setPaidDate] = useState(initialPaidAt.date);
  const [paidHour, setPaidHour] = useState(initialPaidAt.hour);
  const [paidMinute, setPaidMinute] = useState(initialPaidAt.minute);
  const [amount, setAmount] = useState(draft?.amount ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(
    draft?.currency ?? draft?.suggestedCurrency ?? DEFAULT_CURRENCY,
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!identity) {
    return <Navigate to={joinRoomPath(shareCode)} replace />;
  }
  // 새로고침 등으로 초안이 사라진 경우. 렌더 도중 navigate 를 부르면 멈추므로
  // 선언형 Navigate 로 되돌린다.
  if (!draft) {
    return <Navigate to={parsedResultPath(shareCode)} replace />;
  }

  const amountValid = amount.trim().length > 0 && Number(amount) > 0;
  // 시간만 넣으면 어느 날의 몇 시인지 알 수 없다. 값을 조용히 버리지 않고 막는다.
  const timeNeedsDate = (paidHour !== '' || paidMinute !== '') && paidDate === '';
  const canSave = amountValid && !timeNeedsDate;

  const handleSave = () => {
    updateDraft(draft.id, {
      merchant: merchant.trim() === '' ? null : merchant.trim(),
      paidAt: toPaidAtIso(paidDate, paidHour, paidMinute),
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
                <span className={styles.sourceHint}>{'읽은 내용과 다르면\n직접 고칠 수 있어요'}</span>
              </span>
            </div>
          )}

          <div className={styles.field}>
            <FieldLabel text="결제처" showOptionalHint={false} />
            <TextField
              value={merchant}
              placeholder="예: 이치란 라멘"
              aria-label="결제처"
              onChange={(event) => setMerchant(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <FieldLabel text="결제 날짜" />
            <DateSelectField
              value={paidDate}
              aria-label="결제 날짜"
              onClick={() => setDatePickerOpen(true)}
            />
          </div>

          <div className={styles.field}>
            <FieldLabel text="결제 시간" />
            <TimeInput
              hour={paidHour}
              minute={paidMinute}
              errorMessage={timeNeedsDate ? '결제 날짜를 먼저 골라주세요' : undefined}
              onHourChange={setPaidHour}
              onMinuteChange={setPaidMinute}
            />
          </div>

          <div className={styles.field}>
            <FieldLabel text="결제 금액" required />
            <TextField
              value={amount}
              placeholder="0"
              inputMode="decimal"
              aria-label="결제 금액"
              errorMessage={
                amount.length > 0 && !amountValid ? '0 보다 큰 금액을 적어주세요' : undefined
              }
              onChange={(event) =>
                setAmount(
                  sanitizeAmountInput(event.target.value, findCurrency(currency).fractionDigits),
                )
              }
            />
          </div>

          <div className={styles.field}>
            <FieldLabel text="통화" required />
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
        </div>
      </ScreenBody>

      <BottomActionBar>
        <Button disabled={!canSave} onClick={handleSave}>
          수정 완료
        </Button>
      </BottomActionBar>

      {datePickerOpen && (
        <DatePickerSheet
          value={paidDate}
          onConfirm={(next) => {
            setPaidDate(next);
            setDatePickerOpen(false);
          }}
          onClose={() => setDatePickerOpen(false)}
        />
      )}

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
