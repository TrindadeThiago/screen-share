import { useEffect, useState } from 'react';
import { AppWindow, Monitor, Volume2, VolumeX } from 'lucide-react';
import type { CaptureSource } from '../../shared';
import { Dialog } from './ui';

type Kind = CaptureSource['kind'];

const TABS: { kind: Kind; label: string; icon: typeof Monitor }[] = [
  { kind: 'screen', label: 'Telas', icon: Monitor },
  { kind: 'window', label: 'Janelas', icon: AppWindow },
];

export function SourcePicker({
  onSelect,
  onCancel,
}: {
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const [sources, setSources] = useState<CaptureSource[] | null>(null);
  const [chosen, setChosen] = useState<Kind | null>(null);

  useEffect(() => {
    window.screenShare.listSources().then(setSources, () => setSources([]));
  }, []);

  // Abre na aba de telas; se não houver nenhuma, na de janelas.
  const tab: Kind =
    chosen ?? (sources?.some((s) => s.kind === 'screen') === false ? 'window' : 'screen');
  const shown = sources?.filter((s) => s.kind === tab) ?? [];

  return (
    <Dialog title="O que você quer compartilhar?" onClose={onCancel} wide>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          {TABS.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              aria-pressed={tab === kind}
              onClick={() => setChosen(kind)}
              className={
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
                (tab === kind ? 'bg-accent text-white' : 'bg-raised text-soft hover:bg-hover')
              }
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-faint">
            {tab === 'screen' ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {tab === 'screen'
              ? 'Tela inteira envia a imagem e o áudio do computador.'
              : 'Janela envia só a imagem, sem áudio.'}
          </span>
        </div>

        {sources === null && <p className="py-8 text-center text-soft">Carregando…</p>}
        {sources !== null && shown.length === 0 && (
          <p className="py-8 text-center text-soft">Nada para mostrar aqui.</p>
        )}

        <ul className="grid grid-cols-3 gap-3">
          {shown.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-label={`${s.name} (${s.kind === 'screen' ? 'tela inteira' : 'janela, sem áudio'})`}
                className="group flex w-full flex-col gap-2 rounded-lg border border-line bg-raised p-2 text-left transition-colors hover:border-accent"
              >
                <img
                  src={s.thumbnailDataUrl}
                  alt=""
                  className="aspect-video w-full rounded bg-stage object-contain"
                />
                <span className="truncate text-sm">{s.name}</span>
                <small className="text-xs text-faint">
                  {s.kind === 'screen' ? 'Tela inteira · com áudio' : 'Janela · sem áudio'}
                </small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
