import { SelectableMemberRow } from '../common/SelectableMemberRow';

interface MemberEntryCardProps {
  nickname: string;
  /** 이 참여자가 등록한 결제 내역 건수. */
  paymentCount: number;
  onViewEntries?: () => void;
}

/**
 * B-01 에서 결제 내역을 등록한 참여자를 보여주는 카드.
 * 내역 조회는 flow #2 영역이라 현재는 진입점만 둔다.
 */
export function MemberEntryCard({
  nickname,
  paymentCount,
  onViewEntries,
}: MemberEntryCardProps) {
  return (
    <SelectableMemberRow
      nickname={nickname}
      trailing={`내역 보기 (${paymentCount})`}
      onSelect={onViewEntries}
    />
  );
}
