/**
 * 결제 내역 · 분담 그룹 도메인 타입.
 *
 * flow #2(결제 내역 등록)·#3(그룹 분담) 에서 사용된다.
 * 이번 범위(flow #1)에서는 B-01 정산방의 "내역 있음" 판정에만 쓰이므로
 * 서비스 계층은 아직 만들지 않고 타입만 확정해둔다.
 */

import type { CurrencyCode, IsoDateTime } from './room';

/** SPLIT_GROUP.type */
export type SplitGroupType =
  /** 방 전체 인원. 방마다 하나씩 기본 존재하며 삭제할 수 없다. */
  | 'ALL'
  /** 사용자가 만든 참여자 조합. */
  | 'CUSTOM';

/** PAYMENT.split_method */
export type SplitMethod =
  /** N빵. 나누어떨어지지 않는 나머지는 결제자가 부담한다. */
  | 'EQUAL'
  /** 참여자별 금액 직접 입력. 합계가 결제 금액과 같아야 한다. */
  | 'CUSTOM';

/** SPLIT_GROUP */
export interface SplitGroup {
  id: string;
  roomId: string;
  /** 참여자 닉네임을 나열한 이름 (예: "민서·하늘"). ALL 그룹은 "전체". */
  name: string;
  type: SplitGroupType;
  creatorMemberId: string | null;
  memberIds: string[];
  paymentCount?: number;
  createdAt?: IsoDateTime;
  updatedAt?: IsoDateTime;
}

/** PAYMENT */
export interface Payment {
  id: string;
  roomId: string;
  /**
   * 실제로 돈을 낸 사람.
   * 결제자 변경 UI 가 없으므로 항상 내역을 등록한 본인이다.
   */
  payerMemberId: string;
  /** 아직 어떤 그룹에도 담기지 않았으면 null. 정산 시 ALL 그룹으로 자동 귀속된다. */
  splitGroupId: string | null;
  /** 결제처. 스크린샷에서 못 읽었으면 null. */
  merchant: string | null;
  /** 결제 시각. 스크린샷에서 못 읽었으면 null. */
  paidAt: IsoDateTime | null;
  /** 결제 통화 기준 금액. 소수점이 있는 통화가 있어 문자열로 다룬다. */
  amount: string;
  currency: CurrencyCode;
  /** 분담 방식이 아직 정해지지 않았으면 null. */
  splitMethod: SplitMethod | null;
  /**
   * 정산에 포함할지 여부. 등록 직후에는 false 이고 B-02 에서 골라 켠다 (FR-02).
   * ERD 에 없는 필드 — docs/api-contract.md 의 보완 제안 참고.
   */
  includedInSettlement: boolean;
  /** 어떤 스크린샷에서 나왔는지. 직접 입력한 내역은 null. */
  receiptImageId: string | null;
  createdAt?: IsoDateTime;
  updatedAt?: IsoDateTime;
}

/** 업로드된 결제 스크린샷 1장. */
export interface ReceiptImage {
  id: string;
  /** 원본 이미지 주소. C-05 썸네일과 C-06 미리보기에 쓴다. */
  url: string;
  /** 화면에 순번을 붙이기 위한 값 (`스크린샷 1`). */
  displayOrder: number;
}

/**
 * 스크린샷에서 읽어낸 결제 내역 초안.
 *
 * 아직 PAYMENT 가 아니다. 사용자가 확인·수정한 뒤에야 등록된다.
 * 읽지 못한 필드는 null 이고, 금액·통화가 null 이면 등록할 수 없다.
 */
export interface ParsedPaymentDraft {
  /** 초안 식별자. 서버가 내려주고 등록 전까지만 유효하다. */
  id: string;
  receiptImageId: string;
  merchant: string | null;
  paidAt: IsoDateTime | null;
  amount: string | null;
  currency: CurrencyCode | null;
  /** 서버가 기본 통화로 보정했을 때 수정 화면의 초기 선택값. */
  suggestedCurrency?: CurrencyCode | null;
}

/** 결제 내역 등록 입력. 파싱 결과 확정과 직접 입력이 함께 쓴다. */
export interface CreatePaymentInput {
  merchant: string | null;
  paidAt: IsoDateTime | null;
  /** 필수. 결제 통화 기준 금액. */
  amount: string;
  /** 필수. */
  currency: CurrencyCode;
  receiptImageId: string | null;
  /**
   * 정산에 포함할지 여부. 생략하면 false 다.
   * 분담 화면에서 `빠뜨린 항목 추가하기` 로 넣은 건은 곧바로 정산 대상이라 true 로 보낸다.
   */
  includedInSettlement?: boolean;
}

/** PAYMENT_SHARE — 결제 1건에 대한 참여자별 부담액. */
export interface PaymentShare {
  id: string;
  paymentId: string;
  memberId: string;
  /** 결제 통화 기준 부담 금액. */
  shareAmount: string;
}

/** B-01 에서 쓰는 참여자별 등록 요약. */
export interface MemberPaymentSummary {
  memberId: string;
  nickname: string;
  /** 이 참여자가 결제자로 등록한 내역 건수. */
  paymentCount: number;
}
