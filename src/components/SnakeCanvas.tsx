/**
 * Snake Canvas component managing GameEngine & Canvas Renderer
 * 
 * Features:
 * - Substantially expanded real arena (32 cols x 48 rows = 1,536 cells)
 * - Auto-adaptive responsive resizing for mobile phones (POCO C65 / Android)
 * - Dynamic combo badge, eye tracking, alert indicators, and ambient events
 * - Rock-solid 60 FPS performance with capped DPR and ResizeObserver
 */

import React, { useEffect, useRef } from 'react';
import { GameApple, GiftEvent, SnakeCoordinate } from '../../shared/types.ts';
import { SnakeGameEngine } from '../game/engine.ts';
import { GameRenderer } from '../game/renderer.ts';

interface SnakeCanvasProps {
  onScoreUpdate: (score: number, apples: number, record: number) => void;
  onGiftApplied: (gift: GiftEvent, effectName?: string) => void;
  onSendAck: (eventId: string) => void;
  incomingGift: GiftEvent | null;
  onComboUpdate?: (combo: number) => void;
  onEventTriggered?: (eventName: string, description: string) => void;
  onNewRecord?: (newRecord: number) => void;
}

export const SnakeCanvas: React.FC<SnakeCanvasProps> = ({
  onScoreUpdate,
  onGiftApplied,
  onSendAck,
  incomingGift,
  onComboUpdate,
  onEventTriggered,
  onNewRecord,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SnakeGameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const lastProcessedGiftId = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Substantially expanded real arena (32 cols x 48 rows = 1,536 cells)
    const cols = 32;
    const rows = 48;

    const engine = new SnakeGameEngine({
      cols,
      rows,
      onScoreUpdate,
      onGiftApplied,
      onSendAck,
      onComboUpdate,
      onEventTriggered,
      onNewRecord,
      onAppleEaten: (apple: GameApple, pos: SnakeCoordinate, combo: number) => {
        if (rendererRef.current && canvasRef.current) {
          const cellSize = Math.min(
            canvasRef.current.width / cols,
            canvasRef.current.height / rows
          );
          rendererRef.current.addEatenEffect(apple, pos, cellSize, combo);
        }
      },
    });

    const renderer = new GameRenderer(canvas, engine);
    engineRef.current = engine;
    rendererRef.current = renderer;

    engine.start();

    // High performance animation loop
    let animId: number;
    const loop = (now: number) => {
      engine.tick(now);
      renderer.render(now);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    // Responsive Canvas Resize handling DPR and container size
    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Cap dpr at 2 for POCO C65 and mobile battery efficiency at 60 FPS
      const targetDpr = Math.min(dpr, 2);
      const newWidth = Math.floor(rect.width * targetDpr);
      const newHeight = Math.floor(rect.height * targetDpr);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ResizeObserver for dynamic container adjustments on mobile
    const ro = new ResizeObserver(() => {
      resizeCanvas();
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      engine.stop();
      window.removeEventListener('resize', resizeCanvas);
      ro.disconnect();
    };
  }, []);

  // Process incoming gifts when received
  useEffect(() => {
    if (!incomingGift || !engineRef.current) return;
    if (lastProcessedGiftId.current === incomingGift.eventId) return;

    lastProcessedGiftId.current = incomingGift.eventId;
    engineRef.current.processGift(incomingGift);
  }, [incomingGift]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 flex items-center justify-center p-1 sm:p-2 min-h-0"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[460px] max-h-[76vh] aspect-[2/3] rounded-2xl shadow-2xl border border-emerald-950/40 bg-slate-950 select-none touch-none"
      />
    </div>
  );
};
