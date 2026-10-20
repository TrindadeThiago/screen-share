import { describe, expect, it, vi } from 'vitest';
import { createCapture } from '../../src/main/capture';

const src = (id: string, name: string) => ({
  id,
  name,
  thumbnail: { toDataURL: () => `data:${id}` },
});
const make = (
  platform = 'win32',
  sources = [src('screen:0:0', 'Tela 1'), src('window:42:0', 'Jogo')],
) => createCapture({ getSources: vi.fn().mockResolvedValue(sources) }, platform);

describe('captura', () => {
  it('lista fontes com tipo e miniatura', async () => {
    const list = await make().listSources();
    expect(list).toEqual([
      { id: 'screen:0:0', name: 'Tela 1', thumbnailDataUrl: 'data:screen:0:0', kind: 'screen' },
      { id: 'window:42:0', name: 'Jogo', thumbnailDataUrl: 'data:window:42:0', kind: 'window' },
    ]);
  });
  it('rejeita ids que não vieram de listSources', async () => {
    const c = make();
    await c.listSources();
    expect(() => c.selectSource('screen:99:0')).toThrow();
    expect(() => c.selectSource('../etc/passwd')).toThrow();
  });
  it('tela inteira → vídeo + áudio loopback', async () => {
    const c = make();
    await c.listSources();
    c.selectSource('screen:0:0');
    const cb = vi.fn();
    c.displayMediaHandler({}, cb);
    expect(cb).toHaveBeenCalledWith({
      video: expect.objectContaining({ id: 'screen:0:0' }),
      audio: 'loopback',
    });
  });
  it('janela → só vídeo', async () => {
    const c = make();
    await c.listSources();
    c.selectSource('window:42:0');
    const cb = vi.fn();
    c.displayMediaHandler({}, cb);
    expect(cb).toHaveBeenCalledWith({ video: expect.objectContaining({ id: 'window:42:0' }) });
    expect(cb.mock.calls[0]![0]).not.toHaveProperty('audio');
  });
  it('sem seleção → resposta vazia', () => {
    const cb = vi.fn();
    make().displayMediaHandler({}, cb);
    expect(cb).toHaveBeenCalledWith({});
  });
  it('linux → a fonte escolhida no portal do sistema, sem loopback', async () => {
    const cb = vi.fn();
    make('linux', [src('screen:77:0', 'Tela')]).displayMediaHandler({}, cb);
    await vi.waitFor(() => expect(cb).toHaveBeenCalled());
    expect(cb).toHaveBeenCalledWith({ video: expect.objectContaining({ id: 'screen:77:0' }) });
  });
  it('linux → pede miniatura não vazia (0x0 derruba o Electron com PipeWire)', async () => {
    const getSources = vi.fn().mockResolvedValue([src('screen:77:0', 'Tela')]);
    const cb = vi.fn();
    createCapture({ getSources }, 'linux').displayMediaHandler({}, cb);
    await vi.waitFor(() => expect(cb).toHaveBeenCalled());
    const { width, height } = getSources.mock.calls[0]![0].thumbnailSize;
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });
  it('linux → portal cancelado vira resposta vazia', async () => {
    const cb = vi.fn();
    make('linux', []).displayMediaHandler({}, cb);
    await vi.waitFor(() => expect(cb).toHaveBeenCalledWith({}));
  });
});
