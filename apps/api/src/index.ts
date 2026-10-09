import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { createMediaGateway } from './livekit.js';
import { buildApp } from './server.js';
import { expireRooms } from './services/expiry.js';

const cfg = loadConfig();
mkdirSync(dirname(cfg.dbPath), { recursive: true });
const db = openDb(cfg.dbPath);
const media = createMediaGateway(cfg.livekitApiUrl, cfg.apiKey, cfg.apiSecret);

const app = await buildApp({
  db,
  media,
  now: Date.now,
  apiKey: cfg.apiKey,
  apiSecret: cfg.apiSecret,
  livekitUrl: cfg.livekitUrl,
  tokenTtlSeconds: cfg.tokenTtlSeconds,
  versionFile: cfg.versionFile,
});

setInterval(() => void expireRooms(db, media, Date.now()).catch(() => {}), 60_000).unref();
await app.listen({ port: cfg.port, host: '0.0.0.0' });
