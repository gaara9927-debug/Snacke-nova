/**
 * Elegant non-blocking gift notification banner & ambient event toast
 */

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { GiftRewardRule, GIFT_REWARD_RULES } from '../../shared/gifts.ts';
import { GiftEvent } from '../../shared/types.ts';

interface GiftBannerProps {
  currentGift: GiftEvent | null;
  effectName?: string;
  ambientEvent?: { name: string; description: string } | null;
  recordAlert?: number | null;
}

export const GiftBanner: React.FC<GiftBannerProps> = ({
  currentGift,
  effectName,
  ambientEvent,
  recordAlert,
}) => {
  const [matchedRule, setMatchedRule] = useState<GiftRewardRule | null>(null);

  useEffect(() => {
    if (!currentGift) {
      setMatchedRule(null);
      return;
    }

    const gId = String(currentGift.giftId);
    const gName = (currentGift.giftName || '').toLowerCase();

    const rule = GIFT_REWARD_RULES.find(
      (r) =>
        r.idPatterns.some((id) => String(id) === gId) ||
        r.namePatterns.some((p) => gName.includes(p))
    );
    setMatchedRule(rule || null);
  }, [currentGift]);

  return (
    <div className="absolute top-14 left-0 right-0 z-30 pointer-events-none flex flex-col items-center gap-1.5 px-4">
      {/* 1. Real TikTok Gift Notification Banner */}
      <AnimatePresence>
        {currentGift && (
          <motion.div
            key={currentGift.eventId}
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-sm rounded-2xl p-3 shadow-2xl backdrop-blur-xl border border-white/10"
            style={{
              background: matchedRule?.themeColor
                ? `linear-gradient(135deg, rgba(15, 23, 42, 0.94), ${matchedRule.themeColor}33)`
                : 'linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.94))',
              boxShadow: matchedRule?.themeColor
                ? `0 10px 30px -10px ${matchedRule.themeColor}55`
                : '0 10px 30px -10px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Profile Picture */}
              <div className="relative shrink-0">
                {currentGift.profilePicture ? (
                  <img
                    src={currentGift.profilePicture}
                    alt={currentGift.nickname}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-lg text-white ring-2 ring-white/20">
                    {currentGift.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 text-base">
                  {matchedRule?.bannerEmoji || '🎁'}
                </span>
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                    Presente TikTok Real
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ACK OK
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate">
                  Obrigado, @{currentGift.username}! {matchedRule?.bannerEmoji || '🎁'} ×{currentGift.giftCount}
                </h4>
                <p className="text-xs text-slate-300 truncate">
                  <span className="text-slate-400">{currentGift.nickname || currentGift.username}</span> enviou{' '}
                  <span className="font-bold text-amber-300">
                    {currentGift.giftName}
                  </span>
                </p>
              </div>
            </div>

            {/* Special effect tag if any */}
            {effectName && (
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-medium flex items-center gap-1">
                  ✨ {effectName}
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  Cobra em ação contínua
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. New Record Breaker Banner */}
      <AnimatePresence>
        {recordAlert && !currentGift && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.3 }}
            className="bg-amber-950/80 border border-amber-500/40 text-amber-200 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-bold"
          >
            <span className="text-amber-400">👑</span>
            <span>NOVO RECORDE DA LIVE: {recordAlert} PONTOS!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Occasional Ambient Arena Event Banner */}
      <AnimatePresence>
        {ambientEvent && !currentGift && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="bg-emerald-950/75 border border-emerald-500/30 text-emerald-200 px-3 py-1 rounded-full backdrop-blur-md shadow-md flex items-center gap-1.5 text-xs font-semibold"
          >
            <span>{ambientEvent.name}</span>
            <span className="text-emerald-400/80 text-[11px]">— {ambientEvent.description}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
