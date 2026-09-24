/**
 * Snacke LIVE — Conector Termux Real para TikTok LIVE
 * Executado diretamente no Android (POCO C65) via Termux.
 * 
 * Responsabilidade:
 * TikTok LIVE REAL (@rainz878)
 * ↓
 * Termux (este script)
 * ↓
 * Backend Railway (Webhook autenticado + Heartbeat)
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

dotenv.config();

// Configurações
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || 'rainz878';
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const WEBHOOK_SECRET = process.env.TERMUX_WEBHOOK_SECRET || 'rainz878_snacke_secret_replace_me';
const HEARTBEAT_INTERVAL_MS = 15000;

console.log('====================================================');
console.log('🐍 SNACKE LIVE — Conector Termux TikTok LIVE');
console.log(`👤 Usuário TikTok: @${TIKTOK_USERNAME}`);
console.log(`🌐 Backend Railway: ${BACKEND_URL}`);
console.log(`📱 Plataforma: Android POCO C65 (Termux)`);
console.log('====================================================\n');

let isLiveConnected = false;
let isStreamLive = false;
let reconnectAttempt = 0;
const MAX_RECONNECT_DELAY_MS = 60000;

// Instancia a conexão real com a TikTok LIVE
const tiktokConnection = new TikTokLiveConnection(TIKTOK_USERNAME, {
  processInitialData: false,
  enableExtendedGiftInfo: false,
  enableWebsocketUpgrade: true,
  requestPollingIntervalMs: 2000,
  clientParams: {
    app_language: 'pt-BR',
    webcast_language: 'pt-BR',
  },
});

/**
 * Envia requisição autenticada ao Backend Railway
 */
async function sendToBackend(endpoint, payload, maxRetries = 3) {
  const url = `${BACKEND_URL}${endpoint}`;
  const timestamp = Date.now().toString();
  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest('hex');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WEBHOOK_SECRET}`,
          'X-Webhook-Secret': WEBHOOK_SECRET,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
        },
        body: rawBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[BACKEND-HTTP] Falha HTTP ${response.status} ao enviar para ${endpoint}: ${errorText}`);
        if (response.status === 401) {
          console.error('[ERRO CRÍTICO] Segredo TERMUX_WEBHOOK_SECRET rejeitado pelo backend!');
          return null;
        }
      } else {
        const result = await response.json();
        return result;
      }
    } catch (err) {
      console.error(`[BACKEND-NET] Tentativa ${attempt}/${maxRetries} falhou ao conectar ao backend: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }
  return null;
}

/**
 * Envia Heartbeat periódico ao backend
 */
async function sendHeartbeat() {
  const payload = {
    username: TIKTOK_USERNAME,
    connected: isLiveConnected,
    live: isStreamLive,
    timestamp: Date.now(),
  };

  const res = await sendToBackend('/api/tiktok/heartbeat', payload, 2);
  if (res && res.ok) {
    // Heartbeat confirmado
  } else {
    console.warn('[HEARTBEAT] Não foi possível enviar heartbeat ao backend.');
  }
}

// Inicia loop de heartbeat a cada 15 segundos
setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

/**
 * Conecta à LIVE do TikTok com tratamento de reconexão
 */
async function connectToTikTok() {
  try {
    console.log(`[TIKTOK] Conectando à LIVE de @${TIKTOK_USERNAME}...`);
    const state = await tiktokConnection.connect();
    isLiveConnected = true;
    isStreamLive = true;
    reconnectAttempt = 0;

    console.log(`[TIKTOK] LIVE CONECTADA COM SUCESSO! Sala ID: ${state.roomId}`);
    await sendHeartbeat();
  } catch (err) {
    isLiveConnected = false;
    isStreamLive = false;
    console.error(`[TIKTOK] Erro REAL ao conectar à LIVE: ${err.message}`);

    // Reconexão com backoff exponencial
    reconnectAttempt++;
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, 3000 * Math.pow(1.5, reconnectAttempt));
    console.log(`[TIKTOK] Tentando reconectar em ${(delay / 1000).toFixed(1)} segundos (tentativa ${reconnectAttempt})...`);
    setTimeout(connectToTikTok, delay);
  }
}

// -------------------------------------------------------------
// EVENTOS TIKTOK LIVE
// -------------------------------------------------------------

// Presentes
tiktokConnection.on(WebcastEvent.GIFT, async (data) => {
  try {
    // Tratar combos do TikTok:
    // giftType === 1 representa presentes que podem fazer streak (combos como Rosa).
    // Para combos em andamento com repeatEnd false, podemos aguardar ou enviar com streak ID
    const isStreakOngoing = data.giftType === 1 && !data.repeatEnd;
    if (isStreakOngoing) {
      // Ignora atualizações intermediárias de combo para não multiplicar erroneamente
      // Processa apenas quando repeatEnd === true
      return;
    }

    const count = data.repeatCount || data.giftCount || 1;
    const eventId = `gift_${data.msgId || Date.now()}_${data.userId}_${data.giftId}_${count}`;

    console.log(`[TERMUX] gift ${eventId} detected: ${data.giftName} x${count} de @${data.uniqueId}`);

    const payload = {
      event: 'gift',
      eventId,
      username: data.uniqueId,
      nickname: data.nickname || data.uniqueId,
      userId: String(data.userId || ''),
      profilePicture: data.profilePictureUrl || '',
      giftId: String(data.giftId || '0'),
      giftName: data.giftName || 'Presente',
      giftCount: count,
      diamondCount: data.diamondCount || count,
      repeatEnd: Boolean(data.repeatEnd),
      timestamp: Date.now(),
    };

    const res = await sendToBackend('/api/tiktok/webhook', payload);
    if (res && res.ok) {
      console.log(`[TERMUX] gift ${eventId} enviado com sucesso ao backend!`);
    } else {
      console.error(`[TERMUX] Falha ao entregar presente ${eventId} ao backend.`);
    }
  } catch (err) {
    console.error('[TERMUX] Erro ao processar evento de presente:', err);
  }
});

// Encerramento da LIVE
tiktokConnection.on(WebcastEvent.STREAM_END, () => {
  console.log('[TIKTOK] A transmissão LIVE de @' + TIKTOK_USERNAME + ' foi encerrada.');
  isStreamLive = false;
  sendHeartbeat();
});

// Desconexão
tiktokConnection.on(WebcastEvent.DISCONNECTED, () => {
  console.warn('[TIKTOK] Conexão com TikTok perdida.');
  isLiveConnected = false;
  sendHeartbeat();
  // Tentar reconectar
  setTimeout(connectToTikTok, 5000);
});

// Erros
tiktokConnection.on(WebcastEvent.ERROR, (err) => {
  console.error('[TIKTOK] Erro no stream:', err);
});

// Inicia conexão inicial
connectToTikTok();
