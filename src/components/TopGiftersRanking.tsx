/**
 * Session Top Gifters Leaderboard
 * Only uses verified real gifts from the session (no fake users)
 */

import { Crown, Gift } from 'lucide-react';
import React from 'react';
import { TopGifter } from '../../shared/types.ts';

interface TopGiftersRankingProps {
  topGifters: TopGifter[];
}

export const TopGiftersRanking: React.FC<TopGiftersRankingProps> = ({ topGifters }) => {
  if (!topGifters || topGifters.length === 0) {
    return (
      <div className="w-full bg-slate-900/60 backdrop-blur-md rounded-2xl p-3 border border-slate-800 text-center">
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-purple-400" />
          Aguardando os primeiros presentes da LIVE para formar o placar!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          Top Presenteadores da Sessão
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">
          {topGifters.length} apoiador(es)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {topGifters.slice(0, 4).map((gifter, index) => (
          <div
            key={gifter.username}
            className="flex items-center gap-2.5 bg-slate-800/60 p-2 rounded-xl border border-slate-700/60"
          >
            {/* Rank badge */}
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                index === 0
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/30'
                  : index === 1
                  ? 'bg-slate-300 text-slate-950'
                  : index === 2
                  ? 'bg-amber-700 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {index + 1}
            </span>

            {/* Avatar */}
            {gifter.profilePicture ? (
              <img
                src={gifter.profilePicture}
                alt={gifter.nickname}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                {gifter.username.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Names */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {gifter.nickname || gifter.username}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                @{gifter.username}
              </p>
            </div>

            {/* Score */}
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-purple-300">
                {gifter.totalDiamonds} 💎
              </p>
              <p className="text-[10px] text-slate-400">
                {gifter.totalGifts} presente(s)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
