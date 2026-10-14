import { useEffect, useMemo, useState } from 'react';
import { createApiClient, type JoinResult } from './api/client';
import { UpdateBanner } from './components/UpdateBanner';
import { Home } from './screens/Home';
import { Room } from './screens/Room';
import { Setup } from './screens/Setup';

interface Session {
  join: JoinResult;
  displayName: string;
  password?: string;
}

export function App() {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [serverKey, setServerKey] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const api = useMemo(
    () => (serverUrl ? createApiClient(serverUrl, undefined, serverKey) : null),
    [serverUrl, serverKey],
  );

  useEffect(() => {
    window.screenShare.getServerUrl().then(setServerUrl);
    window.screenShare.isServerConfigured().then(setConfigured, () => setConfigured(true));
    window.screenShare.getServerKey().then(setServerKey, () => {});
    window.screenShare.getMediaUrl().then(setMediaUrl, () => {});
  }, []);

  // Apagar a chave salva pode revelar a do config.json: relê em vez de supor.
  const changeKey = async (key: string | null) => {
    await window.screenShare.setServerKey(key);
    setServerKey(await window.screenShare.getServerKey());
  };

  if (configured === false)
    return (
      <Setup
        onSave={async (url, key) => {
          if (key.trim()) await window.screenShare.setServerKey(key);
          await window.screenShare.setServerUrl(url);
        }}
      />
    );
  if (!serverUrl || !api || configured === null)
    return (
      <p role="status" className="flex h-full items-center justify-center text-soft">
        Carregando…
      </p>
    );
  return (
    <div className="flex h-full flex-col">
      <UpdateBanner />
      <div className="min-h-0 flex-1">
        {session ? (
          <Room
            {...session}
            api={api}
            serverUrl={serverUrl}
            mediaUrl={mediaUrl}
            onLeave={() => setSession(null)}
          />
        ) : (
          <Home
            api={api}
            serverUrl={serverUrl}
            onChangeServer={(url) => window.screenShare.setServerUrl(url)}
            hasServerKey={serverKey !== null}
            onChangeKey={changeKey}
            onJoined={(join, displayName, password) =>
              setSession({ join, displayName, ...(password ? { password } : {}) })
            }
          />
        )}
      </div>
    </div>
  );
}
