import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Mock da ponte do preload exposta pelo Electron.
(globalThis as unknown as { screenShare: unknown }).screenShare = undefined;
export function installScreenShareMock(overrides: Record<string, unknown> = {}) {
  const mock = {
    platform: 'win32',
    listSources: vi.fn().mockResolvedValue([]),
    selectSource: vi.fn().mockResolvedValue(undefined),
    getAppVersion: vi.fn().mockResolvedValue('0.1.0'),
    openExternal: vi.fn().mockResolvedValue(undefined),
    getPreferences: vi.fn().mockResolvedValue({}),
    setPreferences: vi.fn().mockResolvedValue(undefined),
    getServerUrl: vi.fn().mockResolvedValue('https://api.example.com'),
    setServerUrl: vi.fn().mockResolvedValue(undefined),
    checkForUpdate: vi.fn().mockResolvedValue(null),
    isServerConfigured: vi.fn().mockResolvedValue(true),
    getServerKey: vi.fn().mockResolvedValue(null),
    setServerKey: vi.fn().mockResolvedValue(undefined),
    getMediaUrl: vi.fn().mockResolvedValue(null),
    setMediaUrl: vi.fn().mockResolvedValue(undefined),
    logDiagnostic: vi.fn().mockResolvedValue(undefined),
    readDiagnostics: vi.fn().mockResolvedValue(''),
    setInRoom: vi.fn().mockResolvedValue(undefined),
    onMicToggle: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
  (window as unknown as { screenShare: unknown }).screenShare = mock;
  return mock;
}
