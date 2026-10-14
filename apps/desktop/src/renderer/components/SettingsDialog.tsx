import { useEffect, useState, type FormEvent } from 'react';
import { ClipboardCopy, Keyboard } from 'lucide-react';
import { MIC_TOGGLE_LABEL, type Preferences } from '../../shared';
import { PRESET_LABELS, type PresetName } from '../livekit/presets';
import { DEFAULT_PTT_KEY, keyLabel } from '../livekit/useMic';
import { ipcErrorText } from '../ipcError';
import { Button, Dialog, Field, Notice, Section, SelectField, Switch } from './ui';

interface Props {
  onClose: () => void;
  prefs: Preferences;
  update: (change: Preferences) => void;
  serverUrl: string;
  /** Ausente dentro de uma sala: trocar de servidor recarrega o app. */
  onChangeServer?: (url: string) => Promise<void>;
  hasServerKey?: boolean;
  /** Ausente dentro de uma sala, como o servidor. */
  onChangeKey?: (key: string | null) => Promise<void>;
  /** Servidor de mídia em uso no lugar do da API; null usa o da API. */
  mediaUrl?: string | null;
  /** Ausente dentro de uma sala: trocar recarrega o app. */
  onChangeMedia?: (url: string | null) => Promise<void>;
}

const PRESET_HINT: Record<PresetName, string> = {
  motion: 'Prioriza fluidez. Bom para jogos e vídeos.',
  detail: 'Prioriza nitidez. Bom para texto e código.',
};

