export function buildCsp(apiOrigin: string, mediaOrigin: string | null): string {
  const media = mediaOrigin ? [mediaOrigin, mediaOrigin.replace(/^http/, 'ws')] : [];
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: mediastream:",
    ['connect-src', "'self'", apiOrigin, ...media].join(' '),
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function createWindowOptions(preloadPath: string) {
  return {
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  };
}
