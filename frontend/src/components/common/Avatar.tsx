import styles from './Avatar.module.css';

interface AvatarProps {
  nickname: string;
  size?: 'sm' | 'md';
  className?: string;
  /** 본인 카드처럼 강조가 필요한 자리. */
  selected?: boolean;
}

/** 닉네임 첫 글자를 쓰는 원형 아바타. 이미지는 쓰지 않는다. */
export function Avatar({ nickname, size = 'md', className = '', selected = false }: AvatarProps) {
  const initial = nickname.trim().charAt(0) || '?';

  return (
    <span
      className={`${styles.avatar} ${styles[size]} ${selected ? styles.selected : ''} ${className}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
