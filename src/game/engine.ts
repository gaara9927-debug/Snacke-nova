/**
 * Snake Game Core Engine for Snacke LIVE
 * 
 * Features:
 * - Substantially expanded 32x48 arena (1,536 cells)
 * - Intelligent AI with automatic Survival Mode & Alert State
 * - Dynamic pupil target tracking
 * - Progressive growth: normal up to 70% maxSafe, then 20 apples = +1%
 * - Rare apples: Regular (🍎), Special Green (🍏), Golden (🌟), Giant (👑/🍎)
 * - Fast-paced Combo system (x2, x3, x4...)
 * - Soft dissolution / fade death animation (no abrupt hard resets)
 * - Ambient occasional events: Chuva de Maçãs, Golden Rush, Maçã Gigante, Frenesi
 * - 100% compliant with TikTok gifts, WebSocket and ACK pipeline
 */

import { evaluateGiftReward } from '../../shared/gifts.ts';
import { ActiveEventEffect, AppleType, GameApple, GiftEvent, SnakeCoordinate } from '../../shared/types.ts';
import { decideAIMove } from './pathfinder.ts';

export interface GameEngineOptions {
  cols?: number;
  rows?: number;
  onScoreUpdate?: (score: number, applesCount: number, recordScore: number) => void;
  onGiftApplied?: (gift: GiftEvent, effectName?: string) => void;
  onSendAck?: (eventId: string) => void;
  onAppleEaten?: (apple: GameApple, position: SnakeCoordinate, combo: number) => void;
  onComboUpdate?: (combo: number) => void;
  onEventTriggered?: (eventName: string, description: string) => void;
  onNewRecord?: (newRecord: number) => void;
}

export class SnakeGameEngine {
  public cols: number;
  public rows: number;

  // Snake body: index 0 is head
  public snake: SnakeCoordinate[] = [];
  public prevSnake: SnakeCoordinate[] = []; // For smooth sub-cell interpolation

  // Current apples on board
  public apples: GameApple[] = [];

  // Growth queue (segments to add)
  public growthPending = 0;

  // Progressive growth state (tracks apples collected once >= 70% of maxSafeLength)
  public post70ApplesCount = 0;

  // Score & Metrics
  public score = 0;
  public applesCollected = 0;
  public giftsProcessed = 0;
  public recordScore = 0;
  private hasAnnouncedRecord = false;

  // Combo system
  public comboCount = 0;
  public lastAppleEatenTime = 0;
  private readonly comboTimeoutMs = 3400;

  // AI & Visual status
  public targetApple: GameApple | null = null;
  public isSurvivalMode = false;
  public isAlert = false;

  // Soft death / dissolution state
  public isDissolving = false;
  public dissolveStartTime = 0;
  public readonly dissolveDurationMs = 650;

  // Active temporary event effects (speed, golden shower, galaxy, frenzy)
  public activeEffects: ActiveEventEffect[] = [];

  // Occasional natural events timer
  private lastOccasionalEventTime = 0;
  private readonly occasionalEventIntervalMs = 50000; // ~50s

  // Callbacks
  private onScoreUpdate?: (score: number, applesCount: number, recordScore: number) => void;
  private onGiftApplied?: (gift: GiftEvent, effectName?: string) => void;
  private onSendAck?: (eventId: string) => void;
  private onAppleEaten?: (apple: GameApple, position: SnakeCoordinate, combo: number) => void;
  private onComboUpdate?: (combo: number) => void;
  private onEventTriggered?: (eventName: string, description: string) => void;
  private onNewRecord?: (newRecord: number) => void;

  // Timing
  public lastTickTime = 0;
  public tickInterval = 105; // ms per move (fast, responsive, smooth)
  private isRunning = false;

  constructor(options: GameEngineOptions = {}) {
    this.cols = options.cols || 32;
    this.rows = options.rows || 48;
    this.onScoreUpdate = options.onScoreUpdate;
    this.onGiftApplied = options.onGiftApplied;
    this.onSendAck = options.onSendAck;
    this.onAppleEaten = options.onAppleEaten;
    this.onComboUpdate = options.onComboUpdate;
    this.onEventTriggered = options.onEventTriggered;
    this.onNewRecord = options.onNewRecord;

    this.reset();
  }

  /**
   * Recalculates safe max length dynamically based on arena dimensions.
   * Prevents snake from occupying the entire map and choking the game.
   */
  public getMaxSafeLength(): number {
    return Math.max(40, Math.floor(this.cols * this.rows * 0.38));
  }