export function SettingsDialog({
  onClose,
  prefs,
  update,
  serverUrl,
  onChangeServer,
  hasServerKey = false,
  onChangeKey,
  mediaUrl = null,
  onChangeMedia,
}: Props) {
  const [serverInput, setServerInput] = useState(serverUrl);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [mediaInput, setMediaInput] = useState(mediaUrl ?? '');
  const [mediaMsg, setMediaMsg] = useState<string | null>(null);
  const [choosingKey, setChoosingKey] = useState(false);
  const [diagCopied, setDiagCopied] = useState(false);
  const preset = prefs.preset ?? 'motion';
  const pttKey = prefs.pushToTalkKey ?? DEFAULT_PTT_KEY;

  const saveServer = async (e: FormEvent) => {
    e.preventDefault();
    setServerMsg(null);
    try {
      await onChangeServer?.(serverInput);
    } catch (err) {
      setServerMsg(ipcErrorText(err, 'Endereço inválido.'));
    }
  };

  const saveKey = async (key: string | null) => {
    setKeyMsg(null);
    try {
      await onChangeKey?.(key);
      setKeyInput('');
      setKeyMsg(key ? 'Chave salva.' : 'Chave removida.');
    } catch (err) {
      setKeyMsg(ipcErrorText(err, 'Não foi possível salvar a chave.'));
    }
  };

  const saveMedia = async (url: string | null) => {
    setMediaMsg(null);
    try {
      await onChangeMedia?.(url);
    } catch (err) {
      setMediaMsg(ipcErrorText(err, 'Endereço inválido.'));
    }
  };

  // Trocar a tecla de falar: a próxima tecla pressionada vira a nova (Esc cancela).
  useEffect(() => {
    if (!choosingKey) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation(); // Esc aqui cancela a troca, não fecha o diálogo
      setChoosingKey(false);
      if (e.code !== 'Escape') update({ pushToTalkKey: e.code });
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [choosingKey, update]);

  const copyDiagnostics = async () => {
    await navigator.clipboard.writeText(await window.screenShare.readDiagnostics());
    setDiagCopied(true);
  };

  return (
    <Dialog title="Configurações" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <Section title="Transmissão">
          <SelectField
            label="Qualidade"
            value={preset}
            onChange={(e) => update({ preset: e.target.value as PresetName })}
          >
            {(Object.keys(PRESET_LABELS) as PresetName[]).map((k) => (
              <option key={k} value={k}>
                {PRESET_LABELS[k]}
              </option>
            ))}
          </SelectField>
          <p className="-mt-1 text-xs text-faint">{PRESET_HINT[preset]}</p>
          <Switch
            checked={prefs.simulcast ?? true}
            onChange={(v) => update({ simulcast: v })}
            hint="Usa mais processador e upload de quem transmite."
          >
            Enviar também em baixa resolução (para amigos com conexão lenta)
          </Switch>
          <Switch
            checked={prefs.muteVoicesWhileSharing ?? false}
            onChange={(v) => update({ muteVoicesWhileSharing: v })}
            hint="Ao transmitir a tela inteira, o som do PC inclui as vozes dos amigos."
          >
            Silenciar as vozes para mim enquanto transmito (evita o eco)
          </Switch>
        </Section>

        <Section title="Voz">
          <Switch
            checked={prefs.pushToTalk ?? false}
            onChange={(v) => update({ pushToTalk: v })}
            hint="Funciona com o app em foco."
          >
            Segurar {keyLabel(pttKey)} para falar
          </Switch>
          <div className="flex items-center gap-3">
            <Button
              icon={<Keyboard size={16} />}
              onClick={() => setChoosingKey(true)}
              disabled={choosingKey}
            >
              {choosingKey ? 'Pressione uma tecla…' : 'Trocar tecla'}
            </Button>
            <span className="text-xs text-faint">
              {MIC_TOGGLE_LABEL} liga e desliga o microfone de qualquer lugar.
            </span>
          </div>
        </Section>

        <Section title="Servidor">
          <form onSubmit={saveServer} aria-label="Servidor" className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <Field
                label="Endereço do servidor"
                className="flex-1"
                value={serverInput}
                disabled={!onChangeServer}
                onChange={(e) => setServerInput(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={
                  !onChangeServer || !serverInput.trim() || serverInput.trim() === serverUrl
                }
              >
                Salvar servidor
              </Button>
            </div>
            {!onChangeServer && (
              <p className="text-xs text-faint">Saia da sala para trocar de servidor.</p>
            )}
            {serverMsg && <Notice>{serverMsg}</Notice>}
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveKey(keyInput.trim());
            }}
            aria-label="Chave do servidor"
            className="flex flex-col gap-3"
          >
            <div className="flex items-end gap-2">
              <Field
                label="Chave para criar salas"
                type="password"
                className="flex-1"
                value={keyInput}
                placeholder={hasServerKey ? 'Configurada' : 'Nenhuma'}
                disabled={!onChangeKey}
                onChange={(e) => setKeyInput(e.target.value)}
              />
              <Button type="submit" disabled={!onChangeKey || !keyInput.trim()}>
                Salvar chave
              </Button>
              {hasServerKey && onChangeKey && (
                <Button onClick={() => void saveKey(null)}>Remover</Button>
              )}
            </div>
            <p className="text-xs text-faint">Só é necessária para criar salas.</p>
            {keyMsg && <p className="text-xs text-soft">{keyMsg}</p>}
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveMedia(mediaInput.trim());
            }}
            aria-label="Servidor de mídia"
            className="flex flex-col gap-3"
          >
            <div className="flex items-end gap-2">
              <Field
                label="Servidor de mídia (opcional)"
                className="flex-1"
                value={mediaInput}
                placeholder="Automático (informado pelo servidor)"
                disabled={!onChangeMedia}
                onChange={(e) => setMediaInput(e.target.value)}
              />
              <Button
                type="submit"
                disabled={
                  !onChangeMedia || !mediaInput.trim() || mediaInput.trim() === (mediaUrl ?? '')
                }
              >
                Salvar
              </Button>
              {mediaUrl && onChangeMedia && (
                <Button onClick={() => void saveMedia(null)}>Usar automático</Button>
              )}
            </div>
            <p className="text-xs text-faint">
              Para quem hospeda o servidor no próprio PC: use ws://localhost:7880.
            </p>
            {mediaMsg && <Notice>{mediaMsg}</Notice>}
          </form>
        </Section>

        <Section title="Diagnóstico">
          <div className="flex items-center gap-3">
            <Button icon={<ClipboardCopy size={16} />} onClick={() => void copyDiagnostics()}>
              {diagCopied ? 'Diagnóstico copiado!' : 'Copiar diagnóstico'}
            </Button>
            <span className="text-xs text-faint">Cole e envie se algo der errado.</span>
          </div>
        </Section>
      </div>
    </Dialog>
  );
}
