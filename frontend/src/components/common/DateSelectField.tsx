import type { ButtonHTMLAttributes } from 'react';
import styles from './DateSelectField.module.css';

interface DateSelectFieldProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'children'> {
  /** `YYYY-MM-DD`. 비어 있으면 placeholder 를 보여준다. */
  value: string;
  placeholder?: string;
}

/**
 * 눌러서 바텀시트를 여는 날짜 필드.
 *
 * 입력이 아니라 선택이라 input 을 쓰지 않는다. 모바일 키보드가 뜨면 안 되고,
 * 브라우저마다 다른 네이티브 date 위젯 대신 디자인된 시트를 띄워야 하기 때문이다.
 */
export function DateSelectField({
  value,
  placeholder = '클릭해서 선택',
  ...rest
}: DateSelectFieldProps) {
  const isEmpty = value === '';

  return (
    <button
      {...rest}
      type="button"
      className={`${styles.field} ${isEmpty ? styles.placeholder : ''}`}
    >
      {isEmpty ? placeholder : value}
    </button>
  );
}
