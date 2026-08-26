/**
 * 목 모드의 정산 상태 저장소.
 *
 * 직접 입력한 환율은 방 전원에게 적용된다.
 */

const RATE_KEY = 'oide:mock:manualRate';
const COMPLETED_MEMBERS_KEY = 'oide:mock:completedMembers';

interface ManualRate {
  currency: string;
  rateToKrw: string;
}

export const mockSettlementStore = {
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

  findCompletedMemberIds(roomId: string): string[] {
    try {
      const raw = window.sessionStorage.getItem(`${COMPLETED_MEMBERS_KEY}:${roomId}`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  },

  completeMember(roomId: string, memberId: string): void {
    const completedMemberIds = this.findCompletedMemberIds(roomId);
    if (completedMemberIds.includes(memberId)) return;
    window.sessionStorage.setItem(
      `${COMPLETED_MEMBERS_KEY}:${roomId}`,
      JSON.stringify([...completedMemberIds, memberId]),
    );
  },

};
