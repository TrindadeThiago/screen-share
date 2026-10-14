import { describe, expect, it, vi } from 'vitest';
import { createPresence, MIC_TOGGLE_SHORTCUT } from '../../src/main/presence';

describe('presença em sala', () => {
  it('mantém a tela acordada e registra o atalho só enquanto está na sala', () => {
    const power = { start: vi.fn().mockReturnValue(7), stop: vi.fn() };
    const shortcuts = { register: vi.fn().mockReturnValue(true), unregister: vi.fn() };
    const onToggle = vi.fn();
    const p = createPresence(power, shortcuts, onToggle);
    p.setInRoom(false);
    expect(power.start).not.toHaveBeenCalled();
    p.setInRoom(true);
    p.setInRoom(true);
    expect(power.start).toHaveBeenCalledOnce();
    expect(shortcuts.register).toHaveBeenCalledWith(MIC_TOGGLE_SHORTCUT, onToggle);
    p.setInRoom(false);
    expect(power.stop).toHaveBeenCalledWith(7);
    expect(shortcuts.unregister).toHaveBeenCalledWith(MIC_TOGGLE_SHORTCUT);
  });
});
