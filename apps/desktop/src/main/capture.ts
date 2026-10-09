import type { CaptureSource } from '../shared';

interface RawSource {
  id: string;
  name: string;
  thumbnail: { toDataURL(): string };
}
export interface CapturerLike {
  getSources(opts: {
    types: string[];
    thumbnailSize: { width: number; height: number };
  }): Promise<RawSource[]>;
}
export type DisplayMediaCallback = (streams: { video?: unknown; audio?: 'loopback' }) => void;

const kindOf = (id: string): 'screen' | 'window' =>
  id.startsWith('screen:') ? 'screen' : 'window';

export function createCapture(desktopCapturer: CapturerLike) {
  const known = new Map<string, RawSource>();
  let selected: RawSource | null = null;

  return {
    async listSources(): Promise<CaptureSource[]> {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
      });
      known.clear();
      for (const s of sources) known.set(s.id, s);
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnailDataUrl: s.thumbnail.toDataURL(),
        kind: kindOf(s.id),
      }));
    },
    selectSource(id: string): void {
      const s = known.get(id);
      if (!s) throw new Error('Fonte de captura inválida');
      selected = s;
    },
    /** Handler para session.setDisplayMediaRequestHandler. */
    displayMediaHandler(_request: unknown, callback: DisplayMediaCallback): void {
      if (!selected) return callback({});
      // Tela inteira: vídeo + áudio do sistema (loopback). Janela: só vídeo.
      if (kindOf(selected.id) === 'screen') callback({ video: selected, audio: 'loopback' });
      else callback({ video: selected });
    },
  };
}
