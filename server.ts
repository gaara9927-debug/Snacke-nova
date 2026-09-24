/**
 * Server entry point for Snacke LIVE
 * Runs on Railway/Render (or local development) on process.env.PORT
 */

import cors from 'cors';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './backend/routes.ts';
import { wsManager } from './backend/websocket.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
      });
    }
    next();
  });

  app.use(apiRouter);
  app.use('/termux', express.static(path.join(__dirname, '..', 'termux')));
  wsManager.initialize(server);

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    console.log('[SERVER] Modo de desenvolvimento com Vite montado');
  } else {
    // server.js is bundled into dist/, and Vite writes index.html/assets to that same dist/.
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[SERVER] Modo de produção servindo ${distPath}`);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log('🐍 [SERVER] Snacke LIVE iniciado com sucesso!');
    console.log(`📡 Porta: ${PORT} (0.0.0.0:${PORT})`);
    console.log('🔴 TikTok Target: @rainz878');
    console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}/ws`);
    console.log(`🏥 Healthcheck: http://0.0.0.0:${PORT}/health`);
    console.log(`📊 Status: http://0.0.0.0:${PORT}/api/tiktok/status`);
    console.log('=========================================');
  });

  const shutdown = () => {
    console.log('\n[SERVER] Encerrando Snacke LIVE gracefully...');
    server.close(() => {
      console.log('[SERVER] Servidor finalizado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[FATAL] Erro ao inicializar Snacke LIVE:', err);
  process.exit(1);
});
