import { Writable } from 'node:stream';
import { openDb } from '../src/db.js';
import type { MediaGateway, RoomParticipant } from '../src/livekit.js';
import { buildApp, type AppDeps } from '../src/server.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const KEY = 'devkey';
export const SECRET = 'a-very-long-secret-for-tests-0123456789';

export function fakeMedia(count = 0) {
  const state = {
    count,
    closed: [] as string[],
    /** Participantes explícitos; se vazio, `count` gera anônimos. */
    participants: [] as RoomParticipant[],
  };
  const media: MediaGateway = {
    listParticipants: async () =>
      state.participants.length
        ? state.participants
        : Array.from({ length: state.count }, (_, i) => ({
            identity: `anon-${i}`,
            sharingScreen: false,
            mayShareScreen: false,
          })),
    setScreenShareAllowed: async (_r, identity, allowed) => {
      const p = state.participants.find((x) => x.identity === identity);
      if (p) p.mayShareScreen = allowed;
    },
    closeRoom: async (r) => void state.closed.push(r),
  };
  return { media, state };
}

export function makeDeps(over: Partial<AppDeps> = {}) {
  const { media, state } = fakeMedia();
  const clock = { t: 1_700_000_000_000 };
  const dir = mkdtempSync(join(tmpdir(), 'ss-'));
  const versionFile = join(dir, 'version.json');
  writeFileSync(
    versionFile,
    JSON.stringify({ latest: '1.2.0', downloadUrl: 'https://example.com/app.exe' }),
  );
  const deps: AppDeps = {
    db: openDb(':memory:'),
    media,
    now: () => clock.t,
    apiKey: KEY,
    apiSecret: SECRET,
    livekitUrl: 'wss://live.example.com',
    tokenTtlSeconds: 600,
    versionFile,
    logLevel: 'silent',
    ...over,
  };
  return { deps, clock, mediaState: state };
}

export async function makeApp(over: Partial<AppDeps> = {}) {
  const ctx = makeDeps(over);
  const app = await buildApp(ctx.deps);
  return { app, ...ctx };
}

export function captureStream() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(c, _e, cb) {
      chunks.push(c.toString());
      cb();
    },
  });
  return { stream, text: () => chunks.join('') };
}

export function decodeJwt(token: string) {
  return JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
}
