import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Banner } from '../components/common/Banner';
import { Button } from '../components/common/Button';
import { ImagePreviewModal } from '../components/common/ImagePreviewModal';
import { ParsedItemRow } from '../components/expense/ParsedItemRow';
import { AppBar } from '../components/layout/AppBar';
import { BottomActionBar } from '../components/layout/BottomActionBar';
import { MobileFrame } from '../components/layout/MobileFrame';
import { ScreenBody } from '../components/layout/ScreenBody';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import {
  expenseMethodPath,
  myExpensesPath,
  parsedItemEditPath,
} from '../constants/routes';
import { isDraftComplete, useExpenseDraft } from '../hooks/useExpenseDraft';
import { useLeaveConsumedScreen } from '../hooks/useLeaveConsumedScreen';
import { useLocalIdentity } from '../hooks/useLocalIdentity';
import { createPayments } from '../services/paymentService';
import { isApiError } from '../types/api';
import type { ParsedPaymentDraft, ReceiptImage } from '../types/payment';
import styles from './ParsedResultPage.module.css';

/**
 * C-05 파싱 결과 확인. 못 읽은 필드가 있으면 C-07 · C-08 상태가 된다.
 *
 * - 전부 읽혔으면 스크린샷별로 묶어 보여준다
 * - 못 읽은 게 있으면 그 항목만 위로 올리고, 다 채우기 전에는 진행할 수 없다
 */
export function ParsedResultPage() {
  const navigate = useNavigate();
  const { shareCode = '' } = useParams<{ shareCode: string }>();
  const { images, drafts, reset } = useExpenseDraft();
  const { identity } = useLocalIdentity(shareCode);

  const [preview, setPreview] = useState<ReceiptImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** 등록을 마치면 초안을 비우는데, 그것을 "잘못 들어옴" 으로 오해하지 않게 한다. */
  const submittedRef = useRef(false);

  // 초안이 사라졌으면 그릴 것이 없다. 등록을 막 마친 경우는 제외한다.
  const leave = useLeaveConsumedScreen(expenseMethodPath(shareCode));
  useEffect(() => {
    if (drafts.length === 0 && !submittedRef.current) leave();
  }, [drafts.length, leave]);

  const incomplete = useMemo(() => drafts.filter((d) => !isDraftComplete(d)), [drafts]);
  const complete = useMemo(() => drafts.filter(isDraftComplete), [drafts]);

  const byImage = useMemo(() => {
    return images.map((image) => ({
      image,
      items: drafts.filter((draft) => draft.receiptImageId === image.id),
    }));
  }, [images, drafts]);

  if (drafts.length === 0) return null;

  const openEdit = (draft: ParsedPaymentDraft) =>
    navigate(parsedItemEditPath(shareCode, draft.id));

  const handleSubmit = async () => {
    if (!identity) {
      setSubmitError('내 닉네임을 먼저 골라주세요.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      await createPayments(
        shareCode,
        identity.memberId,
        drafts.map((draft) => ({
          merchant: draft.merchant,
          paidAt: draft.paidAt,
          amount: draft.amount!,
          currency: draft.currency!,
          receiptImageId: draft.receiptImageId,
        })),
      );
      submittedRef.current = true;
      reset();
      navigate(myExpensesPath(shareCode), { replace: true });
    } catch (error) {
      setSubmitError(
        isApiError(error) ? error.message : '등록하지 못했어요. 잠시 후 다시 시도해주세요.',
      );
      setSubmitting(false);
    }
  };

  const hasIncomplete = incomplete.length > 0;

  return (
    <MobileFrame>
      <AppBar backTo={expenseMethodPath(shareCode)} />
      <ScreenBody>
        {hasIncomplete ? (
          <ScreenHeader
            title={`${incomplete.length}건은 조금 더 알려주셔야 해요`}
            description="금액과 통화는 꼭 있어야 정산할 수 있어요"
          />
        ) : (
          <ScreenHeader
            title={`${drafts.length}건을 찾았어요`}
            description="잘못 읽은 항목이 있으면 눌러서 고쳐주세요."
          />
        )}

        <div className={styles.content}>
          {hasIncomplete ? (
            <>
              <div className={styles.rows}>
                {incomplete.map((draft) => (
                  <ParsedItemRow key={draft.id} draft={draft} onClick={() => openEdit(draft)} />
                ))}
              </div>
              {complete.length > 0 && (
                <>
                  <p className={styles.restLabel}>나머지는 문제 없어요</p>
                  <div className={styles.rows}>
                    {complete.map((draft) => (
                      <ParsedItemRow
                        key={draft.id}
                        draft={draft}
                        onClick={() => openEdit(draft)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            byImage.map(({ image, items }) => (
              <section key={image.id} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <button
                    type="button"
                    className={styles.thumbButton}
                    onClick={() => setPreview(image)}
                    aria-label={`스크린샷 ${image.displayOrder + 1} 크게 보기`}
                  >
                    <img className={styles.thumbImage} src={image.url} alt="" />
                  </button>
                  <span className={styles.sectionTitle}>
                    스크린샷 {image.displayOrder + 1} · {items.length}건
                  </span>
                </div>
                <div className={styles.rows}>
                  {items.map((draft) => (
                    <ParsedItemRow key={draft.id} draft={draft} onClick={() => openEdit(draft)} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </ScreenBody>

      <BottomActionBar>
        {submitError && <Banner message={submitError} />}
        <Button
          disabled={hasIncomplete}
          loading={submitting}
          loadingLabel="등록하고 있어요…"
          onClick={handleSubmit}
        >
          정산할 항목 선택하기
        </Button>
      </BottomActionBar>

      {preview && (
        <ImagePreviewModal
          url={preview.url}
          alt={`스크린샷 ${preview.displayOrder + 1}`}
          onClose={() => setPreview(null)}
        />
      )}
    </MobileFrame>
  );
}
