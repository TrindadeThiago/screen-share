import { useEffect, useState } from 'react';

export interface StatsSample {
  timestamp: number; // ms
  bytes: number;
  packets: number;
  packetsLost: number;
  rttMs: number | null;
  video?: VideoInfo;
}

/** O que prova (ou não) a meta de 720p/40fps. */
export interface VideoInfo {
  fps?: number;
  width?: number;
  height?: number;
  codec?: string;
  /** Encoder (quem transmite) ou decoder (quem assiste) em uso. */
  implementation?: string;
  /** Motivo de limitação de qualidade no envio: cpu, bandwidth, other. */
  limitation?: string;
}

export interface Metrics {
  bitrateKbps: number;
  lossPercent: number;
  rttMs: number | null;
  video?: VideoInfo;
}

interface RtcStat {
  type?: string;
  kind?: string;
  [k: string]: any;
}

/**
 * Extrai uma amostra de um RTCStatsReport de vídeo (envio ou recepção).
 * Com simulcast há vários outbound-rtp: vale a camada de maior resolução.
 */
export function sampleFromReport(report: Iterable<RtcStat>, now = Date.now()): StatsSample | null {
  const all = Array.from(report);
  const video = (type: string) => all.filter((s) => s.type === type && s.kind === 'video');
  const area = (s: RtcStat) => (s.frameWidth ?? 0) * (s.frameHeight ?? 0);
  const out = video('outbound-rtp').sort((a, b) => area(b) - area(a))[0];
  const s = out ?? video('inbound-rtp')[0];
  if (!s) return null;
  const remote = out && all.find((r) => r.type === 'remote-inbound-rtp' && r.localId === out.id);
  const codec = all.find((r) => r.type === 'codec' && r.id === s.codecId)?.mimeType as
    string | undefined;
  const rtt = remote?.roundTripTime;
  const limitation = s.qualityLimitationReason as string | undefined;
  return {
    timestamp: now,
    bytes: s.bytesSent ?? s.bytesReceived ?? 0,
    packets: s.packetsSent ?? s.packetsReceived ?? 0,
    packetsLost: remote?.packetsLost ?? s.packetsLost ?? 0,
    rttMs: rtt != null ? Math.round(rtt * 1000) : null,
    video: {
      fps: s.framesPerSecond,
      width: s.frameWidth,
      height: s.frameHeight,
      codec: codec?.replace(/^video\//, ''),
      implementation: s.encoderImplementation ?? s.decoderImplementation,
      limitation: limitation && limitation !== 'none' ? limitation : undefined,
    },
  };
}

export function computeMetrics(prev: StatsSample, curr: StatsSample): Metrics {
  const dt = (curr.timestamp - prev.timestamp) / 1000;
  const bitrateKbps = dt > 0 ? ((curr.bytes - prev.bytes) * 8) / dt / 1000 : 0;
  const dPackets = curr.packets - prev.packets;
  const dLost = curr.packetsLost - prev.packetsLost;
  const total = dPackets + dLost;
  return {
    bitrateKbps: Math.round(bitrateKbps),
    lossPercent: total > 0 ? Math.round((dLost / total) * 1000) / 10 : 0,
    rttMs: curr.rttMs,
    ...(curr.video ? { video: curr.video } : {}),
  };
}

const PANEL = 'rounded-lg bg-black/70 px-3 py-2 text-xs text-white/80 backdrop-blur';

const LIMITATION_TEXT: Record<string, string> = {
  cpu: 'processador',
  bandwidth: 'rede',
  other: 'outro motivo',
};

export function StatsPanel({
  readSample,
  intervalMs = 2000,
}: {
  readSample: () => Promise<StatsSample | null>;
  intervalMs?: number;
}) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    let prev: StatsSample | null = null;
    const tick = async () => {
      const s = await readSample().catch(() => null);
      if (s && prev) setMetrics(computeMetrics(prev, s));
      if (s) prev = s;
    };
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [readSample, intervalMs]);

  if (!metrics) return <p className={PANEL}>Coletando métricas…</p>;
  const v = metrics.video;
  return (
    <dl
      aria-label="Métricas de conexão"
      className={`${PANEL} grid grid-cols-[auto_auto] gap-x-4 gap-y-1 [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-medium [&_dd]:text-white [&_dt]:text-white/65`}
    >
      <dt>Taxa de bits</dt>
      <dd>{metrics.bitrateKbps} kbps</dd>
      <dt>Perda de pacotes</dt>
      <dd>{metrics.lossPercent}%</dd>
      <dt>Latência (RTT)</dt>
      <dd>{metrics.rttMs === null ? '—' : `${metrics.rttMs} ms`}</dd>
      {v && (
        <>
          <dt>Vídeo</dt>
          <dd>
            {v.width && v.height ? `${v.width}×${v.height}` : '—'}
            {v.fps != null && ` a ${Math.round(v.fps)} fps`}
          </dd>
          <dt>Codec</dt>
          <dd>{[v.codec, v.implementation].filter(Boolean).join(' · ') || '—'}</dd>
          {v.limitation && (
            <>
              <dt>Qualidade limitada por</dt>
              <dd>{LIMITATION_TEXT[v.limitation] ?? v.limitation}</dd>
            </>
          )}
        </>
      )}
    </dl>
  );
}
