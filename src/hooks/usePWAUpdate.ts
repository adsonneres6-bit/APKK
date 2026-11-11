import { useEffect, useState, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface PWAUpdateState {
  needRefresh: boolean;
  updateSW: (reloadPage?: boolean) => Promise<void>;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSWFn, setUpdateSWFn] = useState<
    (reloadPage?: boolean) => Promise<void>
  >(() => Promise.resolve());

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        // SW cached all assets for offline use — no action needed
      },
    });

    setUpdateSWFn(() => updateSW);
  }, []);

  const updateSW = useCallback(async (reloadPage: boolean = true) => {
    await updateSWFn(reloadPage);
  }, [updateSWFn]);

  return { needRefresh, updateSW };
}
