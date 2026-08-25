/**
 * 결제 1건을 참여자별로 나누는 계산. (FR-03)
 *
 * N빵은 나누어떨어지지 않을 수 있다. 남는 금액은 **그 항목의 결제자**가 부담한다.
 * 결제자가 그룹에 없으면 방 참여 순서상 첫 참여자가 대신 부담한다.
 * 재계산해도 결과가 같고, 화면에 근거를 한 줄로 적을 수 있어서다.
 */

export interface EqualSplitMember {
  memberId: string;
  nickname: string;
}

export interface EqualSplitShare {
  memberId: string;
  nickname: string;
  /** 이 사람이 부담할 금액. */
  amount: number;
  /** 나머지를 떠안았으면 그 금액. 아니면 0. */
  extra: number;
}

export interface EqualSplitResult {
  /** 나누어떨어지는 몫. */
  quotient: number;
  /** 남는 금액. 0 이면 딱 나누어떨어진 것이다. */
  remainder: number;
  /** 나머지를 부담하는 사람. 그룹이 비어 있으면 null. */
  payer: EqualSplitMember | null;
  shares: EqualSplitShare[];
}

/**
 * @param amount 결제 금액 (결제 통화 기준 정수)
 * @param members 이 그룹이 부담할 참여자들
 * @param payerMemberId 그 결제의 실제 결제자
 */
export function calculateEqualSplit(
  amount: number,
  members: EqualSplitMember[],
  payerMemberId: string,
): EqualSplitResult {
  if (members.length === 0) {
    return { quotient: 0, remainder: 0, payer: null, shares: [] };
  }

  const quotient = Math.floor(amount / members.length);
  const remainder = amount - quotient * members.length;

  // 결제자가 이 그룹에 없으면 첫 참여자가 나머지를 부담한다.
  const payer = members.find((member) => member.memberId === payerMemberId) ?? members[0];

  const shares = members.map((member) => {
    const isPayer = member.memberId === payer.memberId;
    return {
      memberId: member.memberId,
      nickname: member.nickname,
      amount: isPayer ? quotient + remainder : quotient,
      extra: isPayer ? remainder : 0,
    };
  });

  return { quotient, remainder, payer, shares };
}

/** 직접 입력한 금액들의 합이 결제 금액과 같은지. */
export function isCustomSplitBalanced(
  amount: number,
  shares: Record<string, string>,
): boolean {
  return sumShares(shares) === amount;
}

export function sumShares(shares: Record<string, string>): number {
  return Object.values(shares).reduce((sum, value) => sum + (Number(value) || 0), 0);
}
