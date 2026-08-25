/**
 * "이 브라우저에서 나는 누구인가" 를 기억한다.
 *
 * 서버는 닉네임 선점 상태를 갖지 않으므로, 신원은 전적으로 이 로컬 값이다.
 * 값이 사라지면 A-06 에서 다시 고르면 된다.
 */

import { useCallback, useState } from 'react';

export interface LocalIdentity {
  memberId: string;
  nickname: string;
}

function storageKey(shareCode: string): string {
  return `oide:identity:${shareCode}`;
}

function read(shareCode: string): LocalIdentity | null {
  try {
    const raw = window.localStorage.getItem(storageKey(shareCode));
    if (!raw) return null;
    return JSON.parse(raw) as LocalIdentity;
  } catch {
    // 프라이빗 모드 · 저장소 차단 시 신원 없음으로 취급한다.
    return null;
  }
}

export function useLocalIdentity(shareCode: string) {
  const [identity, setIdentity] = useState<LocalIdentity | null>(() => read(shareCode));

  const remember = useCallback(
    (next: LocalIdentity) => {
      try {
        window.localStorage.setItem(storageKey(shareCode), JSON.stringify(next));
      } catch {
        // 저장에 실패해도 이번 세션 동안은 상태로 유지된다.
      }
      setIdentity(next);
    },
    [shareCode],
  );

  const forget = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey(shareCode));
    } catch {
      // 무시한다.
    }
    setIdentity(null);
  }, [shareCode]);

  return { identity, remember, forget };
}
