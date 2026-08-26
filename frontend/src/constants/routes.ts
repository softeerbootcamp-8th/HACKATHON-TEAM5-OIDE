/**
 * 라우트 경로 단일 출처.
 * 경로 문자열을 컴포넌트에 흩뿌리지 않기 위해 여기에서만 정의한다.
 */

export const ROUTES = {
  /** A-01 랜딩 */
  landing: '/',

  /** A-02 인원 수 */
  createMembers: '/create/members',
  /** A-03 닉네임 입력 (A-04 검증 에러 포함) */
  createNicknames: '/create/nicknames',
  /** 방 이름 입력 */
  createName: '/create/name',
  /** A-05 방 생성 완료 · 링크 공유 */
  createDone: '/create/done/:shareCode',

  /** A-06 링크 진입 · 닉네임 선택 (만료 시 A-08) */
  joinRoom: '/r/:shareCode',
  /** B-01 정산방 */
  roomHome: '/r/:shareCode/home',
  /** C-01 등록 방식 선택 */
  expenseMethod: '/r/:shareCode/expenses/new',
  /** C-02 선택한 스크린샷 확인 */
  screenshotUpload: '/r/:shareCode/expenses/upload',
  /** C-04 파싱 중 */
  screenshotParsing: '/r/:shareCode/expenses/parsing',
  /** C-05 · C-07 · C-08 파싱 결과 확인 */
  parsedResult: '/r/:shareCode/expenses/review',
  /** C-06 파싱 항목 수정 */
  parsedItemEdit: '/r/:shareCode/expenses/review/:draftId',
  /** C-09 직접 입력 */
  manualExpense: '/r/:shareCode/expenses/manual',
  /** B-02 내 결제 내역 리스트 */
  myExpenses: '/r/:shareCode/expenses',

  /** D-01 · D-04 그룹 목록 */
  splitGroups: '/r/:shareCode/groups',
  /** D-02 그룹 만들기 · 인원 선택 */
  splitGroupNew: '/r/:shareCode/groups/new',
  /** D-02 그룹 인원 수정 */
  splitGroupEdit: '/r/:shareCode/groups/:groupId/edit',
  /** D-05 · D-06 그룹이 낼 항목 선택 */
  splitGroupItems: '/r/:shareCode/groups/:groupId/items',
  /** D-05 금액 나누기 */
  splitGroupMethod: '/r/:shareCode/groups/:groupId/split',
  /** D-09 · D-10 결제 1건 나누기 */
  paymentSplit: '/r/:shareCode/groups/:groupId/split/:paymentId',
  /** D-12 자동 귀속 확인 */
  splitUnassigned: '/r/:shareCode/groups/confirm',
  /** E-01 정산 실행 확인 */
  settlementStart: '/r/:shareCode/settlement',
  /** E-04 환율 직접 수정 */
  rateEdit: '/r/:shareCode/settlement/rate',
  /** E-05 참여자별 요약 */
  settlementSummary: '/r/:shareCode/settlement/summary',
  /** E-12 내 정산 완료 */
  settlementDone: '/r/:shareCode/settlement/done',
  /** E-06 송금 리스트 */
  transferList: '/r/:shareCode/settlement/transfers',
  /** E-07 내 정산 상세 */
  transferDetail: '/r/:shareCode/settlement/transfers/:index',
} as const;

export function createDonePath(shareCode: string): string {
  return `/create/done/${shareCode}`;
}

export function joinRoomPath(shareCode: string): string {
  return `/r/${shareCode}`;
}

export function roomHomePath(shareCode: string): string {
  return `/r/${shareCode}/home`;
}

export function expenseMethodPath(shareCode: string): string {
  return `/r/${shareCode}/expenses/new`;
}

export function screenshotUploadPath(shareCode: string): string {
  return `/r/${shareCode}/expenses/upload`;
}

export function screenshotParsingPath(shareCode: string): string {
  return `/r/${shareCode}/expenses/parsing`;
}

export function parsedResultPath(shareCode: string): string {
  return `/r/${shareCode}/expenses/review`;
}

export function parsedItemEditPath(shareCode: string, draftId: string): string {
  return `/r/${shareCode}/expenses/review/${draftId}`;
}

export function manualExpensePath(shareCode: string): string {
  return `/r/${shareCode}/expenses/manual`;
}

export function myExpensesPath(shareCode: string): string {
  return `/r/${shareCode}/expenses`;
}

export function splitGroupsPath(shareCode: string): string {
  return `/r/${shareCode}/groups`;
}

export function splitGroupNewPath(shareCode: string): string {
  return `/r/${shareCode}/groups/new`;
}

export function splitGroupEditPath(shareCode: string, groupId: string): string {
  return `/r/${shareCode}/groups/${groupId}/edit`;
}

export function splitGroupItemsPath(shareCode: string, groupId: string): string {
  return `/r/${shareCode}/groups/${groupId}/items`;
}

export function splitGroupMethodPath(shareCode: string, groupId: string): string {
  return `/r/${shareCode}/groups/${groupId}/split`;
}

export function paymentSplitPath(
  shareCode: string,
  groupId: string,
  paymentId: string,
): string {
  return `/r/${shareCode}/groups/${groupId}/split/${paymentId}`;
}

export function splitUnassignedPath(shareCode: string): string {
  return `/r/${shareCode}/groups/confirm`;
}

export function settlementStartPath(shareCode: string): string {
  return `/r/${shareCode}/settlement`;
}

export function rateEditPath(shareCode: string): string {
  return `/r/${shareCode}/settlement/rate`;
}

export function settlementSummaryPath(shareCode: string): string {
  return `/r/${shareCode}/settlement/summary`;
}

/** E-12 에서 다른 참여자의 요약을 볼 때. */
export function memberSummaryPath(shareCode: string, memberId: string): string {
  return `/r/${shareCode}/settlement/summary?member=${encodeURIComponent(memberId)}`;
}

export function settlementDonePath(shareCode: string): string {
  return `/r/${shareCode}/settlement/done`;
}

export function transferListPath(shareCode: string): string {
  return `/r/${shareCode}/settlement/transfers`;
}

export function transferDetailPath(shareCode: string, index: number): string {
  return `/r/${shareCode}/settlement/transfers/${index}`;
}

