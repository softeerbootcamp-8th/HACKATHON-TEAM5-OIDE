import type { SplitGroup } from '../../types/payment';
import type { RoomMember } from '../../types/room';
import { AvatarStack } from '../common/AvatarStack';
import styles from './GroupCard.module.css';

interface GroupCardProps {
  group: SplitGroup;
  members: RoomMember[];
  /** 이 그룹이 낼 항목 수. */
  itemCount: number;
  /** 담긴 항목의 합계. 이미 통화 기호까지 붙인 문자열이며 0건이면 비운다. */
  totalLabel?: string;
  onOpen: () => void;
}

/**
 * D-01 · D-04 의 그룹 카드.
 * 누르면 그 그룹이 낼 항목을 고르는 화면으로 들어간다.
 */
export function GroupCard({
  group,
  members,
  itemCount,
  totalLabel,
  onOpen,
}: GroupCardProps) {
  const nicknames = group.memberIds
    .map((id) => members.find((member) => member.id === id)?.nickname)
    .filter((nickname): nickname is string => Boolean(nickname));

  return (
    <button
      type="button"
      className={styles.card}
      onClick={onOpen}
    >
      <span className={styles.body}>
        <span className={styles.name}>{group.name}</span>
        <AvatarStack nicknames={nicknames} />
      </span>
      <span className={styles.trailing}>
        {itemCount}건{totalLabel ? `, ${totalLabel}` : ''}
        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
      </span>
    </button>
  );
}
