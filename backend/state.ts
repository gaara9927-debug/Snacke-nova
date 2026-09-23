/**
 * State management for Snacke LIVE Backend
 */

import { GiftEvent, SystemStatus, TopGifter, TrackedEventLog } from '../shared/types.ts';

class ServerState {
  private termuxConnected = false;
  private tiktokConnected = false;
  private live = false;
  private lastHeartbeatTime: number | null = null;
  private lastGiftTime: number | null = null;
  private realGiftEvents = 0;
  private lastEventId: string | null = null;
  private startTime = Date.now();

  // Deduplication store: eventId -> timestamp
  private processedEventIds = new Map<string, number>();

  // Event tracking history (most recent 100 events)
  private eventHistory: TrackedEventLog[] = [];

  // Top gifters (only real gifts, no fake users)
  private topGiftersMap = new Map<string, TopGifter>();

  // Heartbeat timeout threshold (45 seconds)
  private readonly HEARTBEAT_TIMEOUT_MS = 45000;

  constructor() {
    // Background timer to check heartbeat freshness
    setInterval(() => {
      this.checkHeartbeatLiveness();
    }, 5000);
  }

  public recordHeartbeat(data: { username?: string; connected: boolean; live: boolean; timestamp?: number }): void {
    this.termuxConnected = true;
    this.tiktokConnected = Boolean(data.connected);
    this.live = Boolean(data.live);
    this.lastHeartbeatTime = Date.now();
  }

  private checkHeartbeatLiveness(): void {
    if (this.lastHeartbeatTime && Date.now() - this.lastHeartbeatTime > this.HEARTBEAT_TIMEOUT_MS) {
      if (this.termuxConnected || this.tiktokConnected || this.live) {
        console.log('[TERMUX] Heartbeat expirou (> 45s). Marcando Termux como desconectado.');
      }
      this.termuxConnected = false;
      this.tiktokConnected = false;
      this.live = false;
    }
  }

  public isDuplicateEvent(eventId: string): boolean {
    if (!eventId) return true;
    return this.processedEventIds.has(eventId);
  }

  public markEventProcessed(eventId: string): void {
    this.processedEventIds.set(eventId, Date.now());
    // Prune deduplication cache if too large (keep last 5000)
    if (this.processedEventIds.size > 5000) {
      const oldestEntries = Array.from(this.processedEventIds.entries()).slice(0, 1000);
      for (const [key] of oldestEntries) {
        this.processedEventIds.delete(key);
      }
    }
  }

  public trackGiftEvent(gift: GiftEvent, wsBroadcastCount: number): TrackedEventLog {
    const now = Date.now();
    this.lastGiftTime = now;
    this.lastEventId = gift.eventId;

    if (!gift.isSynthetic) {
      this.realGiftEvents += 1;
      this.updateTopGifter(gift);
    }

    const trackedLog: TrackedEventLog = {
      eventId: gift.eventId,
      timestamp: gift.timestamp || now,
      giftName: gift.giftName,
      giftCount: gift.giftCount,
      diamondCount: gift.diamondCount || gift.giftCount,
      username: gift.username,
      nickname: gift.nickname || gift.username,
      profilePicture: gift.profilePicture,
      stageTimestamps: {
        webhookReceived: now,
        wsBroadcast: now,
      },
    };

    this.eventHistory.unshift(trackedLog);
    if (this.eventHistory.length > 100) {
      this.eventHistory.pop();
    }

    return trackedLog;
  }

  public recordAck(eventId: string): boolean {
    const log = this.eventHistory.find((item) => item.eventId === eventId);
    if (log) {
      log.ackedAt = Date.now();
      log.stageTimestamps.gameAckReceived = Date.now();
      return true;
    }
    return false;
  }

  private updateTopGifter(gift: GiftEvent): void {
    if (!gift.username) return;
    const key = gift.username.toLowerCase();
    const existing = this.topGiftersMap.get(key);
    const diamonds = Math.max(1, gift.diamondCount || gift.giftCount);

    if (existing) {
      existing.totalGifts += gift.giftCount || 1;
      existing.totalDiamonds += diamonds;
      existing.lastGiftTime = Date.now();
      if (gift.profilePicture) existing.profilePicture = gift.profilePicture;
      if (gift.nickname) existing.nickname = gift.nickname;
    } else {
      this.topGiftersMap.set(key, {
        username: gift.username,
        nickname: gift.nickname || gift.username,
        profilePicture: gift.profilePicture,
        totalGifts: gift.giftCount || 1,
        totalDiamonds: diamonds,
        lastGiftTime: Date.now(),
      });
    }
  }

  public getTopGifters(): TopGifter[] {
    return Array.from(this.topGiftersMap.values())
      .sort((a, b) => b.totalDiamonds - a.totalDiamonds || b.totalGifts - a.totalGifts)
      .slice(0, 10);
  }

  public getStatus(websocketClientsCount = 0): SystemStatus {
    this.checkHeartbeatLiveness();

    return {
      backend: true,
      websocket: true,
      websocketClients: websocketClientsCount,
      termuxConnected: this.termuxConnected,
      tiktokConnected: this.tiktokConnected,
      live: this.live,
      username: 'rainz878',
      lastHeartbeat: this.lastHeartbeatTime ? new Date(this.lastHeartbeatTime).toISOString() : null,
      lastGiftAt: this.lastGiftTime ? new Date(this.lastGiftTime).toISOString() : null,
      realGiftEvents: this.realGiftEvents,
      lastEventId: this.lastEventId,
      waitingRealGift: this.realGiftEvents === 0,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      recentEvents: this.eventHistory.slice(0, 20),
    };
  }

  public resetForTesting(): void {
    this.processedEventIds.clear();
    this.eventHistory = [];
    this.realGiftEvents = 0;
    this.lastEventId = null;
  }
}

export const serverState = new ServerState();
