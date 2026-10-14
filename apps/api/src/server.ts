import Fastify from 'fastify';
import type { Writable } from 'node:stream';
import { errorHandler } from './errors.js';
import { registerRateLimit } from './plugins/rate-limit.js';
import { configRoutes } from './routes/config.js';
import { roomRoutes } from './routes/rooms.js';
import { versionRoutes } from './routes/version.js';
import type { RoomDeps } from './services/rooms.js';

export interface AppDeps extends RoomDeps {
  versionFile: string;
  globalRateMax?: number;
  tokenRateMax?: number;
  logStream?: Writable;
  logLevel?: string;
}

/** Remove o código de sala de URLs antes de logar. */
export function maskUrl(url: string): string {
  return url.replace(/(\/rooms\/)[^/?]+/, '$1[redacted]');
}

export async function buildApp(deps: AppDeps) {
  const app = Fastify({
    trustProxy: true,
    logger: {
      level: deps.logLevel ?? 'info',
      ...(deps.logStream ? { stream: deps.logStream } : {}),
      serializers: {
        req: (req) => ({ method: req.method, url: maskUrl(req.url) }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
  });
  app.setErrorHandler(errorHandler);
  // O app desktop chama a API a partir de file:// (origem "null"). A API não usa cookies
  // nem credenciais, então liberar qualquer origem não expõe nada além do que já é público.
  app.addHook('onRequest', async (req, reply) => {
    reply.header('access-control-allow-origin', '*');
    if (req.method !== 'OPTIONS') return;
    return reply
      .header('access-control-allow-methods', 'GET, POST, OPTIONS')
      .header('access-control-allow-headers', 'content-type, x-server-key')
      .header('access-control-max-age', '600')
      .status(204)
      .send();
  });
  await registerRateLimit(app, deps.globalRateMax ?? 120);
  await app.register(roomRoutes(deps, deps.tokenRateMax ?? 20));
  await app.register(versionRoutes(deps.versionFile));
  await app.register(configRoutes(deps.livekitUrl));
  return app;
}
