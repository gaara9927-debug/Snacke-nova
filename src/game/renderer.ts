/**
 * Canvas Renderer for Snacke LIVE
 * 
 * High performance 60 FPS canvas renderer with:
 * - Fluid, sleek emerald green snake with organic segment bridges
 * - Expressive head with dynamic eye-tracking toward pursued apple
 * - Alert expressions (widened eyes, warning glint) when near obstacles
 * - Minimalist digestion swallow animation (bite pop + traveling rounded bulge)
 * - Soft dissolution / fade death animation
 * - Dynamic combo badges (🔥 x2, x3...)
 * - Deep space galaxy atmosphere with subtle stars
 * - Optimized for mobile POCO C65 (battery-friendly, zero garbage collection)
 */

import { GameApple, SnakeCoordinate } from '../../shared/types.ts';
import { SnakeGameEngine } from './engine.ts';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  scale?: number;
}

interface SwallowBulge {
  startTime: number;
  durationMs: number;
  color: string;
  maxSegments: number;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: SnakeGameEngine;
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  // Bite and digestion swallow animations
  private lastBiteTime = 0;
  private swallowBulges: SwallowBulge[] = [];

  // Static precomputed background star coordinates for Galaxy effect (zero allocations)
  private readonly stars = [
    { x: 0.12, y: 0.18, size: 1.2, speed: 0.003 },
    { x: 0.28, y: 0.35, size: 1.6, speed: 0.004 },
    { x: 0.45, y: 0.15, size: 1.0, speed: 0.002 },
    { x: 0.65, y: 0.25, size: 1.8, speed: 0.005 },
    { x: 0.82, y: 0.12, size: 1.2, speed: 0.003 },
    { x: 0.18, y: 0.62, size: 1.4, speed: 0.004 },
    { x: 0.35, y: 0.78, size: 1.0, speed: 0.002 },
    { x: 0.52, y: 0.55, size: 1.7, speed: 0.005 },
    { x: 0.72, y: 0.68, size: 1.3, speed: 0.003 },
    { x: 0.88, y: 0.82, size: 1.5, speed: 0.004 },
    { x: 0.15, y: 0.42, size: 1.1, speed: 0.003 },
    { x: 0.78, y: 0.44, size: 1.2, speed: 0.004 },
  ];

  constructor(canvas: HTMLCanvasElement, engine: SnakeGameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.engine = engine;
  }

