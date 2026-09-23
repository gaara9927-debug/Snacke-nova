/**
 * Snacke LIVE — Main Application Entry Point
 * Designed for TikTok LIVE broadcasts of @rainz878
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GiftEvent, SystemStatus, TopGifter, WSClientMessage, WSServerMessage } from '../shared/types.ts';
import { AdminPanel } from './components/AdminPanel.tsx';
import { GiftBanner } from './components/GiftBanner.tsx';
import { LiveStatusPills } from './components/LiveStatusPills.tsx';
import { ScoreHeader } from './components/ScoreHeader.tsx';
import { SnakeCanvas } from './components/SnakeCanvas.tsx';
import { TopGiftersRanking } from './components/TopGiftersRanking.tsx';

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  const [score, setScore] = useState(0);
  const [applesCollected, setApplesCollected] = useState(0);
  const [recordScore, setRecordScore] = useState(0);

  // Active gift notification banner
  const [currentGiftBanner, setCurrentGiftBanner] = useState<GiftEvent | null>(null);
  const [currentEffectName, setCurrentEffectName] = useState<string | undefined>(undefined);
  const [combo, setCombo] = useState(0);
  const [ambientEvent, setAmbientEvent] = useState<{ name: string; description: string } | null>(null);
  const [recordAlert, setRecordAlert] = useState<number | null>(null);

  // Next gift to pass into the canvas game engine
  const [incomingGiftForEngine, setIncomingGiftForEngine] = useState<GiftEvent | null>(null);

  // Admin Diagnostics Modal
  const [adminOpen, setAdminOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const giftBannerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventBannerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordBannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch initial status via REST
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/tiktok/status');
      if (res.ok) {
        const data: SystemStatus = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn('[STATUS] Não foi possível consultar status REST:', err);
    }
  }, []);

  // 2. Setup WebSocket with auto-reconnection
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isMounted = true;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log(`[WS] Conectando a ${wsUrl}...`);
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMounted) return;
        console.log('[WS] Conexão WebSocket estabelecida com o servidor.');
        setWsConnected(true);
        refreshStatus();
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg: WSServerMessage = JSON.parse(event.data);

          if (msg.type === 'init') {
            setStatus(msg.data.status);
            setTopGifters(msg.data.topGifters || []);
          } else if (msg.type === 'status_update') {
            setStatus(msg.data);
          } else if (msg.type === 'gift_received') {
            const gift = msg.data;
            console.log(`[WS] Presente recebido no frontend: ${gift.eventId} (${gift.giftName})`);

            // Send to game engine
            setIncomingGiftForEngine(gift);

            // Trigger visual banner
            triggerGiftBanner(gift);
          } else if (msg.type === 'ack_confirmed') {
            console.log(`[WS] Confirmação de ACK recebida do servidor: ${msg.eventId}`);
            refreshStatus();
          }
        } catch (err) {
          console.error('[WS] Erro ao parsear mensagem recebida:', err);
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;
        console.warn('[WS] Conexão perdida. Tentando reconectar em 3s...');
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (err) => {
        console.error('[WS] Erro no WebSocket:', err);
        socket.close();
      };
    };

    connectWebSocket();
    refreshStatus();

    // Check URL parameters for ?admin=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1' || params.get('admin') === 'true') {
      setAdminOpen(true);
    }

    // Keyboard shortcut (Ctrl+Shift+A) to toggle admin panel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [refreshStatus]);

  // Handle showing gift alert banner for 5 seconds
  const triggerGiftBanner = (gift: GiftEvent, effect?: string) => {
    if (giftBannerTimerRef.current) {
      clearTimeout(giftBannerTimerRef.current);
    }
    setCurrentGiftBanner(gift);
    setCurrentEffectName(effect);

    giftBannerTimerRef.current = setTimeout(() => {
      setCurrentGiftBanner(null);
      setCurrentEffectName(undefined);
    }, 5000);
  };

  // Emit ACK to backend over WebSocket
  const handleSendAck = useCallback((eventId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const ackPayload: WSClientMessage = {
        type: 'gift_ack',
        eventId,
        clientTimestamp: Date.now(),
      };
      console.log(`[GAME] Enviando confirmação de ACK para ${eventId}...`);
      wsRef.current.send(JSON.stringify(ackPayload));
    }
  }, []);

  const handleScoreUpdate = useCallback((newScore: number, apples: number, record: number) => {
    setScore(newScore);
    setApplesCollected(apples);
    setRecordScore(record);
  }, []);

  const handleGiftApplied = useCallback((gift: GiftEvent, effectName?: string) => {
    triggerGiftBanner(gift, effectName);
  }, []);

  const handleComboUpdate = useCallback((newCombo: number) => {
    setCombo(newCombo);
  }, []);

  const handleEventTriggered = useCallback((name: string, description: string) => {
    if (eventBannerTimerRef.current) clearTimeout(eventBannerTimerRef.current);
    setAmbientEvent({ name, description });
    eventBannerTimerRef.current = setTimeout(() => {
      setAmbientEvent(null);
    }, 4500);
  }, []);

  const handleNewRecord = useCallback((newRecord: number) => {
    if (recordBannerTimerRef.current) clearTimeout(recordBannerTimerRef.current);
    setRecordAlert(newRecord);
    recordBannerTimerRef.current = setTimeout(() => {
      setRecordAlert(null);
    }, 5000);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between relative overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Score and Live Header */}
      <ScoreHeader
        score={score}
        applesCollected={applesCollected}
        recordScore={recordScore}
        realGiftsCount={status?.realGiftEvents || 0}
        combo={combo}
        status={status}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {/* Non-blocking Gift Notification Banner & Event Toasts */}
      <GiftBanner
        currentGift={currentGiftBanner}
        effectName={currentEffectName}
        ambientEvent={ambientEvent}
        recordAlert={recordAlert}
      />

      {/* Main Autonomous Snake Arena */}
      <main className="flex-1 w-full max-w-lg flex flex-col items-center justify-center relative px-2 py-0.5 min-h-0">
        <SnakeCanvas
          onScoreUpdate={handleScoreUpdate}
          onGiftApplied={handleGiftApplied}
          onSendAck={handleSendAck}
          incomingGift={incomingGiftForEngine}
          onComboUpdate={handleComboUpdate}
          onEventTriggered={handleEventTriggered}
          onNewRecord={handleNewRecord}
        />
      </main>

      {/* Bottom Information & Status */}
      <footer className="w-full max-w-lg px-3 pb-2 space-y-1.5 shrink-0">
        {/* Top Gifters Ranking */}
        <TopGiftersRanking topGifters={topGifters} />

        {/* Live Status Indicators */}
        <LiveStatusPills status={status} wsConnected={wsConnected} />
      </footer>

      {/* Hidden Technical Diagnostics Admin Modal */}
      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        status={status}
        onRefreshStatus={refreshStatus}
        wsConnected={wsConnected}
      />
    </div>
  );
}
