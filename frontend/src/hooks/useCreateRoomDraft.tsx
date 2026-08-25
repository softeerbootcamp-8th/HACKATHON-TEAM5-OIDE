/**
 * 방 생성 위저드(A-02 → A-03 → 방 이름)의 입력을 화면 사이에서 유지한다.
 *
 * 새로고침으로 입력이 날아가지 않도록 sessionStorage 에 함께 보관한다.
 * 방이 만들어지고 나면 clear() 로 비운다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_MEMBER_COUNT } from '../constants/roomRules';

export interface CreateRoomDraft {
  memberCount: number;
  nicknames: string[];
  title: string;
}

const STORAGE_KEY = 'oide:createRoomDraft';

const EMPTY_DRAFT: CreateRoomDraft = {
  memberCount: DEFAULT_MEMBER_COUNT,
  nicknames: Array.from({ length: DEFAULT_MEMBER_COUNT }, () => ''),
  title: '',
};

function readDraft(): CreateRoomDraft {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<CreateRoomDraft>;
    const memberCount = parsed.memberCount ?? EMPTY_DRAFT.memberCount;
    return {
      memberCount,
      nicknames: resizeNicknames(parsed.nicknames ?? [], memberCount),
      title: parsed.title ?? '',
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeDraft(draft: CreateRoomDraft): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // 저장 실패는 무시한다. 상태는 메모리에 남는다.
  }
}

/** 인원 수가 바뀌면 입력 칸 수를 맞추되 이미 입력한 닉네임은 보존한다. */
function resizeNicknames(nicknames: string[], count: number): string[] {
  return Array.from({ length: count }, (_, index) => nicknames[index] ?? '');
}

interface CreateRoomDraftContextValue {
  draft: CreateRoomDraft;
  setMemberCount: (count: number) => void;
  setNickname: (index: number, value: string) => void;
  setTitle: (title: string) => void;
  clear: () => void;
}

const CreateRoomDraftContext = createContext<CreateRoomDraftContextValue | null>(null);

export function CreateRoomDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<CreateRoomDraft>(readDraft);

  const update = useCallback((next: CreateRoomDraft) => {
    setDraft(next);
    writeDraft(next);
  }, []);

  const setMemberCount = useCallback(
    (count: number) => {
      setDraft((current) => {
        const next: CreateRoomDraft = {
          ...current,
          memberCount: count,
          nicknames: resizeNicknames(current.nicknames, count),
        };
        writeDraft(next);
        return next;
      });
    },
    [],
  );

  const setNickname = useCallback((index: number, value: string) => {
    setDraft((current) => {
      const nicknames = [...current.nicknames];
      nicknames[index] = value;
      const next: CreateRoomDraft = { ...current, nicknames };
      writeDraft(next);
      return next;
    });
  }, []);

  const setTitle = useCallback((title: string) => {
    setDraft((current) => {
      const next: CreateRoomDraft = { ...current, title };
      writeDraft(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 무시한다.
    }
    update(EMPTY_DRAFT);
  }, [update]);

  const value = useMemo(
    () => ({ draft, setMemberCount, setNickname, setTitle, clear }),
    [draft, setMemberCount, setNickname, setTitle, clear],
  );

  return (
    <CreateRoomDraftContext.Provider value={value}>
      {children}
    </CreateRoomDraftContext.Provider>
  );
}

export function useCreateRoomDraft(): CreateRoomDraftContextValue {
  const context = useContext(CreateRoomDraftContext);
  if (!context) {
    throw new Error('useCreateRoomDraft 는 CreateRoomDraftProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
