import { useEffect, useState } from 'react';
import type { CaptureSource } from '../../shared';

export function SourcePicker({
  onSelect,
  onCancel,
}: {
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const [sources, setSources] = useState<CaptureSource[] | null>(null);

  useEffect(() => {
    window.screenShare.listSources().then(setSources, () => setSources([]));
  }, []);

  return (
    <div role="dialog" aria-label="Escolher o que compartilhar">
      <h3>O que você quer compartilhar?</h3>
      <p>
        Telas inteiras enviam imagem e o áudio do computador. Janelas enviam só a imagem, sem áudio.
      </p>
      {sources === null && <p>Carregando…</p>}
      <ul>
        {sources?.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-label={`${s.name} (${s.kind === 'screen' ? 'tela inteira' : 'janela, sem áudio'})`}
            >
              <img src={s.thumbnailDataUrl} alt="" width={160} />
              <span>{s.name}</span>
              <small>
                {s.kind === 'screen' ? 'Tela inteira · com áudio' : 'Janela · sem áudio'}
              </small>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onCancel}>
        Cancelar
      </button>
    </div>
  );
}
