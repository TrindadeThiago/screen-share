export const MIC_TOGGLE_SHORTCUT = 'CommandOrControl+Shift+M';

interface PowerSaveBlockerLike {
  start(type: 'prevent-display-sleep'): number;
  stop(id: number): void;
}
interface GlobalShortcutLike {
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
}

/**
 * O que só vale enquanto a pessoa está numa sala: impedir a tela de dormir no meio da
 * transmissão e o atalho global que liga/desliga o microfone com o app fora de foco.
 */
export function createPresence(
  power: PowerSaveBlockerLike,
  shortcuts: GlobalShortcutLike,
  onMicToggle: () => void,
) {
  let blocker: number | null = null;
  return {
    setInRoom(inRoom: boolean): void {
      if (inRoom === (blocker !== null)) return;
      if (inRoom) {
        blocker = power.start('prevent-display-sleep');
        shortcuts.register(MIC_TOGGLE_SHORTCUT, onMicToggle);
      } else {
        power.stop(blocker!);
        blocker = null;
        shortcuts.unregister(MIC_TOGGLE_SHORTCUT);
      }
    },
  };
}
