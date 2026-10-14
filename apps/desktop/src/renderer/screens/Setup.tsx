import { useState, type FormEvent } from 'react';
import { ArrowRight, MonitorUp } from 'lucide-react';
import { Button, Field, Notice } from '../components/ui';
import { ipcErrorText } from '../ipcError';

interface Props {
  /** Salva a chave (se houver) e o endereço; o app recarrega ao terminar. */
  onSave: (url: string, key: string) => Promise<void>;
}

/** Primeira execução, sem servidor definido: pede o endereço da API e a chave opcional. */
export function Setup({ onSave }: Props) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSave(url, key);
    } catch (err) {
      setError(ipcErrorText(err, 'Endereço inválido.'));
      setBusy(false);
    }
  };

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <MonitorUp size={26} />
        </span>
        <h1 className="text-2xl font-semibold">Configurar servidor</h1>
        <p className="text-sm text-soft">Peça o endereço a quem hospeda o servidor.</p>
      </div>

      <form
        onSubmit={submit}
        aria-label="Configurar servidor"
        className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-line bg-panel p-5"
      >
        <Field
          label="Endereço do servidor"
          value={url}
          placeholder="http://100.x.y.z:3000"
          autoFocus
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <Field
            label="Chave para criar salas (opcional)"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <p className="text-xs text-faint">
            Só para quem cria salas. Para entrar com um código, deixe em branco.
          </p>
        </div>
        {error && <Notice>{error}</Notice>}
        <Button
          type="submit"
          variant="primary"
          icon={<ArrowRight size={16} />}
          disabled={busy || !url.trim()}
        >
          {busy ? 'Conectando…' : 'Continuar'}
        </Button>
      </form>
    </main>
  );
}
