import { readFileSync } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors.js';

const schema = z.object({ latest: z.string().min(1), downloadUrl: z.string().url() });

export function versionRoutes(versionFile: string) {
  return async (app: FastifyInstance) => {
    app.get('/version', async () => {
      try {
        return schema.parse(JSON.parse(readFileSync(versionFile, 'utf8')));
      } catch {
        throw new AppError('server_error');
      }
    });
  };
}
