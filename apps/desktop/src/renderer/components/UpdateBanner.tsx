import { useEffect, useState } from 'react';
import type { UpdateInfo } from '../../shared';

export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    window.screenShare.checkForUpdate().then(setInfo, () => setInfo(null));
  }, []);

  if (!info) return null;
  return (
    <div role="alert" className="shrink-0 bg-accent px-4 py-1.5 text-center text-sm text-white">
      Nova versão {info.latest} disponível.{' '}
      <a
        href={info.downloadUrl}
        className="font-semibold underline"
        onClick={(e) => {
          e.preventDefault();
          void window.screenShare.openExternal(info.downloadUrl);
        }}
      >
        Baixar
      </a>
    </div>
  );
}
