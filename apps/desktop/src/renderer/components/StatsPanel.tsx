import { useEffect, useState } from 'react';

export interface StatsSample {
  timestamp: number; // ms
  bytes: number;
  packets: number;
  packetsLost: number;
  rttMs: number | null;
}

export interface Metrics {
  bitrateKbps: number;
  lossPercent: number;
  rttMs: number | null;
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
  };
}

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

  if (!metrics) return <p>Coletando métricas…</p>;
  return (
    <dl aria-label="Métricas de conexão">
      <dt>Taxa de bits</dt>
      <dd>{metrics.bitrateKbps} kbps</dd>
      <dt>Perda de pacotes</dt>
      <dd>{metrics.lossPercent}%</dd>
      <dt>Latência (RTT)</dt>
      <dd>{metrics.rttMs === null ? '—' : `${metrics.rttMs} ms`}</dd>
    </dl>
  );
}
