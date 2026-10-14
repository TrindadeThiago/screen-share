import { Volume2 } from 'lucide-react';
import type { ParticipantInfo } from '../livekit/useRoom';

interface Props {
  participants: ParticipantInfo[];
  /** Identidade de quem está transmitindo, se houver. */
  liveIdentity?: string;
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

export function Participants({ participants, liveIdentity }: Props) {
  return (
    <ul aria-label="Participantes" className="flex flex-col gap-0.5">
      {participants.map((p) => (
        <li
          key={p.identity}
          data-speaking={p.isSpeaking}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
        >
          <span
            aria-hidden
            className={
              'flex size-7 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold ' +
              (p.isSpeaking ? 'ring-2 ring-ok' : '')
            }
          >
            {initial(p.name)}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {p.name}
            {p.isLocal && <span className="text-faint"> (você)</span>}
          </span>
          {p.identity === liveIdentity && (
            <span className="rounded bg-live px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
              AO VIVO
            </span>
          )}
          {p.isSpeaking && (
            <span aria-label="falando" className="text-ok">
              <Volume2 size={15} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
