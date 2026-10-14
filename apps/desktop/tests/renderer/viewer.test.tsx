import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Viewer } from '../../src/renderer/components/Viewer';
import { fakeTrack } from './fakeLivekit';

describe('Viewer', () => {
  it('anexa vídeo e áudio quando ao vivo', () => {
    const v = fakeTrack('screen_share');
    const a = fakeTrack('screen_share_audio');
    render(<Viewer state="live" videoTrack={v} audioTrack={a} />);
    expect(v.attach).toHaveBeenCalledWith(screen.getByTestId('video'));
    expect(a.attach).toHaveBeenCalledWith(screen.getByTestId('audio'));
  });
  it('aplica o volume salvo quando ele chega e avisa mudanças', () => {
    const a = fakeTrack('screen_share_audio');
    const v = fakeTrack('screen_share');
    const onVolumeChange = vi.fn();
    const props = { state: 'live' as const, videoTrack: v, audioTrack: a, onVolumeChange };
    const { rerender } = render(<Viewer {...props} />);
    rerender(<Viewer {...props} initialVolume={0.3} />);
    expect((screen.getByTestId('audio') as HTMLAudioElement).volume).toBeCloseTo(0.3);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.6' } });
    expect(onVolumeChange).toHaveBeenCalledWith(0.6);
  });
  it('desanexa ao desmontar', () => {
    const v = fakeTrack('screen_share');
    const { unmount } = render(<Viewer state="live" videoTrack={v} audioTrack={null} />);
    unmount();
    expect(v.detach).toHaveBeenCalled();
  });
  it.each([
    ['none', /Aguardando/],
    ['ended', /terminou/],
    ['interrupted', /interrompida/],
  ] as const)('estado %s mostra mensagem', (state, re) => {
    render(<Viewer state={state} videoTrack={null} audioTrack={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(re);
  });
});
