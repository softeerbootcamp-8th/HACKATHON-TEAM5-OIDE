/**
 * 백엔드 Payment 모델에 없는 `정산 포함 여부`를 화면 흐름 동안 보관한다.
 *
 * 체크 결과는 분담 그룹을 정하기 전까지만 필요한 프론트 상태다. 페이지를 이동하거나
 * 새로고침해도 유지하되 다른 탭에는 섞이지 않도록 sessionStorage를 사용한다.
 */

const STORAGE_KEY_PREFIX = 'oide:payment-inclusions:';
const memoryFallback = new Map<string, Set<string>>();

function storageKey(shareCode: string): string {
  return `${STORAGE_KEY_PREFIX}${shareCode}`;
}

export function getIncludedPaymentIds(shareCode: string): Set<string> {
  const cached = memoryFallback.get(shareCode);
  if (cached) return new Set(cached);

  let included = new Set<string>();
  try {
    const raw = window.sessionStorage.getItem(storageKey(shareCode));
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        included = new Set(parsed.filter((id): id is string => typeof id === 'string'));
      }
    }
  } catch {
    // 저장소 접근이 막힌 환경에서는 아래 메모리 상태로 현재 화면 흐름을 유지한다.
  }

  memoryFallback.set(shareCode, included);
  return new Set(included);
}

export function setPaymentIncluded(
  shareCode: string,
  paymentId: string,
  included: boolean,
): void {
  const paymentIds = getIncludedPaymentIds(shareCode);
  if (included) paymentIds.add(paymentId);
  else paymentIds.delete(paymentId);

  memoryFallback.set(shareCode, paymentIds);
  try {
    window.sessionStorage.setItem(storageKey(shareCode), JSON.stringify([...paymentIds]));
  } catch {
    // sessionStorage가 막혀도 메모리 상태는 유지된다.
  }
}
