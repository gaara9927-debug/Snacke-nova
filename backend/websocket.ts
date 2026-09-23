/**
 * WebSocket Server Manager for Snacke LIVE
 */

import { Server as HTTPServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { GiftEvent, SystemStatus, TopGifter, WSClientMessage, WSServerMessage } from '../shared/types.ts';
import { serverState } from './state.ts';

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  public initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      const clientCount = this.clients.size;
      console.log(`[WS] Cliente conectado (Total: ${clientCount}) - IP: ${req.socket.remoteAddress}`);

      // Send initial state & top gifters
      const initMessage: WSServerMessage = {
        type: 'init',
        data: {
          status: serverState.getStatus(clientCount),
          topGifters: serverState.getTopGifters(),
        },
      };
      this.sendTo(ws, initMessage);

      ws.on('message', (messageData: string | Buffer) => {
        try {
          const raw = messageData.toString();
          const parsed: WSClientMessage = JSON.parse(raw);

          if (parsed.type === 'gift_ack') {
            const { eventId } = parsed;
            if (eventId) {
              const recorded = serverState.recordAck(eventId);
              console.log(`[ACK] ${eventId} aplicado pelo jogo (Confirmado no servidor: ${recorded ? 'SIM' : 'NÃO'})`);

              // Broadcast ack confirmation to all clients
              const ackMsg: WSServerMessage = {
                type: 'ack_confirmed',
                eventId,
                timestamp: Date.now(),
              };
              this.broadcast(ackMsg);

              // Broadcast updated status
              this.broadcastStatus();
            }
          } else if (parsed.type === 'ping') {
            this.sendTo(ws, { type: 'pong' });
          }
        } catch (err) {
          console.error('[WS] Erro ao processar mensagem do cliente:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Cliente desconectado (Restantes: ${this.clients.size})`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Erro no socket cliente:', err.message);
        this.clients.delete(ws);
      });
    });

    // Send periodic status update every 5 seconds to keep all displays in sync
    setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcastStatus();
      }
    }, 5000);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public broadcastGift(gift: GiftEvent): void {
    const count = this.clients.size;
    console.log(`[WS] Evento ${gift.eventId} enviado para ${count} cliente(s)`);

    const msg: WSServerMessage = {
      type: 'gift_received',
      data: gift,
    };
    this.broadcast(msg);
    this.broadcastStatus();
  }

  public broadcastStatus(): void {
    const status = serverState.getStatus(this.clients.size);
    const msg: WSServerMessage = {
      type: 'status_update',
      data: status,
    };
    this.broadcast(msg);
  }

  private broadcast(msg: WSServerMessage): void {
    const payload = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          console.error('[WS] Erro ao enviar para cliente:', err);
        }
      }
    }
  }

  private sendTo(ws: WebSocket, msg: WSServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        console.error('[WS] Erro ao enviar mensagem direta:', err);
      }
    }
  }
}

export const wsManager = new WebSocketManager();
