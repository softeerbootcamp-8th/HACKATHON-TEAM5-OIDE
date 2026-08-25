/**
 * 키보드가 화면 아래를 덮은 높이(px).
 *
 * 모바일 브라우저는 키보드가 올라와도 레이아웃 뷰포트를 줄이지 않는다.
 * `100dvh` 도 주소창만 반영할 뿐 키보드는 반영하지 않는다.
 * 그래서 화면 아래에 붙인 바텀시트가 키보드 뒤로 숨어버린다.
 *
 * visualViewport 로 실제로 보이는 높이를 읽어 그만큼 띄운다.
 */

import { useEffect, useState } from 'react';

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(Math.max(0, Math.round(covered)));
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}

