import type { ScreenShareBridge } from '../shared';

declare global {
  interface Window {
    screenShare: ScreenShareBridge;
  }
}
export {};
