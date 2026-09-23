/**
 * Header displaying live score, apples count, record, combo badge, and quick status
 */

import { Activity, Apple, Flame, Gift, Trophy } from 'lucide-react';
import React from 'react';
import { SystemStatus } from '../../shared/types.ts';

interface ScoreHeaderProps {
  score: number;
  applesCollected: number;
  recordScore: number;
  realGiftsCount: number;
  combo?: number;
  status: SystemStatus | null;
  onOpenAdmin: () => void;
}

export const ScoreHeader: React.FC<ScoreHeaderProps> = ({
  score,
  applesCollected,
  recordScore,
  realGiftsCount,
  combo = 0,
  status,
  onOpenAdmin,
}) => {
  const isLive = status?.live && status?.tiktokConnected;
  const isTermuxOn = status?.termuxConnected;

  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 shrink-0">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-1.5">
        {/* Brand & Live Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 bg-slate-800/85 px-2 py-1 rounded-full border border-slate-700 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                isLive
                  ? 'bg-red-500 animate-pulse'
                  : isTermuxOn
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-[10px] font-bold tracking-tight text-white">
              {isLive ? 'LIVE ON' : isTermuxOn ? 'TERMUX ON' : 'STANDBY'}
            </span>
          </div>

          <div className="text-left leading-tight min-w-0">
            <h1 className="text-xs font-bold text-slate-100 flex items-center gap-1 truncate">
              🐍 Snacke LIVE
            </h1>
            <p className="text-[10px] text-slate-400 font-mono truncate">@rainz878</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Combo Badge (if active) */}
          {combo > 1 && (
            <div className="flex items-center gap-0.5 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/50 text-amber-300 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-black">x{combo}</span>
            </div>
          )}

          {/* Apples */}
          <div className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/60" title="Maçãs Coletadas">
            <Apple className="w-3 h-3 text-rose-400" />
            <span className="text-xs font-bold text-slate-200">{applesCollected}</span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/60" title="Pontos da Partida">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">{score}</span>
          </div>

          {/* Record */}
          {recordScore > 0 && (
            <div className="hidden sm:flex items-center gap-1 bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-500/30" title="Recorde da Sessão">
              <span className="text-xs">👑</span>
              <span className="text-xs font-bold text-amber-200">{recordScore}</span>
            </div>
          )}

          {/* Real Gifts Count */}
          <div className="flex items-center gap-1 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/60" title="Presentes Reais Recebidos">
            <Gift className="w-3 h-3 text-purple-400" />
            <span className="text-xs font-bold text-purple-300">{realGiftsCount}</span>
          </div>

          {/* Admin Diagnostics Trigger */}
          <button
            onClick={onOpenAdmin}
            title="Diagnóstico Técnico & Termux"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
          >
            <Activity className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
