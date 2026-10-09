import type { FastifyInstance } from 'fastify';

/** Informa ao app o endereço do servidor de mídia (usado para liberar a conexão na política de segurança). */
export function configRoutes(mediaUrl: string) {
  return async (app: FastifyInstance) => {
    app.get('/config', async () => ({ mediaUrl }));
  };
}
