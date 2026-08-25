import { Avatar } from './Avatar';
import styles from './AvatarStack.module.css';

interface AvatarStackProps {
  nicknames: string[];
  size?: 'sm' | 'md';
}

/** 참여자 아바타를 겹쳐 배치한다. */
export function AvatarStack({ nicknames, size = 'sm' }: AvatarStackProps) {
  return (
    <span className={styles.stack} aria-label={`참여자 ${nicknames.join(', ')}`}>
      {nicknames.map((nickname, index) => (
        <span key={`${nickname}-${index}`} className={styles.item}>
          <Avatar nickname={nickname} size={size} />
        </span>
      ))}
    </span>
  );
}
