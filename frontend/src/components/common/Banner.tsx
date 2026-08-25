import styles from './Banner.module.css';

interface BannerProps {
  message: string;
}

/** 제출 실패처럼 화면 안에서 알려야 하는 메시지. */
export function Banner({ message }: BannerProps) {
  return (
    <p className={styles.banner} role="alert">
      {message}
    </p>
  );
}
