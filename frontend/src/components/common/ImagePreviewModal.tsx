import { useEffect } from 'react';
import styles from './ImagePreviewModal.module.css';

interface ImagePreviewModalProps {
  url: string;
  alt: string;
  onClose: () => void;
}

/** 스크린샷 원본을 크게 보는 모달. 배경이나 X 를 누르면 닫힌다. */
export function ImagePreviewModal({ url, alt, onClose }: ImagePreviewModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <img className={styles.image} src={url} alt={alt} />
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
    </div>
  );
}
