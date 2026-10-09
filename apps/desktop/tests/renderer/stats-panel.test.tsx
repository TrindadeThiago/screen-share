import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { computeMetrics, StatsPanel } from '../../src/renderer/components/StatsPanel';

describe('métricas', () => {
  it('converte amostras em bitrate, perda e RTT', () => {
    const m = computeMetrics(
      { timestamp: 0, bytes: 0, packets: 0, packetsLost: 0, rttMs: null },
      { timestamp: 2000, bytes: 1_000_000, packets: 950, packetsLost: 50, rttMs: 42 },
    );
    expect(m).toEqual({ bitrateKbps: 4000, lossPercent: 5, rttMs: 42 });
  });
  it('trata intervalos vazios sem dividir por zero', () => {
    const s = { timestamp: 5, bytes: 1, packets: 1, packetsLost: 0, rttMs: null };
    expect(computeMetrics(s, s)).toEqual({ bitrateKbps: 0, lossPercent: 0, rttMs: null });
  });
  it('painel mostra valores após duas amostras', async () => {
    const samples = [
      { timestamp: 0, bytes: 0, packets: 0, packetsLost: 0, rttMs: 30 },
      { timestamp: 1000, bytes: 125_000, packets: 100, packetsLost: 0, rttMs: 30 },
    ];
    const read = vi.fn().mockImplementation(async () => samples.shift() ?? null);
    render(<StatsPanel readSample={read} intervalMs={10} />);
    expect(await screen.findByText('1000 kbps')).toBeInTheDocument();
    expect(screen.getByText('30 ms')).toBeInTheDocument();
  });
});
