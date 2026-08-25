/**
 * 스크린샷 등록 흐름(C-02 → C-04 → C-05/C-07 → C-06)의 상태.
 *
 * File 객체는 직렬화할 수 없어 sessionStorage 에 담지 못한다.
 * 따라서 이 상태는 메모리에만 있고, 새로고침하면 비어 있다.
 * 각 화면은 상태가 비면 등록 방식 선택(C-01)으로 되돌린다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ParsedPaymentDraft, ReceiptImage } from '../types/payment';

/** 사용자가 고른 스크린샷 1장. */
export interface SelectedScreenshot {
  /** 화면 갱신용 로컬 키. */
  key: string;
  file: File;
  /** 미리보기 URL. 해제 책임은 이 훅에 있다. */
  previewUrl: string;
}

interface ExpenseDraftContextValue {
  screenshots: SelectedScreenshot[];
  images: ReceiptImage[];
  drafts: ParsedPaymentDraft[];
  addScreenshots: (files: File[]) => void;
  removeScreenshot: (key: string) => void;
  setParsed: (images: ReceiptImage[], drafts: ParsedPaymentDraft[]) => void;
  updateDraft: (draftId: string, patch: Partial<ParsedPaymentDraft>) => void;
  reset: () => void;
}

const ExpenseDraftContext = createContext<ExpenseDraftContextValue | null>(null);

export function ExpenseDraftProvider({ children }: { children: ReactNode }) {
  const [screenshots, setScreenshots] = useState<SelectedScreenshot[]>([]);
  const [images, setImages] = useState<ReceiptImage[]>([]);
  const [drafts, setDrafts] = useState<ParsedPaymentDraft[]>([]);

  const addScreenshots = useCallback((files: File[]) => {
    setScreenshots((current) => [
      ...current,
      ...files.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }, []);

  const removeScreenshot = useCallback((key: string) => {
    setScreenshots((current) => {
      const target = current.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  }, []);

  const setParsed = useCallback(
    (nextImages: ReceiptImage[], nextDrafts: ParsedPaymentDraft[]) => {
      setImages(nextImages);
      setDrafts(nextDrafts);
    },
    [],
  );

  const updateDraft = useCallback((draftId: string, patch: Partial<ParsedPaymentDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)),
    );
  }, []);

  const reset = useCallback(() => {
    setScreenshots((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setImages([]);
    setDrafts([]);
  }, []);

  const value = useMemo(
    () => ({
      screenshots,
      images,
      drafts,
      addScreenshots,
      removeScreenshot,
      setParsed,
      updateDraft,
      reset,
    }),
    [screenshots, images, drafts, addScreenshots, removeScreenshot, setParsed, updateDraft, reset],
  );

  return <ExpenseDraftContext.Provider value={value}>{children}</ExpenseDraftContext.Provider>;
}

export function useExpenseDraft(): ExpenseDraftContextValue {
  const context = useContext(ExpenseDraftContext);
  if (!context) {
    throw new Error('useExpenseDraft 는 ExpenseDraftProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}

/** 금액·통화가 모두 있어야 등록할 수 있다 (FR-02). */
export function isDraftComplete(draft: ParsedPaymentDraft): boolean {
  return draft.amount !== null && draft.currency !== null;
}