  /**
   * 70% threshold of the maximum safe length
   */
  public getThreshold70(): number {
    return Math.floor(this.getMaxSafeLength() * 0.70);
  }

  public reset(): void {
    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);

    this.snake = [
      { x: startX, y: startY },
      { x: startX, y: startY + 1 },
      { x: startX, y: startY + 2 },
      { x: startX, y: startY + 3 },
      { x: startX, y: startY + 4 },
    ];
    this.prevSnake = this.snake.map((p) => ({ ...p }));
    this.apples = [];
    this.growthPending = 0;
    this.post70ApplesCount = 0;
    this.activeEffects = [];
    this.comboCount = 0;
    this.targetApple = null;
    this.isSurvivalMode = false;
    this.isAlert = false;
    this.isDissolving = false;

    // Ensure initial regular/rare apples appear naturally in expanded arena
    this.ensureApplesCount(7);
  }

  public start(): void {
    this.isRunning = true;
    this.lastTickTime = performance.now();
    this.lastOccasionalEventTime = performance.now();
  }

  public stop(): void {
    this.isRunning = false;
  }

  /**
   * Main game tick executed at fixed intervals
   */
  public tick(now: number): void {
    if (!this.isRunning) return;

    // Handle soft dissolution animation
    if (this.isDissolving) {
      if (now - this.dissolveStartTime >= this.dissolveDurationMs) {
        this.isDissolving = false;
        this.reset();
      }
      return;
    }

    // Prune expired effects
    this.activeEffects = this.activeEffects.filter((e) => now - e.startedAt < e.durationMs);

    // Combo expiration check
    if (this.comboCount > 0 && now - this.lastAppleEatenTime > this.comboTimeoutMs) {
      this.comboCount = 0;
      if (this.onComboUpdate) {
        this.onComboUpdate(0);
      }
    }

    // Occasional natural arena events
    if (now - this.lastOccasionalEventTime > this.occasionalEventIntervalMs) {
      this.lastOccasionalEventTime = now;
      this.triggerOccasionalEvent(now);
    }

    // Dynamic speed based on effects (e.g. donut or speed boost)
    let currentInterval = this.tickInterval;
    const hasSpeedBoost = this.activeEffects.some((e) => e.type === 'speed' || e.type === 'frenzy');
    if (hasSpeedBoost) {
      currentInterval = Math.round(this.tickInterval * 0.76); // 24% faster
    }

    if (now - this.lastTickTime < currentInterval) {
      return;
    }

    this.lastTickTime = now;

    // Keep previous snake positions for smooth 60fps rendering interpolation
    this.prevSnake = this.snake.map((p) => ({ ...p }));

    // Ensure baseline apples are present
    this.ensureApplesCount(7);

    // AI computes next safe coordinate and context
    const aiResult = decideAIMove({
      cols: this.cols,
      rows: this.rows,
      snake: this.snake,
      apples: this.apples,
    });

    this.targetApple = aiResult.targetApple;
    this.isSurvivalMode = aiResult.isSurvivalMode;
    this.isAlert = aiResult.isAlert;

    if (!aiResult.nextMove) {
      // Soft death / dissolution animation
      this.isDissolving = true;
      this.dissolveStartTime = now;
      return;
    }

    const nextHead = aiResult.nextMove;

    // Move head
    this.snake.unshift(nextHead);

    // Check if apple eaten
    const appleIndex = this.apples.findIndex((a) => a.x === nextHead.x && a.y === nextHead.y);
    if (appleIndex !== -1) {
      const eatenApple = this.apples.splice(appleIndex, 1)[0];
      this.handleAppleEaten(eatenApple, nextHead, now);
    }

    // Handle growth or tail pop
    if (this.growthPending > 0) {
      this.growthPending--;
    } else {
      this.snake.pop();
    }
  }

  private handleAppleEaten(apple: GameApple, pos: SnakeCoordinate, now = performance.now()): void {
    this.applesCollected++;

    // Update Combo system
    if (now - this.lastAppleEatenTime <= this.comboTimeoutMs) {
      this.comboCount = Math.min(10, this.comboCount + 1);
    } else {
      this.comboCount = 1;
    }
    this.lastAppleEatenTime = now;

    if (this.onComboUpdate) {
      this.onComboUpdate(this.comboCount);
    }

    // Combo multiplier: x1 = 1x, x2 = 1.25x, x3 = 1.5x, ..., x5+ = 2x+
    const comboMultiplier = this.comboCount > 1 ? 1 + (this.comboCount - 1) * 0.25 : 1.0;

    // Active effects multiplier
    let effectMultiplier = 1.0;
    for (const effect of this.activeEffects) {
      effectMultiplier *= effect.multiplier;
    }

    const earnedPoints = Math.round(apple.points * effectMultiplier * comboMultiplier);
    this.score += earnedPoints;

    // Record breaker trigger
    if (this.score > this.recordScore) {
      const isFirstBreak = this.recordScore > 0 && !this.hasAnnouncedRecord;
      this.recordScore = this.score;
      if (isFirstBreak) {
        this.hasAnnouncedRecord = true;
        if (this.onNewRecord) {
          this.onNewRecord(this.recordScore);
        }
      }
    }

    // Special Apple Agility bonus (if special_green)
    if (apple.type === 'special_green') {
      this.activeEffects.push({
        id: `effect_green_${now}`,
        name: 'Agilidade Esmeralda',
        type: 'speed',
        durationMs: 5000,
        startedAt: now,
        multiplier: 1.2,
      });
    }

    // Progressive growth algorithm:
    // 1. Until reaching 70% of maxSafeLength: standard growth (+1 regular/green, +2 golden, +4 galaxy/giant).
    // 2. Beyond 70%: decelerate drastically. Every ~20 apples collected = +1% of maxSafeLength.
    // 3. Absolute safety ceiling at maxSafeLength to keep arena open and playable.
    const maxSafe = this.getMaxSafeLength();
    const threshold70 = this.getThreshold70();
    const currentLength = this.snake.length + this.growthPending;

    if (currentLength < threshold70) {
      // Normal growth up to 70% threshold
      const rawGrowth =
        apple.type === 'galaxy' || apple.type === 'giant' ? 4 : apple.type === 'golden' ? 2 : 1;
      const spaceTo70 = threshold70 - currentLength;
      this.growthPending += Math.min(rawGrowth, spaceTo70);
    } else if (currentLength < maxSafe) {
      // At or above 70%: 20 apples collected = +1% of maxSafe length
      this.post70ApplesCount++;
      if (this.post70ApplesCount >= 20) {
        this.post70ApplesCount = 0;
        const growth1Pct = Math.max(1, Math.round(maxSafe * 0.01));
        const spaceToMax = maxSafe - currentLength;
        this.growthPending += Math.min(growth1Pct, spaceToMax);
      }
    } else {
      // At max safe capacity: stop adding length to preserve navigation space
      this.growthPending = 0;
    }

    if (this.onAppleEaten) {
      this.onAppleEaten(apple, pos, this.comboCount);
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.applesCollected, this.recordScore);
    }
  }

  /**
   * Spawns bonus apples from TikTok gifts
   */
  public processGift(gift: GiftEvent): void {
    console.log(`[GAME] ${gift.eventId} received`);

    const reward = evaluateGiftReward(
      gift.giftId,
      gift.giftName,
      gift.giftCount,
      gift.diamondCount
    );

    // 1. Add regular apples
    if (reward.applesToAdd > 0) {
      this.spawnRandomApples(reward.applesToAdd, 'regular', 10, '#ef4444');
    }

    // 2. Add golden apples
    if (reward.goldenApplesToAdd > 0) {
      this.spawnRandomApples(reward.goldenApplesToAdd, 'golden', 75, '#eab308');
    }

    // 3. Add galaxy apples
    if (reward.galaxyApplesToAdd > 0) {
      this.spawnRandomApples(reward.galaxyApplesToAdd, 'galaxy', 150, '#a855f7');
    }

    // 4. Activate special effect if configured
    if (reward.effectType && reward.effectDurationMs) {
      this.activeEffects.push({
        id: `effect_${Date.now()}_${gift.eventId}`,
        name: reward.effectName || reward.bannerTitle,
        type: reward.effectType,
        durationMs: reward.effectDurationMs,
        startedAt: performance.now(),
        multiplier: reward.pointsMultiplier || 1.0,
      });
    }

    this.giftsProcessed++;
    console.log(`[GAME] ${gift.eventId} applied`);

    if (this.onGiftApplied) {
      this.onGiftApplied(gift, reward.effectName || reward.bannerTitle);
    }

    // 5. CRITICAL: Send ACK back to Backend to verify end-to-end completion!
    if (this.onSendAck) {
      this.onSendAck(gift.eventId);
    }
  }

  /**
   * Occasional natural arena events during LIVE broadcasts
   */
  private triggerOccasionalEvent(now: number): void {
    // Only trigger if no galaxy super-effect is active
    if (this.activeEffects.some((e) => e.type === 'galaxy')) return;

    const events = ['chuva', 'golden_rush', 'maca_gigante', 'frenesi', 'super_maca'] as const;
    const chosen = events[Math.floor(Math.random() * events.length)];

    if (chosen === 'chuva') {
      this.spawnRandomApples(8, 'regular', 10, '#ef4444');
      if (this.onEventTriggered) {
        this.onEventTriggered('🌧️ Chuva de Maçãs!', '8 maçãs extras caíram na arena');
      }
    } else if (chosen === 'golden_rush') {
      this.spawnRandomApples(3, 'golden', 75, '#eab308');
      if (this.onEventTriggered) {
        this.onEventTriggered('🌟 Golden Rush!', '3 maçãs douradas raras apareceram');
      }
    } else if (chosen === 'maca_gigante') {
      this.spawnGiantApple();
      if (this.onEventTriggered) {
        this.onEventTriggered('👑 Maçã Gigante!', 'Uma maçã colossal de 250 pontos surgiu');
      }
    } else if (chosen === 'frenesi') {
      this.activeEffects.push({
        id: `frenzy_${now}`,
        name: '🔥 Frenesi!',
        type: 'frenzy',
        durationMs: 12000,
        startedAt: now,
        multiplier: 2.0,
      });
      this.spawnRandomApples(4, 'special_green', 35, '#10b981');
      if (this.onEventTriggered) {
        this.onEventTriggered('🔥 Frenesi Ativado!', 'Pontos em dobro e agilidade por 12s');
      }
    } else if (chosen === 'super_maca') {
      this.spawnRandomApples(2, 'special_green', 35, '#10b981');
      this.spawnRandomApples(1, 'golden', 75, '#eab308');
      if (this.onEventTriggered) {
        this.onEventTriggered('🍏 Super Maçã!', 'Maçãs especiais esmeralda e ouro surgiram');
      }
    }
  }

  /**
   * Spawns a Giant Apple (1.8x size, 250 pts)
   */
  public spawnGiantApple(): void {
    const occupied = new Set<string>();
    for (const seg of this.snake) occupied.add(`${seg.x},${seg.y}`);
    for (const a of this.apples) occupied.add(`${a.x},${a.y}`);

    const freeCells: SnakeCoordinate[] = [];
    for (let x = 2; x < this.cols - 2; x++) {
      for (let y = 2; y < this.rows - 2; y++) {
        if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
      }
    }

    if (freeCells.length === 0) return;
    const cell = freeCells[Math.floor(Math.random() * freeCells.length)];

    this.apples.push({
      id: `giant_${Date.now()}`,
      x: cell.x,
      y: cell.y,
      type: 'giant',
      points: 250,
      createdAt: performance.now(),
      color: '#ec4899',
      sizeMultiplier: 1.8,
    });
  }

  /**
   * Spawns apples on free tiles
   */
  private spawnRandomApples(
    count: number,
    type: AppleType,
    points: number,
    color: string,
    sizeMultiplier?: number
  ): void {
    const occupied = new Set<string>();
    for (const seg of this.snake) {
      occupied.add(`${seg.x},${seg.y}`);
    }
    for (const apple of this.apples) {
      occupied.add(`${apple.x},${apple.y}`);
    }

    // Collect all available free coordinates
    const freeCells: SnakeCoordinate[] = [];
    for (let x = 1; x < this.cols - 1; x++) {
      for (let y = 1; y < this.rows - 1; y++) {
        if (!occupied.has(`${x},${y}`)) {
          freeCells.push({ x, y });
        }
      }
    }

    if (freeCells.length === 0) return;

    // Shuffle and pick
    const spawnCount = Math.min(count, freeCells.length);
    for (let i = 0; i < spawnCount; i++) {
      const randIndex = Math.floor(Math.random() * freeCells.length);
      const cell = freeCells.splice(randIndex, 1)[0];

      this.apples.push({
        id: `apple_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        x: cell.x,
        y: cell.y,
        type,
        points,
        createdAt: performance.now(),
        color,
        sizeMultiplier,
      });
    }
  }

  private ensureApplesCount(minCount: number): void {
    if (this.apples.length < minCount) {
      const needed = minCount - this.apples.length;
      for (let i = 0; i < needed; i++) {
        const rand = Math.random();
        if (rand < 0.10) {
          // 10% special green
          this.spawnRandomApples(1, 'special_green', 35, '#10b981');
        } else if (rand < 0.16) {
          // 6% golden
          this.spawnRandomApples(1, 'golden', 75, '#eab308');
        } else {
          // Regular
          this.spawnRandomApples(1, 'regular', 10, '#ef4444');
        }
      }
    }
  }
}
