import { useEffect, useState } from 'react';
import type { UpdateInfo } from '../../shared';

export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    window.screenShare.checkForUpdate().then(setInfo, () => setInfo(null));
  }, []);

  if (!info) return null;
  return (
    <div role="alert" className="update-banner">
      Nova versão {info.latest} disponível.{' '}
      <a
        href={info.downloadUrl}
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
