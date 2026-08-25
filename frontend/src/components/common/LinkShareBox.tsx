import { useState } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import styles from './LinkShareBox.module.css';

interface LinkShareBoxProps {
  /** 화면에 보여줄 축약 URL. */
  displayUrl: string;
  /** 실제 복사될 전체 URL. */
  copyUrl: string;
}

/** 공유 링크 표시 + 복사 버튼. 복사 결과를 버튼 문구로 알린다. */
export function LinkShareBox({ displayUrl, copyUrl }: LinkShareBoxProps) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleCopy = async () => {
    const succeeded = await copyToClipboard(copyUrl);
    setFeedback(succeeded ? 'copied' : 'failed');
    window.setTimeout(() => setFeedback('idle'), 2000);
  };

  const label =
    feedback === 'copied' ? '복사됨' : feedback === 'failed' ? '실패' : '복사';

  return (
    <div className={styles.box}>
      <span className={styles.url}>{displayUrl}</span>
      <button type="button" className={styles.copyButton} onClick={handleCopy}>
        {label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {feedback === 'copied'
          ? '링크를 복사했어요'
          : feedback === 'failed'
            ? '복사하지 못했어요'
            : ''}
      </span>
    </div>
  );
}
