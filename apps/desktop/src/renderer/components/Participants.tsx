import type { ParticipantInfo } from '../livekit/useRoom';

export function Participants({ participants }: { participants: ParticipantInfo[] }) {
  return (
    <ul aria-label="Participantes">
      {participants.map((p) => (
        <li key={p.identity} data-speaking={p.isSpeaking}>
          {p.isSpeaking && <span aria-label="falando">🔊 </span>}
          {p.name}
          {p.isLocal && ' (você)'}
        </li>
      ))}
    </ul>
  );
}
