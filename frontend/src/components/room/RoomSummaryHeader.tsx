import { AvatarStack } from '../common/AvatarStack';
import styles from './RoomSummaryHeader.module.css';

interface RoomSummaryHeaderProps {
  title: string;
  nicknames: string[];
}

/**
 * B-01 상단의 방 이름 + 참여자 아바타.
 *
 * 서버가 닉네임 선점 상태를 갖지 않으므로 "n명"은 방에 등록된 인원 수다.
 */
export function RoomSummaryHeader({ title, nicknames }: RoomSummaryHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.meta}>
        <AvatarStack nicknames={nicknames} />
        <span className={styles.memberCount}>{nicknames.length}명 참여 중</span>
      </div>
    </div>
  );
}
