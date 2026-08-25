import styles from './ScreenshotThumbnail.module.css';

interface ScreenshotThumbnailProps {
  url: string;
  index: number;
  onRemove: () => void;
}

/** 업로드 확인 화면의 썸네일. 우상단 X 로 뺄 수 있다. */
export function ScreenshotThumbnail({ url, index, onRemove }: ScreenshotThumbnailProps) {
  return (
    <div className={styles.tile}>
      <img className={styles.image} src={url} alt={`스크린샷 ${index + 1}`} />
      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        aria-label={`스크린샷 ${index + 1} 빼기`}
      >
        ✕
      </button>
    </div>
  );
}

interface AddScreenshotTileProps {
  onClick: () => void;
  disabled?: boolean;
}

/** 썸네일 그리드 끝의 `+` 타일. */
export function AddScreenshotTile({ onClick, disabled = false }: AddScreenshotTileProps) {
  return (
    <button
      type="button"
      className={styles.addTile}
      onClick={onClick}
      disabled={disabled}
      aria-label="스크린샷 더 고르기"
    >
      +
    </button>
  );
}
