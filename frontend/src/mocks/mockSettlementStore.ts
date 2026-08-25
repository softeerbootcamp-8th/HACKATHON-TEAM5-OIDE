/**
 * 목 모드의 정산 상태 저장소.
 *
 * 참여자가 각자 자기 정산을 확정하고, 전원이 끝나야 최종 정산을 볼 수 있다.
 * 직접 입력한 환율은 방 전원에게 적용된다.
 */

const DONE_KEY = 'oide:mock:settlementDone';
const RATE_KEY = 'oide:mock:manualRate';

interface ManualRate {
  currency: string;
  rateToKrw: string;
  /** 누가 바꿨는지. 화면에 함께 표시한다. */
  editedByNickname: string;
}

function readDone(): Record<string, string[]> {
  try {
    const raw = window.sessionStorage.getItem(DONE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function writeDone(value: Record<string, string[]>): void {
  try {
    window.sessionStorage.setItem(DONE_KEY, JSON.stringify(value));
  } catch {
    // 저장 실패는 이번 세션 동작에 영향이 없다.
  }
}

export const mockSettlementStore = {
  /** 자기 정산을 끝낸 참여자들. */
  findDoneMemberIds(roomId: string): string[] {
    return readDone()[roomId] ?? [];
  },

  markDone(roomId: string, memberId: string): string[] {
    const all = readDone();
    const current = all[roomId] ?? [];
    if (!current.includes(memberId)) current.push(memberId);
    all[roomId] = current;
    writeDone(all);
    return current;
  },

  findManualRate(roomId: string): ManualRate | null {
    try {
      const raw = window.sessionStorage.getItem(`${RATE_KEY}:${roomId}`);
      return raw ? (JSON.parse(raw) as ManualRate) : null;
    } catch {
      return null;
    }
  },

  setManualRate(roomId: string, rate: ManualRate | null): void {
    try {
      const key = `${RATE_KEY}:${roomId}`;
      if (rate) window.sessionStorage.setItem(key, JSON.stringify(rate));
      else window.sessionStorage.removeItem(key);
    } catch {
      // 무시한다.
    }
  },
};

