import styles from './MethodCard.module.css';

interface MethodCardProps {
  /** 카드 위쪽 알약 배지. 예: `뱅킹 캡쳐` */
  badge: string;
  iconSrc: string;
  /** 아이콘 일러스트의 한 변 길이(px). 폰과 펜의 크기가 서로 다르다. */
  iconSize: number;
  /** 줄바꿈이 필요하면 \n 을 넣는다. */
  title: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * C-01 의 등록 방식 카드.
 * 카드를 누르면 선택 표시만 하고, 실제 진행은 하단 `다음` 버튼이 맡는다.
 */
export function MethodCard({
  badge,
  iconSrc,
  iconSize,
  title,
  selected,
  onSelect,
}: MethodCardProps) {
  return (
    <button
      type="button"
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className={styles.badge}>{badge}</span>
      <img
        className={styles.icon}
        src={iconSrc}
        alt=""
        width={iconSize}
        height={iconSize}
        aria-hidden="true"
      />
      <span className={styles.title}>{title}</span>
    </button>
  );
}
