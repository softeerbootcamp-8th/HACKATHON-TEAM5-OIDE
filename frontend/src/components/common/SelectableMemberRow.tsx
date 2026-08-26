import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import styles from './SelectableMemberRow.module.css';

interface SelectableMemberRowProps {
  nickname: string;
  selected?: boolean;
  /** 우측 보조 영역 (예: "내역 보기"). */
  trailing?: ReactNode;
  /** 없으면 버튼이 아닌 표시 전용 행으로 렌더한다. */
  onSelect?: () => void;
}

/**
 * 아바타 + 닉네임으로 구성된 선택 가능한 행.
 * A-05 참여자 목록, A-06 닉네임 선택, B-01 멤버 카드가 공유한다.
 */
export function SelectableMemberRow({
  nickname,
  selected = false,
  trailing,
  onSelect,
}: SelectableMemberRowProps) {
  const className = `${styles.row} ${selected ? styles.selected : ''}`;

  const content = (
    <>
      <Avatar nickname={nickname} selected={selected} />
      <span className={styles.nickname}>{nickname}</span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </>
  );

  if (!onSelect) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onSelect}
      aria-pressed={selected}
    >
      {content}
    </button>
  );
}
