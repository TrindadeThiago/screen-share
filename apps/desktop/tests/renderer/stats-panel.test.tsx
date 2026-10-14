import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  computeMetrics,
  sampleFromReport,
  StatsPanel,
} from '../../src/renderer/components/StatsPanel';

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
  it('lê a camada de maior resolução do envio, com codec, encoder e limitação', () => {
    const s = sampleFromReport(
      [
        { type: 'outbound-rtp', kind: 'video', id: 'lo', frameWidth: 640, frameHeight: 360 },
        {
          type: 'outbound-rtp',
          kind: 'video',
          id: 'hi',
          codecId: 'c1',
          frameWidth: 1280,
          frameHeight: 720,
          framesPerSecond: 40,
          bytesSent: 500,
          packetsSent: 10,
          encoderImplementation: 'MediaFoundationVideoEncodeAccelerator',
          qualityLimitationReason: 'cpu',
        },
        { type: 'remote-inbound-rtp', localId: 'hi', roundTripTime: 0.025, packetsLost: 2 },
        { type: 'codec', id: 'c1', mimeType: 'video/H264' },
      ],
      123,
    );
    expect(s).toEqual({
      timestamp: 123,
      bytes: 500,
      packets: 10,
      packetsLost: 2,
      rttMs: 25,
      video: {
        fps: 40,
        width: 1280,
        height: 720,
        codec: 'H264',
        implementation: 'MediaFoundationVideoEncodeAccelerator',
        limitation: 'cpu',
      },
    });
  });
  it('lê a recepção e ignora limitação "none"', () => {
    const s = sampleFromReport([
      {
        type: 'inbound-rtp',
        kind: 'video',
        frameWidth: 1280,
        frameHeight: 720,
        framesPerSecond: 39,
        bytesReceived: 9,
        packetsReceived: 3,
        packetsLost: 1,
        decoderImplementation: 'D3D11VideoDecoder',
        qualityLimitationReason: 'none',
      },
      { type: 'inbound-rtp', kind: 'audio' },
    ]);
    expect(s).toMatchObject({ bytes: 9, packets: 3, packetsLost: 1, rttMs: null });
    expect(s!.video).toMatchObject({ fps: 39, implementation: 'D3D11VideoDecoder' });
    expect(s!.video!.limitation).toBeUndefined();
    expect(sampleFromReport([{ type: 'inbound-rtp', kind: 'audio' }])).toBeNull();
  });
  it('painel mostra resolução, fps, codec e limitação', async () => {
    const video = { fps: 39.6, width: 1280, height: 720, codec: 'H264', limitation: 'cpu' };
    const base = { bytes: 0, packets: 0, packetsLost: 0, rttMs: null, video };
    const samples = [
      { ...base, timestamp: 0 },
      { ...base, timestamp: 1000 },
    ];
    render(<StatsPanel readSample={async () => samples.shift() ?? null} intervalMs={10} />);
    expect(await screen.findByText('1280×720 a 40 fps')).toBeInTheDocument();
    expect(screen.getByText('H264')).toBeInTheDocument();
    expect(screen.getByText('processador')).toBeInTheDocument();
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
