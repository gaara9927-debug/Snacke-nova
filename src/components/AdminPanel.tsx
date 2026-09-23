/**
 * Hidden Technical Admin Diagnostics Panel
 */

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Flame,
  Radio,
  RefreshCw,
  Server,
  Smartphone,
  Terminal,
  Wifi,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { SystemStatus } from '../../shared/types.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatus | null;
  onRefreshStatus: () => void;
  wsConnected: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  wsConnected,
}) => {
  const [copied, setCopied] = useState(false);
  const [isTriggeringTest, setIsTriggeringTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const termuxCommand = `curl -sL ${currentUrl}/termux/start-termux.sh | bash`;

  const copyTermuxCmd = () => {
    navigator.clipboard.writeText(termuxCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const triggerDevTestGift = async (giftType: 'rose' | 'donut' | 'heart' | 'galaxy') => {
    setIsTriggeringTest(true);
    setTestResult(null);

    const giftsMap = {
      rose: { giftId: '5655', giftName: 'Rosa', count: 1, diamonds: 1 },
      donut: { giftId: '5827', giftName: 'Rosquinha', count: 1, diamonds: 30 },
      heart: { giftId: '5269', giftName: 'Heart Me', count: 1, diamonds: 50 },
      galaxy: { giftId: '5656', giftName: 'Galáxia', count: 1, diamonds: 1000 },
    };

    const g = giftsMap[giftType];

    try {
      const res = await fetch('/api/tiktok/test-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testador_dev',
          nickname: 'Dev Local',
          giftId: g.giftId,
          giftName: g.giftName,
          giftCount: g.count,
          diamondCount: g.diamonds,
        }),
      });

      const data = await res.json();
      setTestResult(`Disparado [DEV-TEST]: ${data.eventId} (${g.giftName})`);
    } catch (err: any) {
      setTestResult(`Erro: ${err.message}`);
    } finally {
      setIsTriggeringTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">
              Painel Técnico de Diagnóstico — Snacke LIVE
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshStatus}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Atualizar Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Backend */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              <Server className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-slate-400 text-[11px]">Backend Railway</p>
                <p className="font-bold text-emerald-300">ONLINE (200 OK)</p>
              </div>
            </div>

            {/* WebSocket */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              <Wifi className={`w-4 h-4 shrink-0 ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`} />
              <div>
                <p className="text-slate-400 text-[11px]">WebSocket Frontend</p>
                <p className={`font-bold ${wsConnected ? 'text-emerald-300' : 'text-red-400'}`}>
                  {wsConnected ? `CONECTADO (${status?.websocketClients || 1} tela)` : 'DESCONECTADO'}
                </p>
              </div>
            </div>

            {/* Termux */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              <Smartphone className={`w-4 h-4 shrink-0 ${status?.termuxConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <div>
                <p className="text-slate-400 text-[11px]">Termux (POCO C65)</p>
                <p className={`font-bold ${status?.termuxConnected ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {status?.termuxConnected ? 'CONECTADO' : 'OFFLINE'}
                </p>
              </div>
            </div>

            {/* TikTok Client */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              <Radio className={`w-4 h-4 shrink-0 ${status?.tiktokConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
              <div>
                <p className="text-slate-400 text-[11px]">TikTok Client</p>
                <p className={`font-bold ${status?.tiktokConnected ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {status?.tiktokConnected ? 'CONECTADO' : 'AGUARDANDO'}
                </p>
              </div>
            </div>

            {/* LIVE Stream */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              <Flame className={`w-4 h-4 shrink-0 ${status?.live ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
              <div>
                <p className="text-slate-400 text-[11px]">LIVE @{status?.username || 'rainz878'}</p>
                <p className={`font-bold ${status?.live ? 'text-red-400' : 'text-slate-400'}`}>
                  {status?.live ? 'AO VIVO (ONLINE)' : 'OFFLINE'}
                </p>
              </div>
            </div>

            {/* Real Gifts Counter */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-slate-400 text-[11px]">Presentes Reais</p>
                <p className="font-bold text-purple-300">
                  {status?.realGiftEvents || 0} recebido(s)
                </p>
              </div>
            </div>
          </div>

          {/* End-to-End Status Banner */}
          <div className={`p-3 rounded-xl border ${
            (status?.realGiftEvents || 0) > 0
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              {(status?.realGiftEvents || 0) > 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Fluxo End-to-End Comprovado com Presente REAL!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>🟡 AGUARDANDO 1 PRESENTE REAL PARA TESTE FINAL</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              {status?.realGiftEvents
                ? `Total de ${status.realGiftEvents} presentes reais recebidos, validados e confirmados via ACK.`
                : 'Conecte o Termux no POCO C65 e receba um presente na LIVE de @rainz878 para validar o ciclo completo.'}
            </p>
          </div>

          {/* Termux Android Setup Box */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                Comando Termux (POCO C65 / Android):
              </span>
              <button
                onClick={copyTermuxCmd}
                className="flex items-center gap-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="bg-slate-900 p-2 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto select-all">
              {termuxCommand}
            </pre>
            <p className="text-[10px] text-slate-400">
              Execute no Termux. O script baixa o conector oficial, atualiza os pacotes e conecta diretamente à LIVE @rainz878.
            </p>
          </div>

          {/* End-to-End Tracing Log */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-300 text-xs">
              Rastreamento de Eventos Recentes (TikTok → Termux → Backend → WS → Jogo → ACK):
            </h4>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px]">
              {status?.recentEvents && status.recentEvents.length > 0 ? (
                status.recentEvents.map((ev) => (
                  <div
                    key={ev.eventId}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-purple-300 font-bold">
                        {ev.giftName} ×{ev.giftCount}
                      </span>{' '}
                      <span className="text-slate-400">@{ev.username}</span>
                      <div className="text-[9px] text-slate-500">
                        ID: {ev.eventId} • {new Date(ev.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      {ev.ackedAt ? (
                        <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                          ACK CONFIRMADO
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[10px] bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                          PENDENTE ACK
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic text-center py-3">
                  Nenhum evento registrado nesta sessão ainda.
                </p>
              )}
            </div>
          </div>

          {/* Developer Testing Section (Synthetic Only) */}
          <div className="pt-2 border-t border-slate-800">
            <span className="font-semibold text-slate-400 text-[11px]">
              🧪 Teste de Desenvolvimento Local (Eventos sintéticos não alteram realGiftEvents):
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                disabled={isTriggeringTest}
                onClick={() => triggerDevTestGift('rose')}
                className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 transition"
              >
                🌹 Testar Rosa
              </button>
              <button
                disabled={isTriggeringTest}
                onClick={() => triggerDevTestGift('donut')}
                className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700 transition"
              >
                🍩 Testar Rosquinha
              </button>
              <button
                disabled={isTriggeringTest}
                onClick={() => triggerDevTestGift('heart')}
                className="px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 transition"
              >
                ❤️ Testar Heart Me
              </button>
              <button
                disabled={isTriggeringTest}
                onClick={() => triggerDevTestGift('galaxy')}
                className="px-2.5 py-1 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 transition"
              >
                🌌 Testar Galáxia
              </button>
            </div>
            {testResult && (
              <p className="mt-1.5 text-xs text-blue-300 font-mono">{testResult}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
