import { describe, expect, it } from 'vitest';
import { issueToken, readToken } from '../src/services/tokens.js';
import { KEY, makeApp, SECRET } from './helpers.js';

const person = (identity: string, over = {}) => ({
  identity,
  sharingScreen: false,
  mayShareScreen: false,
  ...over,
});

async function roomWith(identities: string[]) {
  const ctx = await makeApp();
  const created = await ctx.app.inject({
    method: 'POST',
    url: '/rooms',
    payload: { displayName: 'Ana' },
  });
  const { code, token } = created.json();
  const me = readToken(token, SECRET)!;
  ctx.mediaState.participants = [person(me.identity), ...identities.map((i) => person(i))];
  const post = (path: string, t: string = token) =>
    ctx.app.inject({ method: 'POST', url: `/rooms/${code}/${path}`, payload: { token: t } });
  return { ...ctx, code, token, me, post };
}

describe('readToken', () => {
  it('aceita token desta API mesmo vencido e rejeita assinatura alheia', async () => {
    const input = { apiKey: KEY, room: 'ROOM', identity: 'id1', name: 'Ana', ttlSeconds: -60 };
    const mine = await issueToken({ ...input, apiSecret: SECRET });
    expect(readToken(mine, SECRET)).toEqual({ identity: 'id1', room: 'ROOM' });
    const forged = await issueToken({
      ...input,
      apiSecret: 'outro-segredo-bem-comprido-000000000',
    });
    expect(readToken(forged, SECRET)).toBeNull();
    expect(readToken('lixo', SECRET)).toBeNull();
    const [h, , s] = mine.split('.');
    const tampered = `${h}.${Buffer.from('{"sub":"x","video":{"room":"ROOM"}}').toString('base64url')}.${s}`;
    expect(readToken(tampered, SECRET)).toBeNull();
  });
});

describe('transmissor único', () => {
  it('token novo só publica microfone', async () => {
    const { token } = await roomWith([]);
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(claims.video.canPublishSources).toEqual(['microphone']);
  });
  it('concede a quem pede e tira de quem tinha sem usar', async () => {
    const { post, mediaState, me } = await roomWith(['bia']);
    mediaState.participants[1]!.mayShareScreen = true;
    expect((await post('broadcast')).statusCode).toBe(204);
    expect(mediaState.participants.find((p) => p.identity === me.identity)!.mayShareScreen).toBe(
      true,
    );
    expect(mediaState.participants[1]!.mayShareScreen).toBe(false);
  });
  it('recusa com 409 se outra pessoa está transmitindo', async () => {
    const { post, mediaState } = await roomWith(['bia']);
    Object.assign(mediaState.participants[1]!, { sharingScreen: true, mayShareScreen: true });
    const res = await post('broadcast');
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('broadcast_busy');
    expect(mediaState.participants[0]!.mayShareScreen).toBe(false);
  });
  it('parar devolve a permissão', async () => {
    const { post, mediaState } = await roomWith([]);
    await post('broadcast');
    expect((await post('broadcast/stop')).statusCode).toBe(204);
    expect(mediaState.participants[0]!.mayShareScreen).toBe(false);
  });
  it('rejeita token de outra sala, forjado ou de quem não está na sala', async () => {
    const { post, mediaState } = await roomWith([]);
    const other = await issueToken({
      apiKey: KEY,
      apiSecret: SECRET,
      room: 'OUTRASALAOUTRASA',
      identity: 'x',
      name: 'X',
      ttlSeconds: 60,
    });
    expect((await post('broadcast', other)).statusCode).toBe(401);
    expect((await post('broadcast', 'a.b.c')).statusCode).toBe(401);
    mediaState.participants = [person('só-outra-pessoa')];
    expect((await post('broadcast')).json().error).toBe('invalid_token');
  });
});

describe('reentrada', () => {
  it('mantém a identidade e não conta a própria sessão antiga no limite', async () => {
    const { app, code, token, me, mediaState } = await roomWith(['bia']);
    mediaState.participants = [person(me.identity), person('bia')];
    const join = (payload: object) =>
      app.inject({ method: 'POST', url: `/rooms/${code}/token`, payload });
    // sala de 10 por padrão: force o limite
    mediaState.participants.push(...Array.from({ length: 8 }, (_, i) => person(`p${i}`)));
    expect((await join({ displayName: 'Novo' })).json().error).toBe('room_full');
    const again = await join({ displayName: 'Ana', rejoinToken: token });
    expect(again.statusCode).toBe(200);
    expect(readToken(again.json().token, SECRET)!.identity).toBe(me.identity);
  });
  it('ignora rejoinToken inválido ou de outra sala (vira entrada normal)', async () => {
    const { app, code, me } = await roomWith([]);
    const res = await app.inject({
      method: 'POST',
      url: `/rooms/${code}/token`,
      payload: { displayName: 'Zé', rejoinToken: 'a.b.c' },
    });
    expect(res.statusCode).toBe(200);
    expect(readToken(res.json().token, SECRET)!.identity).not.toBe(me.identity);
  });
});

describe('chave do servidor', () => {
  it('sem chave configurada, criar sala é livre', async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/rooms', payload: { displayName: 'A' } });
    expect(res.statusCode).toBe(201);
  });
  it('com chave, criar exige o cabeçalho certo; entrar não exige', async () => {
    const { app } = await makeApp({ roomCreationKey: 'chave-secreta' });
    const create = (headers = {}) =>
      app.inject({ method: 'POST', url: '/rooms', payload: { displayName: 'A' }, headers });
    expect((await create()).statusCode).toBe(403);
    expect((await create({ 'x-server-key': 'errada' })).json().error).toBe('server_key_required');
    const ok = await create({ 'x-server-key': 'chave-secreta' });
    expect(ok.statusCode).toBe(201);
    const join = await app.inject({
      method: 'POST',
      url: `/rooms/${ok.json().code}/token`,
      payload: { displayName: 'B' },
    });
    expect(join.statusCode).toBe(200);
  });
});
