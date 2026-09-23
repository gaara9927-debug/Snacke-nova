/**
 * Shared types for Snacke LIVE
 */

export interface GiftEvent {
  event: 'gift';
  eventId: string;
  username: string;
  nickname: string;
  userId?: string;
  profilePicture?: string;
  giftId: string | number;
  giftName: string;
  giftCount: number;
  diamondCount: number;
  repeatEnd?: boolean;
  timestamp: number;
  isSynthetic?: boolean; // Only used in unit tests; never counts as real gift
}

export interface HeartbeatPayload {
  username: string;
  connected: boolean;
  live: boolean;
  timestamp: number;
}

export interface TrackedEventLog {
  eventId: string;
  timestamp: number;
  giftName: string;
  giftCount: number;
  diamondCount: number;
  username: string;
  nickname: string;
  profilePicture?: string;
  ackedAt?: number;
  stageTimestamps: {
    webhookReceived: number;
    wsBroadcast: number;
    gameAckReceived?: number;
  };
}

export interface SystemStatus {
  backend: boolean;
  websocket: boolean;
  websocketClients: number;
  termuxConnected: boolean;
  tiktokConnected: boolean;
  live: boolean;
  username: string;
  lastHeartbeat: string | null;
  lastGiftAt: string | null;
  realGiftEvents: number;
  lastEventId: string | null;
  waitingRealGift: boolean;
  uptimeSeconds: number;
  recentEvents: TrackedEventLog[];
}

export type WSClientMessage =
  | { type: 'gift_ack'; eventId: string; clientTimestamp?: number }
  | { type: 'ping' };

export type WSServerMessage =
  | { type: 'init'; data: { status: SystemStatus; topGifters: TopGifter[] } }
  | { type: 'status_update'; data: SystemStatus }
  | { type: 'gift_received'; data: GiftEvent }
  | { type: 'ack_confirmed'; eventId: string; timestamp: number }
  | { type: 'pong' };

export interface TopGifter {
  username: string;
  nickname: string;
  profilePicture?: string;
  totalGifts: number;
  totalDiamonds: number;
  lastGiftTime: number;
}

export interface SnakeCoordinate {
  x: number;
  y: number;
}

export type AppleType = 'regular' | 'golden' | 'donut' | 'galaxy' | 'special_green' | 'giant';

export interface GameApple {
  id: string;
  x: number;
  y: number;
  type: AppleType;
  points: number;
  createdAt: number;
  color: string;
  sizeMultiplier?: number; // e.g., 1.8 for giant apple
}

export interface ActiveEventEffect {
  id: string;
  name: string;
  type: 'shower' | 'speed' | 'golden' | 'galaxy' | 'frenzy' | 'giant_rush';
  durationMs: number;
  startedAt: number;
  multiplier: number;
}
