/**
 * Discreet status indicator pills for live broadcast viewers & streamer
 */

import React from 'react';
import { SystemStatus } from '../../shared/types.ts';

interface LiveStatusPillsProps {
  status: SystemStatus | null;
  wsConnected: boolean;
}

export const LiveStatusPills: React.FC<LiveStatusPillsProps> = ({ status, wsConnected }) => {
  const isTermux = status?.termuxConnected;
  const isTiktok = status?.tiktokConnected;
  const isLive = status?.live;
  const realGifts = status?.realGiftEvents || 0;

  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-mono select-none">
      {/* Backend */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Backend: OK
      </span>

      {/* WebSocket */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-800">
        <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
        WS: {wsConnected ? 'Ativo' : 'Off'}
      </span>

      {/* Termux */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-800">
        <span className={`w-1.5 h-1.5 rounded-full ${isTermux ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        Termux: {isTermux ? 'Conectado' : 'Aguardando'}
      </span>

      {/* TikTok LIVE */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-800">
        <span className={`w-1.5 h-1.5 rounded-full ${isLive && isTiktok ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
        LIVE @rainz878: {isLive ? 'ONLINE' : 'OFFLINE'}
      </span>

      {/* Real Gifts Status */}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
        realGifts > 0
          ? 'bg-purple-950/70 text-purple-200 border-purple-800'
          : 'bg-amber-950/70 text-amber-200 border-amber-800'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${realGifts > 0 ? 'bg-purple-400' : 'bg-amber-400'}`} />
        {realGifts > 0
          ? `Presentes Reais: ${realGifts}`
          : '🟡 AGUARDANDO 1 PRESENTE REAL'}
      </span>
    </div>
  );
};
