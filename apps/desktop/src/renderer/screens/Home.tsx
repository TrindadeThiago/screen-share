import { useState, type FormEvent } from 'react';
import { ApiError, type ApiClient, type JoinResult } from '../api/client';

interface Props {
  onJoined: (join: JoinResult, displayName: string, password?: string) => void;
  api: ApiClient;
  serverUrl: string;
  onChangeServer: (url: string) => Promise<void>;
}

const errText = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Algo deu errado. Tente novamente.';

export function Home({ onJoined, api, serverUrl, onChangeServer }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [maxParticipants, setMax] = useState(10);
  const [expiresInMinutes, setExpiry] = useState(720);
  const [serverInput, setServerInput] = useState(serverUrl);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  const saveServer = async (e: FormEvent) => {
    e.preventDefault();
    setServerMsg(null);
    try {
      await onChangeServer(serverInput);
    } catch (err) {
      setServerMsg(
        err instanceof Error
          ? err.message.replace(/^Error invoking remote method '[^']*': (Error: )?/, '')
          : 'Endereço inválido.',
      );
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    if (!name.trim()) return setError('Informe seu nome.');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(async () => {
      const displayName = name.trim();
      const res = await api.createRoom({
        displayName,
        ...(roomPassword ? { password: roomPassword } : {}),
        maxParticipants,
        expiresInMinutes,
      });
      onJoined(res, displayName, roomPassword || undefined);
    });

  const join = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const displayName = name.trim();
      const res = await api.joinRoom(code, {
        displayName,
        ...(joinPassword ? { password: joinPassword } : {}),
      });
      onJoined(res, displayName, joinPassword || undefined);
    });
  };

  return (
    <main>
      <h1>Compartilhar tela</h1>
      <label>
        Seu nome
        <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
      </label>

      <section aria-label="Criar sala">
        <button type="button" onClick={() => setShowOptions((v) => !v)} aria-expanded={showOptions}>
          Opções da sala
        </button>
        {showOptions && (
          <div>
            <label>
              Senha (opcional)
              <input
                type="password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
              />
            </label>
            <label>
              Máximo de participantes
              <input
                type="number"
                min={2}
                max={10}
                value={maxParticipants}
                onChange={(e) => setMax(Number(e.target.value))}
              />
            </label>
            <label>
              Expira em (minutos)
              <input
                type="number"
                min={15}
                max={1440}
                value={expiresInMinutes}
                onChange={(e) => setExpiry(Number(e.target.value))}
              />
            </label>
          </div>
        )}
        <button type="button" disabled={busy} onClick={create}>
          Criar sala
        </button>
      </section>

      <form onSubmit={join} aria-label="Entrar em sala">
        <label>
          Código da sala
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label>
          Senha (se houver)
          <input
            type="password"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy || !code.trim()}>
          Entrar
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={saveServer} aria-label="Servidor">
        <label>
          Endereço do servidor
          <input value={serverInput} onChange={(e) => setServerInput(e.target.value)} />
        </label>
        <button type="submit" disabled={!serverInput.trim() || serverInput.trim() === serverUrl}>
          Salvar servidor
        </button>
        {serverMsg && <p role="alert">{serverMsg}</p>}
      </form>
    </main>
  );
}
