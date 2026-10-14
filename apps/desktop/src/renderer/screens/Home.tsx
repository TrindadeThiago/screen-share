import { useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, KeyRound, LogIn, MonitorUp, Plus, Settings } from 'lucide-react';
import { ApiError, type ApiClient, type JoinResult } from '../api/client';
import { SettingsDialog } from '../components/SettingsDialog';
import { Button, Field, IconButton, Notice } from '../components/ui';
import { usePreferences } from '../hooks/usePreferences';
import { ipcErrorText } from '../ipcError';

interface Props {
  onJoined: (join: JoinResult, displayName: string, password?: string) => void;
  api: ApiClient;
  serverUrl: string;
  onChangeServer: (url: string) => Promise<void>;
  hasServerKey?: boolean;
  /** Salva a chave para criar salas (null apaga). Ausente: o app não pede a chave. */
  onChangeKey?: (key: string | null) => Promise<void>;
  mediaUrl?: string | null;
  /** Salva o servidor de mídia (null volta ao da API); o app recarrega. */
  onChangeMedia?: (url: string | null) => Promise<void>;
}

const errText = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Algo deu errado. Tente novamente.';

export function Home({
  onJoined,
  api,
  serverUrl,
  onChangeServer,
  hasServerKey = false,
  onChangeKey,
  mediaUrl = null,
  onChangeMedia,
}: Props) {
  const { prefs, loaded, update } = usePreferences();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [maxParticipants, setMax] = useState(10);
  const [expiresInMinutes, setExpiry] = useState(720);
  const [needKey, setNeedKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  // O nome usado da última vez já vem preenchido.
  useEffect(() => {
    if (loaded && prefs.displayName) setName((n) => n || prefs.displayName!);
  }, [loaded]);

  const run = async (fn: (displayName: string) => Promise<void>) => {
    setError(null);
    const displayName = name.trim();
    if (!displayName) return setError('Informe seu nome.');
    setBusy(true);
    try {
      await fn(displayName);
      update({ displayName });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'server_key_required' && onChangeKey)
        setNeedKey(true);
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const create = (key?: string) =>
    run(async (displayName) => {
      const res = await api.createRoom(
        {
          displayName,
          ...(roomPassword ? { password: roomPassword } : {}),
          maxParticipants,
          expiresInMinutes,
        },
        ...(key ? [key] : []),
      );
      onJoined(res, displayName, roomPassword || undefined);
    });

  // O servidor pediu a chave: salva a digitada e tenta criar a sala de novo com ela.
  const saveKeyAndCreate = async (e: FormEvent) => {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key || !onChangeKey) return;
    try {
      await onChangeKey(key);
    } catch (err) {
      return setError(ipcErrorText(err, 'Não foi possível salvar a chave.'));
    }
    setNeedKey(false);
    setKeyInput('');
    await create(key);
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    void run(async (displayName) => {
      const res = await api.joinRoom(code, {
        displayName,
        ...(joinPassword ? { password: joinPassword } : {}),
      });
      onJoined(res, displayName, joinPassword || undefined);
    });
  };

  return (
    <main className="relative flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-8">
      <IconButton
        label="Configurações"
        className="absolute right-5 top-5"
        onClick={() => setShowSettings(true)}
      >
        <Settings size={18} />
      </IconButton>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <MonitorUp size={26} />
        </span>
        <h1 className="text-2xl font-semibold">Compartilhar tela</h1>
        <p className="text-sm text-soft">
          Crie uma sala e envie o código, ou entre na de um amigo.
        </p>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-4">
        <Field
          label="Seu nome"
          value={name}
          maxLength={32}
          placeholder="Como os amigos vão te ver"
          onChange={(e) => setName(e.target.value)}
        />

        {error && <Notice>{error}</Notice>}

        <div className="grid grid-cols-2 gap-4">
          <section
            aria-label="Criar sala"
            className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5"
          >
            <div>
              <h2 className="text-base font-semibold">Nova sala</h2>
              <p className="text-xs text-soft">Você recebe um código para enviar.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              aria-expanded={showOptions}
              className="flex items-center gap-1 self-start text-xs font-medium text-soft hover:text-ink"
            >
              <ChevronDown
                size={14}
                className={showOptions ? 'rotate-180 transition-transform' : 'transition-transform'}
              />
              Opções da sala
            </button>
            {showOptions && (
              <div className="flex flex-col gap-3">
                <Field
                  label="Senha (opcional)"
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Máximo de participantes"
                    type="number"
                    min={2}
                    max={10}
                    value={maxParticipants}
                    onChange={(e) => setMax(Number(e.target.value))}
                  />
                  <Field
                    label="Expira em (minutos)"
                    type="number"
                    min={15}
                    max={1440}
                    value={expiresInMinutes}
                    onChange={(e) => setExpiry(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
            {needKey ? (
              <form
                onSubmit={saveKeyAndCreate}
                aria-label="Chave do servidor"
                className="mt-auto flex flex-col gap-3"
              >
                <Field
                  label="Chave para criar salas"
                  type="password"
                  value={keyInput}
                  autoFocus
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="primary"
                  icon={<KeyRound size={16} />}
                  disabled={busy || !keyInput.trim()}
                >
                  Salvar chave e criar sala
                </Button>
              </form>
            ) : (
              <Button
                variant="primary"
                className="mt-auto"
                icon={<Plus size={16} />}
                disabled={busy}
                onClick={() => void create()}
              >
                Criar sala
              </Button>
            )}
          </section>

          <form
            onSubmit={join}
            aria-label="Entrar em sala"
            className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5"
          >
            <div>
              <h2 className="text-base font-semibold">Tenho um código</h2>
              <p className="text-xs text-soft">Cole o código que você recebeu.</p>
            </div>
            <Field
              label="Código da sala"
              value={code}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              onChange={(e) => setCode(e.target.value)}
            />
            <Field
              label="Senha (se houver)"
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
            />
            <Button
              type="submit"
              className="mt-auto"
              icon={<LogIn size={16} />}
              disabled={busy || !code.trim()}
            >
              Entrar
            </Button>
          </form>
        </div>
      </div>

      {showSettings && (
        <SettingsDialog
          onClose={() => setShowSettings(false)}
          prefs={prefs}
          update={update}
          serverUrl={serverUrl}
          onChangeServer={onChangeServer}
          hasServerKey={hasServerKey}
          {...(onChangeKey ? { onChangeKey } : {})}
          mediaUrl={mediaUrl}
          {...(onChangeMedia ? { onChangeMedia } : {})}
        />
      )}
    </main>
  );
}
