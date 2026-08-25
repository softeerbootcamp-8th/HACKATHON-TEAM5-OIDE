/**
 * 이미 소비된 화면에서 빠져나간다.
 *
 * 고른 스크린샷이나 파싱 초안은 메모리에만 있어서, 등록을 마치거나 새로고침하면
 * 사라진다. 그 상태로 남은 화면(C-02·C-04·C-05)은 그릴 것이 없다.
 *
 * 이때 앞쪽 화면으로 되돌리면, 뒤로가기로 들어온 사용자는 같은 화면을 반복해서
 * 보게 되고 뒤로가기가 먹지 않는 것처럼 느낀다. 그래서 앱 안에서 왔다면 계속
 * 뒤로 보내고, 링크로 바로 열어 되돌아갈 기록이 없을 때만 지정된 화면으로 옮긴다.
 */

import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useLeaveConsumedScreen(fallbackPath: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  // 앱 안에서 이동해 온 항목만 key 를 갖는다. 직접 열었으면 'default' 다.
  const hasAppHistory = location.key !== 'default';

  // 되감기는 비동기라 화면이 바로 바뀌지 않는다. 그 사이에 다시 호출되면
  // 필요한 것보다 여러 칸 뒤로 가버리므로 화면당 한 번만 실행한다.
  const leftRef = useRef(false);

  return useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;

    if (hasAppHistory) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath, { replace: true });
  }, [hasAppHistory, navigate, fallbackPath]);
}
