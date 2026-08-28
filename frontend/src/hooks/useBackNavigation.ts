import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useBackNavigation(fallbackPath?: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const historyIndex = window.history.state?.idx;
  const hasHistory =
    typeof historyIndex === 'number' ? historyIndex > 0 : location.key !== 'default';

  const goBack = useCallback(
    (steps = 1) => {
      const hasEnoughHistory =
        hasHistory && (typeof historyIndex !== 'number' || historyIndex >= steps);

      if (hasEnoughHistory) {
        navigate(-steps);
        return;
      }
      if (fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
    },
    [fallbackPath, hasHistory, historyIndex, navigate],
  );

  return {
    canGoBack: hasHistory || Boolean(fallbackPath),
    goBack,
  };
}
