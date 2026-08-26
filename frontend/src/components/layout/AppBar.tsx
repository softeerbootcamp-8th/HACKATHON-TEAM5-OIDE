import { useLocation, useNavigate } from 'react-router-dom';
import styles from './AppBar.module.css';

interface AppBarProps {
  /** false 이면 뒤로가기 없이 높이만 확보한다 (랜딩, 되돌릴 수 없는 화면). */
  showBack?: boolean;
  /**
   * 앱 안에서 이동해 온 기록이 없을 때 갈 곳.
   * 링크로 바로 들어온 경우에 쓰인다. 지정하지 않으면 그 경우 버튼을 숨긴다.
   */
  backTo?: string;
}

/**
 * 서비스 자체 상단 바. OS 상태바는 그리지 않는다.
 *
 * 뒤로가기는 브라우저 히스토리를 실제로 되감는다.
 * 특정 경로로 새로 이동하면 기록이 쌓여서, 안드로이드 하드웨어 뒤로가기나
 * iOS 스와이프를 눌렀을 때 오히려 앞으로 진행하는 것처럼 보인다.
 */
export function AppBar({ showBack = true, backTo }: AppBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // 앱 안에서 이동해 온 항목만 key 를 갖는다. 링크로 바로 열었으면 'default' 다.
  const hasAppHistory = location.key !== 'default';
  const visible = showBack && (hasAppHistory || Boolean(backTo));

  const handleBack = () => {
    if (hasAppHistory) {
      navigate(-1);
      return;
    }
    if (backTo) {
      // 되돌아갈 기록이 없으므로 기록을 늘리지 않고 대체한다.
      navigate(backTo, { replace: true });
    }
  };

  return (
    <header className={styles.bar}>
      {visible && (
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label="뒤로 가기"
        >
          <svg
            className={styles.chevron}
            width="10"
            height="18"
            viewBox="0 0 10 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9 1L1 9L9 17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </header>
  );
}
