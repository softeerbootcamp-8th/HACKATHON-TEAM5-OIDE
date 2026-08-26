/**
 * 숫자 뒤에 붙는 조사 고르기.
 *
 * `200이 모자라요`, `1은 결제하신 분이` 처럼 금액 뒤에 조사가 온다.
 * 숫자를 한글로 읽었을 때 받침이 있는지로 정한다.
 */

/** 한 자리 숫자를 한글로 읽었을 때 받침이 있는지. 영·일·삼·육·칠·팔 은 받침이 있다. */
const HAS_FINAL_CONSONANT: Record<string, boolean> = {
  '0': true,
  '1': true,
  '2': false,
  '3': true,
  '4': false,
  '5': false,
  '6': true,
  '7': true,
  '8': true,
  '9': false,
};

function endsWithConsonant(value: number): boolean {
  const digits = String(Math.abs(Math.trunc(value)));
  const last = digits[digits.length - 1];

  // 10·200·3000 처럼 0 으로 끝나면 십·백·천 으로 읽혀 받침이 있다.
  if (last === '0' && digits.length > 1) return true;

  return HAS_FINAL_CONSONANT[last] ?? true;
}

/** `1은` / `2는` */
export function withEunNeun(value: number): string {
  return `${value.toLocaleString('ko-KR')}${endsWithConsonant(value) ? '은' : '는'}`;
}

/** `200이` / `2가` */
export function withIGa(value: number): string {
  return `${value.toLocaleString('ko-KR')}${endsWithConsonant(value) ? '이' : '가'}`;
}
