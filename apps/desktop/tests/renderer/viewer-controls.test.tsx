import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Viewer } from '../../src/renderer/components/Viewer';
import { fakeTrack } from './fakeLivekit';

const setup = () => {
  const a = fakeTrack('screen_share_audio');
  render(<Viewer state="live" videoTrack={fakeTrack('screen_share')} audioTrack={a} />);
  return screen.getByTestId('audio') as HTMLAudioElement;
};

describe('controles do espectador', () => {
  it('volume altera o elemento de áudio local', () => {
    const audio = setup();
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '0.3' } });
    expect(audio.volume).toBeCloseTo(0.3);
  });
  it('silenciar e reativar', async () => {
    const audio = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Silenciar' }));
    expect(audio.muted).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Ativar som' }));
    expect(audio.muted).toBe(false);
  });
  it('tela cheia chama requestFullscreen', async () => {
    const fn = vi.fn();
    HTMLElement.prototype.requestFullscreen = fn;
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Tela cheia' }));
    expect(fn).toHaveBeenCalled();
  });
});
