/**
 * Webhook handler and security verification for Termux -> Backend
 */

import crypto from 'crypto';
import { Request, Response } from 'express';
import { GiftEvent } from '../shared/types.ts';
import { serverState } from './state.ts';

const DEFAULT_SECRET = 'rainz878_snacke_secret_replace_me';

export function getWebhookSecret(): string {
  return process.env.TERMUX_WEBHOOK_SECRET || DEFAULT_SECRET;
}

/**
 * Validate incoming Termux request authorization
 * Supports:
 * 1. Authorization: Bearer <SECRET>
 * 2. Header x-webhook-secret: <SECRET>
 * 3. HMAC header x-signature: sha256=<HMAC>
 */
export function verifyTermuxAuth(req: Request): boolean {
  const secret = getWebhookSecret();
  
  // 1. Check Bearer token
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === secret) return true;
  }

  // 2. Check X-Webhook-Secret header
  const customSecret = req.headers['x-webhook-secret'];
  if (typeof customSecret === 'string' && customSecret.trim() === secret) {
    return true;
  }

  // 3. Check HMAC signature if present
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  if (typeof signature === 'string' && typeof timestamp === 'string') {
    const rawPayload = `${timestamp}.${JSON.stringify(req.body)}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return true;
    }
  }

  return false;
}

/**
 * Validates gift event payload schema and fields
 */
export function validateGiftPayload(body: any): { valid: boolean; error?: string; data?: GiftEvent } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Corpo da requisição inválido (JSON esperado)' };
  }

  const {
    event,
    eventId,
    username,
    nickname,
    userId,
    profilePicture,
    giftId,
    giftName,
    giftCount,
    diamondCount,
    repeatEnd,
    timestamp,
    isSynthetic,
  } = body;

  if (event !== 'gift') {
    return { valid: false, error: 'Campo event deve ser "gift"' };
  }

  if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
    return { valid: false, error: 'Campo eventId obrigatório e deve ser string' };
  }

  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Campo username obrigatório' };
  }

  if (!giftName || typeof giftName !== 'string') {
    return { valid: false, error: 'Campo giftName obrigatório' };
  }

  const count = Number(giftCount);
  if (isNaN(count) || count < 1) {
    return { valid: false, error: 'Campo giftCount deve ser número maior ou igual a 1' };
  }

  // Replay protection: if timestamp provided, check within reasonable window (15 minutes)
  const now = Date.now();
  const eventTime = Number(timestamp) || now;
  if (Math.abs(now - eventTime) > 15 * 60 * 1000) {
    return { valid: false, error: 'Timestamp do evento muito antigo ou no futuro (> 15 min)' };
  }

  const cleanGift: GiftEvent = {
    event: 'gift',
    eventId: eventId.trim(),
    username: username.replace(/^@/, '').trim(),
    nickname: (nickname || username).trim(),
    userId: userId ? String(userId) : undefined,
    profilePicture: typeof profilePicture === 'string' ? profilePicture : undefined,
    giftId: giftId ? String(giftId) : '0',
    giftName: giftName.trim(),
    giftCount: Math.floor(count),
    diamondCount: Number(diamondCount) || count,
    repeatEnd: repeatEnd !== undefined ? Boolean(repeatEnd) : true,
    timestamp: eventTime,
    isSynthetic: Boolean(isSynthetic),
  };

  return { valid: true, data: cleanGift };
}
