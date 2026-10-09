import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
