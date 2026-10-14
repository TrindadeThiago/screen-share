import { useEffect, useState } from 'react';

/**
 * Push-to-talk: o microfone fica desligado e só liga enquanto a tecla está pressionada.
 * Funciona com o app em foco (captura global de teclas fica fora do MVP).
 */
export const DEFAULT_PTT_KEY = 'KeyV';

/** Nome curto da tecla para exibir: "KeyV" → "V", "Digit1" → "1". */
export function keyLabel(code: string): string {
  return code.replace(/^(Key|Digit)/, '');
}

export function useMic(
  setMicEnabled: (on: boolean) => unknown,
  key = DEFAULT_PTT_KEY,
  enabled = true,
) {
  const [talking, setTalking] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const typing = (e: KeyboardEvent) =>
      ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
    const down = (e: KeyboardEvent) => {
      if (e.code !== key || e.repeat || typing(e)) return;
      setTalking(true);
      void setMicEnabled(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== key) return;
      setTalking(false);
      void setMicEnabled(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [setMicEnabled, key, enabled]);

  return { talking };
}
