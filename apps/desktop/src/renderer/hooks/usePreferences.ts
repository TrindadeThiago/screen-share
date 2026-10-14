import { useCallback, useEffect, useState } from 'react';
import type { Preferences } from '../../shared';

/** Preferências salvas no app. `update` aplica na tela e grava só o que mudou. */
export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    window.screenShare.getPreferences().then(
      (p) => {
        if (!alive) return;
        setPrefs(p);
        setLoaded(true);
      },
      () => alive && setLoaded(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((change: Preferences) => {
    setPrefs((p) => ({ ...p, ...change }));
    void window.screenShare.setPreferences(change).catch(() => {});
  }, []);

  return { prefs, loaded, update };
}
