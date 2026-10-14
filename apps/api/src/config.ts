export interface Config {
  port: number;
  dbPath: string;
  livekitUrl: string; // URL wss devolvida ao cliente
  livekitApiUrl: string; // URL http usada pelo servidor
  apiKey: string;
  apiSecret: string;
  tokenTtlSeconds: number;
  roomCreationKey?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const need = (k: string) => {
    const v = env[k];
    if (!v) throw new Error(`Variável de ambiente obrigatória ausente: ${k}`);
    return v;
  };
  return {
    port: Number(env.PORT ?? 3000),
    dbPath: env.DB_PATH ?? './data/rooms.sqlite',
    livekitUrl: need('LIVEKIT_URL'),
    livekitApiUrl: env.LIVEKIT_API_URL ?? need('LIVEKIT_URL').replace(/^ws/, 'http'),
    apiKey: need('LIVEKIT_API_KEY'),
    apiSecret: need('LIVEKIT_API_SECRET'),
    tokenTtlSeconds: Number(env.TOKEN_TTL_SECONDS ?? 600),
    ...(env.ROOM_CREATION_KEY ? { roomCreationKey: env.ROOM_CREATION_KEY } : {}),
  };
}