  public addEatenEffect(apple: GameApple, pos: SnakeCoordinate, cellSize: number, combo = 1): void {
    const now = performance.now();
    const cx = (pos.x + 0.5) * cellSize;
    const cy = (pos.y + 0.5) * cellSize;

    // 1. Subtle momentary bite expansion of the head
    this.lastBiteTime = now;

    // 2. Swallow digestion bulge (max 3 concurrent to prevent lag and merge rapid bites)
    if (this.swallowBulges.length >= 3) {
      this.swallowBulges.shift();
    }

    this.swallowBulges.push({
      startTime: now,
      durationMs: 750, // 0.75s smooth transit through segments
      color: apple.color,
      maxSegments: 7.5,
    });

    // 3. Floating score text with combo badge
    const textLabel = combo > 1 ? `+${apple.points} 🔥x${combo}` : `+${apple.points}`;
    this.floatingTexts.push({
      x: cx,
      y: cy - 4,
      text: textLabel,
      color: combo > 1 ? '#fbbf24' : apple.color,
      alpha: 1.0,
      life: 1.0,
      scale: combo > 1 ? 1.2 : 1.0,
    });

    // 4. Gentle celebratory particles (capped for POCO C65 60fps stability)
    const count = apple.type === 'galaxy' ? 12 : apple.type === 'giant' ? 10 : apple.type === 'golden' ? 7 : 4;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.2;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: apple.color,
        size: 2 + Math.random() * 2.5,
        alpha: 1.0,
        life: 1.0,
      });
    }

    // Auto prune particles if exceeding 35 items
    if (this.particles.length > 35) {
      this.particles.splice(0, this.particles.length - 35);
    }
  }

  public render(now: number): void {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const {
      cols,
      rows,
      snake,
      prevSnake,
      apples,
      lastTickTime,
      tickInterval,
      activeEffects,
      targetApple,
      isAlert,
      isDissolving,
      dissolveStartTime,
      dissolveDurationMs,
      comboCount,
    } = this.engine;

    // Sub-cell interpolation factor for silky smooth 60fps animation
    const progress = Math.min(1.0, Math.max(0.0, (now - lastTickTime) / tickInterval));

    const cellSize = Math.min(width / cols, height / rows);
    const arenaW = cols * cellSize;
    const arenaH = rows * cellSize;
    const offsetX = Math.floor((width - arenaW) / 2);
    const offsetY = Math.floor((height - arenaH) / 2);

    // Prune finished swallow bulges
    this.swallowBulges = this.swallowBulges.filter((b) => now - b.startTime < b.durationMs);

    // 1. Draw Background
    const isGalaxyActive = activeEffects.some((e) => e.type === 'galaxy');
    if (isGalaxyActive) {
      // Cosmic deep dark violet gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#070314');
      grad.addColorStop(0.5, '#130a30');
      grad.addColorStop(1, '#070314');
      ctx.fillStyle = grad;
    } else {
      // Sleek deep obsidian background
      ctx.fillStyle = '#05090f';
    }
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // 2. Arena Floor & Subtle Grid
    ctx.fillStyle = isGalaxyActive ? '#0c0721' : '#070c14';
    ctx.fillRect(0, 0, arenaW, arenaH);

    // Discreet twinkling space stars if Galaxy event is active
    if (isGalaxyActive) {
      ctx.save();
      for (const star of this.stars) {
        const sx = star.x * arenaW;
        const sy = star.y * arenaH;
        const twinkle = 0.35 + 0.65 * Math.sin(now * star.speed);
        ctx.fillStyle = `rgba(216, 180, 254, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Subtle Grid Lines
    ctx.strokeStyle = isGalaxyActive ? 'rgba(168, 85, 247, 0.05)' : 'rgba(34, 197, 94, 0.035)';
    ctx.lineWidth = 1;

    for (let c = 0; c <= cols; c += 2) {
      const x = c * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, arenaH);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r += 2) {
      const y = r * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(arenaW, y);
      ctx.stroke();
    }

    // Arena Outer Frame
    ctx.strokeStyle = isGalaxyActive ? 'rgba(168, 85, 247, 0.45)' : 'rgba(34, 197, 94, 0.30)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, arenaW, arenaH);

    // Stylish Corner Brackets (HUD style)
    const bracketLen = Math.min(14, cellSize * 1.3);
    ctx.strokeStyle = isGalaxyActive ? '#c084fc' : '#4ade80';
    ctx.lineWidth = 2.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(0, bracketLen);
    ctx.lineTo(0, 0);
    ctx.lineTo(bracketLen, 0);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(arenaW - bracketLen, 0);
    ctx.lineTo(arenaW, 0);
    ctx.lineTo(arenaW, bracketLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(0, arenaH - bracketLen);
    ctx.lineTo(0, arenaH);
    ctx.lineTo(bracketLen, arenaH);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(arenaW - bracketLen, arenaH);
    ctx.lineTo(arenaW, arenaH);
    ctx.lineTo(arenaW, arenaH - bracketLen);
    ctx.stroke();

    // 3. Render Apples with Vibrant Hover Effect
    const appleHover = Math.sin(now * 0.006) * 1.4;

    for (const apple of apples) {
      const ax = apple.x * cellSize + cellSize / 2;
      const ay = apple.y * cellSize + cellSize / 2 + appleHover;
      const multiplier = apple.sizeMultiplier || 1.0;
      const baseRadius = cellSize * 0.42 * multiplier;
      const fontGlyphSize = Math.max(11, Math.floor(cellSize * 0.70 * multiplier));

      ctx.save();
      // Glow behind special and regular apples
      if (apple.type === 'giant') {
        const glow = ctx.createRadialGradient(ax, ay, 2, ax, ay, baseRadius * 2.4);
        glow.addColorStop(0, 'rgba(236, 72, 153, 0.7)');
        glow.addColorStop(1, 'rgba(236, 72, 153, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ax, ay, baseRadius * 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (apple.type === 'galaxy') {
        const glow = ctx.createRadialGradient(ax, ay, 2, ax, ay, baseRadius * 2.2);
        glow.addColorStop(0, 'rgba(168, 85, 247, 0.65)');
        glow.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ax, ay, baseRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (apple.type === 'golden') {
        const glow = ctx.createRadialGradient(ax, ay, 2, ax, ay, baseRadius * 2.0);
        glow.addColorStop(0, 'rgba(234, 179, 8, 0.6)');
        glow.addColorStop(1, 'rgba(234, 179, 8, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ax, ay, baseRadius * 2.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (apple.type === 'special_green') {
        const glow = ctx.createRadialGradient(ax, ay, 2, ax, ay, baseRadius * 1.9);
        glow.addColorStop(0, 'rgba(16, 185, 129, 0.55)');
        glow.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ax, ay, baseRadius * 1.9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const glow = ctx.createRadialGradient(ax, ay, 1, ax, ay, baseRadius * 1.5);
        glow.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
        glow.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ax, ay, baseRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Apple Circle Background
      ctx.fillStyle = apple.color;
      ctx.beginPath();
      ctx.arc(ax, ay, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Top Icon Emoji / Glyph
      ctx.font = `${fontGlyphSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let emoji = '🍎';
      if (apple.type === 'special_green') emoji = '🍏';
      else if (apple.type === 'golden') emoji = '🌟';
      else if (apple.type === 'donut') emoji = '🍩';
      else if (apple.type === 'galaxy') emoji = '🌌';
      else if (apple.type === 'giant') emoji = '👑';

      ctx.fillText(emoji, ax, ay);
      ctx.restore();
    }

    // 4. Render Beautiful Green Snake
    if (snake.length > 0) {
      // Soft dissolution animation alpha
      let globalSnakeAlpha = 1.0;
      if (isDissolving) {
        const elapsed = now - dissolveStartTime;
        const dissolveProg = Math.min(1.0, elapsed / dissolveDurationMs);
        globalSnakeAlpha = Math.max(0.0, 1.0 - dissolveProg);
      }

      ctx.save();
      ctx.globalAlpha = globalSnakeAlpha;

      // Calculate interpolated positions & bulge expansions
      const points: {
        x: number;
        y: number;
        r: number;
        bulgeIntensity: number;
        bulgeColor: string | null;
      }[] = [];

      for (let i = 0; i < snake.length; i++) {
        const curr = snake[i];
        const prev = prevSnake[i] || curr;
        const ix = prev.x + (curr.x - prev.x) * progress;
        const iy = prev.y + (curr.y - prev.y) * progress;
        const cx = (ix + 0.5) * cellSize;
        const cy = (iy + 0.5) * cellSize;

        // Radius tapers slightly from head to tail
        const taperRatio = 1 - (i / snake.length) * 0.32;
        let segRadius = cellSize * 0.46 * Math.max(0.65, taperRatio);

        // Check for digestion swallow bulge passing through segment `i`
        let bulgeIntensity = 0;
        let bulgeColor: string | null = null;

        for (const bulge of this.swallowBulges) {
          const elapsed = now - bulge.startTime;
          if (elapsed < 0 || elapsed >= bulge.durationMs) continue;

          const t = elapsed / bulge.durationMs; // 0 to 1
          const bulgePos = 0.5 + t * (bulge.maxSegments - 0.5);
          const dist = Math.abs(i - bulgePos);

          if (dist < 1.35) {
            const bell = Math.cos((dist / 1.35) * (Math.PI / 2));
            const absorb = Math.pow(1 - t, 0.75); // gets progressively smaller
            const intensity = bell * absorb;

            if (intensity > bulgeIntensity) {
              bulgeIntensity = intensity;
              bulgeColor = bulge.color;
            }
          }
        }

        // Apply smooth rounded volume expansion (up to 28% max)
        if (bulgeIntensity > 0) {
          segRadius *= 1 + 0.28 * bulgeIntensity;
        }

        points.push({
          x: cx,
          y: cy,
          r: segRadius,
          bulgeIntensity,
          bulgeColor,
        });
      }

      // Step A: Draw fluid connecting body bridges
      for (let i = points.length - 1; i > 0; i--) {
        const p1 = points[i];
        const p2 = points[i - 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.1) {
          const nx = -dy / dist;
          const ny = dx / dist;

          const p1aX = p1.x + nx * p1.r;
          const p1aY = p1.y + ny * p1.r;
          const p1bX = p1.x - nx * p1.r;
          const p1bY = p1.y - ny * p1.r;

          const p2aX = p2.x + nx * p2.r;
          const p2aY = p2.y + ny * p2.r;
          const p2bX = p2.x - nx * p2.r;
          const p2bY = p2.y - ny * p2.r;

          const t = i / points.length;
          const greenVal = Math.round(180 - t * 65);
          ctx.fillStyle = `rgb(22, ${greenVal}, 74)`;

          ctx.beginPath();
          ctx.moveTo(p1aX, p1aY);
          ctx.lineTo(p2aX, p2aY);
          ctx.lineTo(p2bX, p2bY);
          ctx.lineTo(p1bX, p1bY);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Step B: Draw rounded segments with 3D highlights
      for (let i = points.length - 1; i >= 1; i--) {
        const p = points[i];
        const t = i / points.length;

        const red = Math.round(34 - t * 14);
        const green = Math.round(197 - t * 110);
        const blue = Math.round(94 - t * 48);

        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(6, 78, 59, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (p.bulgeIntensity > 0.08 && p.bulgeColor) {
          ctx.save();
          ctx.fillStyle = p.bulgeColor;
          ctx.globalAlpha = p.bulgeIntensity * 0.42;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        const hlRadius = p.r * 0.45;
        const hlGrad = ctx.createRadialGradient(
          p.x - p.r * 0.25,
          p.y - p.r * 0.25,
          1,
          p.x - p.r * 0.25,
          p.y - p.r * 0.25,
          hlRadius
        );
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hlGrad;
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, hlRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Step C: Draw Head (points[0]) with Dynamic Eye Tracking & Alert Expression
      const head = points[0];
      const neck = points[1] || head;
      let dirX = head.x - neck.x;
      let dirY = head.y - neck.y;
      const dirDist = Math.hypot(dirX, dirY);

      if (dirDist > 0.1) {
        dirX /= dirDist;
        dirY /= dirDist;
      } else {
        dirX = 0;
        dirY = -1;
      }

      // Momentary bite pop (<180ms)
      const biteElapsed = now - this.lastBiteTime;
      let headScale = 1.12;
      if (biteElapsed >= 0 && biteElapsed < 180) {
        const biteProgress = biteElapsed / 180;
        const bitePop = Math.sin(biteProgress * Math.PI) * 0.14;
        headScale += bitePop;
      }

      // 1. Head Glow
      const headGlow = ctx.createRadialGradient(head.x, head.y, 2, head.x, head.y, head.r * 1.8);
      headGlow.addColorStop(0, 'rgba(74, 222, 128, 0.35)');
      headGlow.addColorStop(1, 'rgba(74, 222, 128, 0)');
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(head.x, head.y, head.r * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2. Playful Forked Tongue Flick
      const tongueCycle = Math.sin(now * 0.012);
      if (tongueCycle > 0.4 && !isAlert) {
        const tongueDist = head.r * 1.2 + Math.max(0, tongueCycle * head.r * 0.5);
        const tBaseX = head.x + dirX * (head.r * 0.9);
        const tBaseY = head.y + dirY * (head.r * 0.9);
        const tTipX = head.x + dirX * tongueDist;
        const tTipY = head.y + dirY * tongueDist;

        const perpX = -dirY;
        const perpY = dirX;
        const forkSpan = head.r * 0.25;

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tBaseX, tBaseY);
        ctx.lineTo(tTipX, tTipY);
        ctx.lineTo(tTipX + (dirX + perpX) * forkSpan, tTipY + (dirY + perpY) * forkSpan);
        ctx.moveTo(tTipX, tTipY);
        ctx.lineTo(tTipX + (dirX - perpX) * forkSpan, tTipY + (dirY - perpY) * forkSpan);
        ctx.stroke();
      }

      // 3. Head Body Circle with Bright Emerald Gradient
      const headGrad = ctx.createRadialGradient(
        head.x - dirX * head.r * 0.2,
        head.y - dirY * head.r * 0.2,
        2,
        head.x,
        head.y,
        head.r * headScale
      );
      headGrad.addColorStop(0, '#86efac');
      headGrad.addColorStop(0.35, '#22c55e');
      headGrad.addColorStop(0.85, '#16a34a');
      headGrad.addColorStop(1, '#14532d');

      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(head.x, head.y, head.r * headScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 4. Expressive Eyes with Target Apple Tracking & Alert State
      const perpX = -dirY;
      const perpY = dirX;
      const eyeSideOffset = head.r * 0.52;
      const eyeFwdOffset = head.r * 0.22;
      // Alert state widens eyes slightly
      const eyeRadius = isAlert ? head.r * 0.36 : head.r * 0.32;

      const eye1X = head.x + dirX * eyeFwdOffset + perpX * eyeSideOffset;
      const eye1Y = head.y + dirY * eyeFwdOffset + perpY * eyeSideOffset;
      const eye2X = head.x + dirX * eyeFwdOffset - perpX * eyeSideOffset;
      const eye2Y = head.y + dirY * eyeFwdOffset - perpY * eyeSideOffset;

      // Eye whites
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
      ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isAlert ? '#b91c1c' : '#064e3b';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Target Apple Tracking for Pupils
      let lookDirX = dirX;
      let lookDirY = dirY;

      if (targetApple) {
        const applePixelX = (targetApple.x + 0.5) * cellSize;
        const applePixelY = (targetApple.y + 0.5) * cellSize;
        let toAppleX = applePixelX - head.x;
        let toAppleY = applePixelY - head.y;
        const toAppleDist = Math.hypot(toAppleX, toAppleY);

        if (toAppleDist > 1) {
          toAppleX /= toAppleDist;
          toAppleY /= toAppleDist;
          // Smooth blend: 40% forward direction, 60% apple tracking direction
          lookDirX = dirX * 0.4 + toAppleX * 0.6;
          lookDirY = dirY * 0.4 + toAppleY * 0.6;
          const blendDist = Math.hypot(lookDirX, lookDirY);
          if (blendDist > 0.1) {
            lookDirX /= blendDist;
            lookDirY /= blendDist;
          }
        }
      }

      const pupilShift = eyeRadius * 0.38;
      // In alert state, pupil is slightly smaller (surprised/alert look)
      const pupilRadius = isAlert ? eyeRadius * 0.45 : eyeRadius * 0.55;
      const p1X = eye1X + lookDirX * pupilShift;
      const p1Y = eye1Y + lookDirY * pupilShift;
      const p2X = eye2X + lookDirX * pupilShift;
      const p2Y = eye2Y + lookDirY * pupilShift;

      ctx.fillStyle = '#022c22';
      ctx.beginPath();
      ctx.arc(p1X, p1Y, pupilRadius, 0, Math.PI * 2);
      ctx.arc(p2X, p2Y, pupilRadius, 0, Math.PI * 2);
      ctx.fill();

      // Glossy Eye Glint
      const glintRadius = pupilRadius * 0.42;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p1X - lookDirX * 1 - perpX * 1, p1Y - lookDirY * 1 - perpY * 1, glintRadius, 0, Math.PI * 2);
      ctx.arc(p2X - lookDirX * 1 + perpX * 1, p2Y - lookDirY * 1 + perpY * 1, glintRadius, 0, Math.PI * 2);
      ctx.fill();

      // Alert marker (subtle discrete yellow exclamation near head)
      if (isAlert) {
        ctx.save();
        ctx.font = `bold ${Math.max(12, Math.floor(cellSize * 0.7))}px monospace`;
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText('!', head.x + perpX * (head.r * 1.2), head.y + perpY * (head.r * 1.2) - 6);
        ctx.restore();
      }

      // Combo badge floating discretely near the snake's head
      if (comboCount > 1) {
        ctx.save();
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`🔥x${comboCount}`, head.x, head.y - head.r * 1.4);
        ctx.restore();
      }

      ctx.restore();
    }

    // 5. Update & Render Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.035;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Update & Render Floating Score Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.85;
      ft.life -= 0.028;
      ft.alpha = Math.max(0, ft.life);

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      const fontSize = ft.scale && ft.scale > 1 ? 'bold 14px' : 'bold 12px';
      ctx.font = `${fontSize} monospace, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }
}
