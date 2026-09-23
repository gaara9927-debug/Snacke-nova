/**
 * API Routes for Snacke LIVE
 */

import { Router } from 'express';
import { serverState } from './state.ts';
import { validateGiftPayload, verifyTermuxAuth } from './webhook.ts';
import { wsManager } from './websocket.ts';

export const apiRouter = Router();

// 1. Healthcheck endpoint: GET /health
apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Snacke LIVE',
    timestamp: new Date().toISOString(),
    websocket: true,
  });
});

// 2. Real TikTok status: GET /api/tiktok/status
apiRouter.get('/api/tiktok/status', (_req, res) => {
  const status = serverState.getStatus(wsManager.getClientCount());
  res.json(status);
});

// 3. Top gifters ranking: GET /api/tiktok/leaderboard
apiRouter.get('/api/tiktok/leaderboard', (_req, res) => {
  res.json({
    topGifters: serverState.getTopGifters(),
    realGiftEvents: serverState.getStatus().realGiftEvents,
  });
});

// 4. Heartbeat from Termux: POST /api/tiktok/heartbeat
apiRouter.post('/api/tiktok/heartbeat', (req, res) => {
  if (!verifyTermuxAuth(req)) {
    console.warn('[TERMUX] Falha na autenticação do Heartbeat (Secret inválido)');
    res.status(401).json({ error: 'Autenticação Termux inválida (TERMUX_WEBHOOK_SECRET incorreto)' });
    return;
  }

  const { username, connected, live, timestamp } = req.body || {};
  serverState.recordHeartbeat({
    username: username || 'rainz878',
    connected: Boolean(connected),
    live: Boolean(live),
    timestamp: Number(timestamp) || Date.now(),
  });

  console.log(`[TERMUX] Heartbeat recebido - TikTok: ${connected ? 'Conectado' : 'Desconectado'} | LIVE: ${live ? 'ONLINE' : 'OFFLINE'}`);

  // Broadcast updated status to connected screens
  wsManager.broadcastStatus();

  res.json({
    ok: true,
    received: true,
    serverTime: Date.now(),
  });
});

// 5. Gift Webhook: POST /api/tiktok/webhook
apiRouter.post('/api/tiktok/webhook', (req, res) => {
  if (!verifyTermuxAuth(req)) {
    console.warn('[WEBHOOK] Tentativa de webhook com autenticação inválida');
    res.status(401).json({ error: 'Não autorizado. Verifique TERMUX_WEBHOOK_SECRET.' });
    return;
  }

  const validation = validateGiftPayload(req.body);
  if (!validation.valid || !validation.data) {
    console.warn(`[WEBHOOK] Payload inválido: ${validation.error}`);
    res.status(400).json({ error: validation.error });
    return;
  }

  const giftData = validation.data;
  console.log(`[WEBHOOK] ${giftData.eventId} received`);

  // Anti-fraude & Deduplicação
  if (serverState.isDuplicateEvent(giftData.eventId)) {
    console.log(`[WEBHOOK] ${giftData.eventId} descartado (já processado anteriormente)`);
    res.json({ ok: true, deduplicated: true, eventId: giftData.eventId });
    return;
  }

  // Marcar como processado para evitar duplicação em retries
  serverState.markEventProcessed(giftData.eventId);

  console.log(`[GIFT] ${giftData.giftName} x${giftData.giftCount} @${giftData.username}`);
  console.log(`[GIFT] ${giftData.eventId} validated`);

  // Rastrear evento e atualizar ranking real
  serverState.trackGiftEvent(giftData, wsManager.getClientCount());

  // Transmitir via WebSocket para o jogo
  wsManager.broadcastGift(giftData);

  res.json({
    ok: true,
    eventId: giftData.eventId,
    tracked: true,
    timestamp: Date.now(),
  });
});

// 6. Test Endpoint (Development ONLY - explicitly flagged as synthetic)
apiRouter.post('/api/tiktok/test-event', (req, res) => {
  // Only allow if authorized or in non-production
  if (!verifyTermuxAuth(req) && process.env.NODE_ENV === 'production') {
    res.status(401).json({ error: 'Não autorizado em produção' });
    return;
  }

  const testEventId = `dev_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testGift = {
    event: 'gift' as const,
    eventId: testEventId,
    username: req.body.username || 'test_user',
    nickname: req.body.nickname || 'Testador Dev',
    giftId: req.body.giftId || '5655',
    giftName: req.body.giftName || 'Rosa',
    giftCount: Number(req.body.giftCount) || 1,
    diamondCount: Number(req.body.diamondCount) || 1,
    timestamp: Date.now(),
    isSynthetic: true, // NEVER counted as realGiftEvents!
  };

  console.log(`[DEV-TEST] Evento simulado de teste ${testEventId} (NÃO contabilizado em realGiftEvents)`);
  wsManager.broadcastGift(testGift);

  res.json({
    ok: true,
    eventId: testEventId,
    warning: 'Evento sintético disparado apenas para desenvolvimento local. realGiftEvents não foi alterado.',
  });
});
