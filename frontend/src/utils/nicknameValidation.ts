/**
 * 닉네임 검증. (FR-01)
 *
 * - 1~10자
 * - 한글, 영문, 숫자, 공백 사용 가능
 * - 앞뒤 공백은 자동 제거
 * - 공백만 입력 불가
 * - 같은 방에서 중복 불가
 *
 * 원인별로 다른 문구를 돌려준다. 하나로 뭉뚱그리지 않는다.
 */

import { NICKNAME_MAX_LENGTH } from '../constants/roomRules';

export type NicknameErrorReason =
  /** 공백만 입력했다. */
  | 'BLANK'
  /** 최대 길이를 넘었다. */
  | 'TOO_LONG'
  /** 허용되지 않는 문자가 섞였다. */
  | 'INVALID_CHARACTER'
  /** 같은 방에 이미 있는 닉네임이다. */
  | 'DUPLICATE';

export interface NicknameValidationResult {
  valid: boolean;
  reason?: NicknameErrorReason;
  message?: string;
}

const VALID_NICKNAME_PATTERN = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ]+$/;

const ERROR_MESSAGES: Record<NicknameErrorReason, string> = {
  BLANK: '공백만으로는 닉네임을 만들 수 없어요',
  TOO_LONG: `${NICKNAME_MAX_LENGTH}자까지 쓸 수 있어요`,
  INVALID_CHARACTER: '한글, 영문, 숫자만 쓸 수 있어요',
  DUPLICATE: '이미 사용 중인 닉네임이에요',
};

/** 앞뒤 공백을 제거한다. 저장·비교는 항상 이 값을 기준으로 한다. */
export function normalizeNickname(value: string): string {
  return value.trim();
}

/**
 * 닉네임 하나를 검증한다.
 * @param value 사용자가 입력한 원본 문자열
 * @param otherNicknames 같은 방의 다른 닉네임들 (정규화 전 값도 허용)
 */
export function validateNickname(
  value: string,
  otherNicknames: string[] = [],
): NicknameValidationResult {
  const normalized = normalizeNickname(value);

  if (normalized.length === 0) {
    // 아직 아무것도 입력하지 않은 칸은 에러로 취급하지 않는다.
    return value.length === 0 ? { valid: false } : fail('BLANK');
  }

  if (normalized.length > NICKNAME_MAX_LENGTH) {
    return fail('TOO_LONG');
  }

  if (!VALID_NICKNAME_PATTERN.test(normalized)) {
    return fail('INVALID_CHARACTER');
  }

  const isDuplicate = otherNicknames
    .map(normalizeNickname)
    .some((other) => other.length > 0 && other === normalized);

  if (isDuplicate) {
    return fail('DUPLICATE');
  }

  return { valid: true };
}

/** 닉네임 목록 전체가 방을 만들 수 있는 상태인지 검사한다. */
export function validateNicknameList(values: string[]): NicknameValidationResult[] {
  return values.map((value, index) => {
    const others = values.filter((_, otherIndex) => otherIndex !== index);
    return validateNickname(value, others);
  });
}

function fail(reason: NicknameErrorReason): NicknameValidationResult {
  return { valid: false, reason, message: ERROR_MESSAGES[reason] };
}
