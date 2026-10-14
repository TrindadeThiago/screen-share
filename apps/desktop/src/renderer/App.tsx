import { useEffect, useMemo, useState } from 'react';
import { createApiClient, type JoinResult } from './api/client';
import { UpdateBanner } from './components/UpdateBanner';
import { Home } from './screens/Home';
import { Room } from './screens/Room';

interface Session {
  join: JoinResult;
  displayName: string;
  password?: string;
}

export function App() {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [serverKey, setServerKey] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const api = useMemo(
    () => (serverUrl ? createApiClient(serverUrl, undefined, serverKey) : null),
    [serverUrl, serverKey],
  );

  useEffect(() => {
    window.screenShare.getServerUrl().then(setServerUrl);
    window.screenShare.getServerKey().then(setServerKey, () => {});
    window.screenShare.getMediaUrl().then(setMediaUrl, () => {});
  }, []);

  if (!serverUrl || !api) return <p role="status">Carregando…</p>;
  return (
    <>
      <UpdateBanner />
      {session ? (
        <Room {...session} api={api} mediaUrl={mediaUrl} onLeave={() => setSession(null)} />
      ) : (
        <Home
          api={api}
          serverUrl={serverUrl}
          onChangeServer={(url) => window.screenShare.setServerUrl(url)}
          onJoined={(join, displayName, password) =>
            setSession({ join, displayName, ...(password ? { password } : {}) })
          }
        />
      )}
    </>
  );
}
