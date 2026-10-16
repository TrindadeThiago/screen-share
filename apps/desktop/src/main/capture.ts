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

/** Pequena, mas não vazia: escalada para 16:9 ainda não pode virar 0 em nenhum lado. */
export const LINUX_THUMBNAIL = { width: 160, height: 90 } as const;

const kindOf =(id: string): 'screen' | 'window' =>
  id.startsWith('screen:') ? 'screen' : 'window';

export function createCapture(
  desktopCapturer: CapturerLike,
  platform: string = process.platform,
  log: (message: string) => void = () => {},
) {
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
      // Linux (Wayland): o app não lista telas; quem pergunta é o sistema (portal), na hora de
      // capturar. Também não há loopback: o áudio do sistema vai por outra faixa (renderer).
      if (platform === 'linux') {
        // Miniatura 0x0 derruba o Electron < 36 com PipeWire (electron/electron#47591).
        desktopCapturer
          .getSources({ types: ['screen', 'window'], thumbnailSize: LINUX_THUMBNAIL })
          .then((sources) => {
            log(`captura linux: ${sources.length} fonte(s) ${sources.map((s) => s.id).join(', ')}`);
            callback(sources[0] ? { video: sources[0] } : {});
          })
          .catch((e) => {
            log(`captura linux: falhou (${String(e)})`);
            callback({});
          });
        return;
      }
      if (!selected) return callback({});
      // Tela inteira: vídeo + áudio do sistema (loopback). Janela: só vídeo.
      if (kindOf(selected.id) === 'screen') callback({ video: selected, audio: 'loopback' });
      else callback({ video: selected });
    },
  };
}
