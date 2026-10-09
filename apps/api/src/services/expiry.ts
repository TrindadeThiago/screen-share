import type { Db } from '../db.js';
import type { MediaGateway } from '../livekit.js';

/** Marca salas vencidas como expiradas e as encerra no servidor de mídia. Retorna quantas foram expiradas. */
export async function expireRooms(db: Db, media: MediaGateway, now: number): Promise<number> {
  const due = db
    .prepare("SELECT code FROM rooms WHERE state = 'active' AND expires_at <= ?")
    .all(now) as { code: string }[];
  for (const { code } of due) {
    db.prepare("UPDATE rooms SET state = 'expired' WHERE code = ?").run(code);
    await media.closeRoom(code);
  }
  return due.length;
}
