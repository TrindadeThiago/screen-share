import { fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMic } from '../../src/renderer/livekit/useMic';

describe('push-to-talk', () => {
  it('não liga o microfone por padrão', () => {
    const set = vi.fn();
    renderHook(() => useMic(set, 'KeyV'));
    expect(set).not.toHaveBeenCalled();
  });
  it('liga ao pressionar e desliga ao soltar', () => {
    const set = vi.fn();
    const { result } = renderHook(() => useMic(set, 'KeyV'));
    act(() => void fireEvent.keyDown(window, { code: 'KeyV' }));
    expect(set).toHaveBeenLastCalledWith(true);
    expect(result.current.talking).toBe(true);
    act(() => void fireEvent.keyUp(window, { code: 'KeyV' }));
    expect(set).toHaveBeenLastCalledWith(false);
    expect(result.current.talking).toBe(false);
  });
  it('ignora outras teclas, repetição e desabilitado', () => {
    const set = vi.fn();
    renderHook(() => useMic(set, 'KeyV'));
    fireEvent.keyDown(window, { code: 'KeyX' });
    fireEvent.keyDown(window, { code: 'KeyV', repeat: true });
    expect(set).not.toHaveBeenCalled();
    const off = vi.fn();
    renderHook(() => useMic(off, 'KeyV', false));
    fireEvent.keyDown(window, { code: 'KeyV' });
    expect(off).not.toHaveBeenCalled();
  });
});
