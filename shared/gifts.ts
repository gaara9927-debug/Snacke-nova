/**
 * Configurable gift rules and mapping for Snacke LIVE
 * 
 * Supports:
 * 🌹 Rosa (Rose / 5655)
 * 🍩 Rosquinha (Doughnut / Donut / 5827)
 * ❤️ Heart Me (5269)
 * 🌌 Galáxia (Galaxy / 5656)
 */

export interface GiftRewardRule {
  idPatterns: Array<string | number>;
  namePatterns: string[];
  regularApplesToAdd: number;
  goldenApplesToAdd: number;
  galaxyApplesToAdd: number;
  effectName?: string;
  effectType?: 'shower' | 'speed' | 'golden' | 'galaxy';
  effectDurationMs?: number;
  pointsMultiplier?: number;
  bannerTitle: string;
  bannerEmoji: string;
  themeColor: string;
}

export const GIFT_REWARD_RULES: GiftRewardRule[] = [
  // 🌹 Rosa
  {
    idPatterns: ['5655', 5655],
    namePatterns: ['rose', 'rosa'],
    regularApplesToAdd: 2,
    goldenApplesToAdd: 0,
    galaxyApplesToAdd: 0,
    effectName: 'Banquete de Rosas',
    bannerTitle: 'Rosa Enviada!',
    bannerEmoji: '🌹',
    themeColor: '#f43f5e',
  },
  // 🍩 Rosquinha / Donut
  {
    idPatterns: ['5827', 5827, '6059', 6059],
    namePatterns: ['donut', 'doughnut', 'rosquinha'],
    regularApplesToAdd: 6,
    goldenApplesToAdd: 1,
    galaxyApplesToAdd: 0,
    effectName: 'Festa da Rosquinha (Velocidade + 6 Maçãs)',
    effectType: 'speed',
    effectDurationMs: 12000,
    bannerTitle: 'Rosquinha Doce!',
    bannerEmoji: '🍩',
    themeColor: '#f59e0b',
  },
  // ❤️ Heart Me
  {
    idPatterns: ['5269', 5269],
    namePatterns: ['heart me', 'heartme', 'coração'],
    regularApplesToAdd: 8,
    goldenApplesToAdd: 2,
    galaxyApplesToAdd: 0,
    effectName: 'Chuva do Coração + Maçãs Douradas',
    effectType: 'golden',
    effectDurationMs: 15000,
    pointsMultiplier: 1.5,
    bannerTitle: 'Heart Me Recebido!',
    bannerEmoji: '❤️',
    themeColor: '#ef4444',
  },
  // 🌌 Galáxia / Galaxy
  {
    idPatterns: ['5656', 5656, '6532', 6532],
    namePatterns: ['galaxy', 'galaxia', 'galáxia', 'universe', 'universo'],
    regularApplesToAdd: 20,
    goldenApplesToAdd: 5,
    galaxyApplesToAdd: 3,
    effectName: 'SUPER EVENTO GALÁXIA CÓSMICA',
    effectType: 'galaxy',
    effectDurationMs: 30000,
    pointsMultiplier: 3.0,
    bannerTitle: 'EVENTO CÓSMICO GALÁXIA!',
    bannerEmoji: '🌌',
    themeColor: '#8b5cf6',
  },
];

export interface EvaluatedGiftReward {
  rule: GiftRewardRule | null;
  applesToAdd: number;
  goldenApplesToAdd: number;
  galaxyApplesToAdd: number;
  effectName?: string;
  effectType?: 'shower' | 'speed' | 'golden' | 'galaxy';
  effectDurationMs?: number;
  pointsMultiplier: number;
  bannerTitle: string;
  bannerEmoji: string;
  themeColor: string;
}

/**
 * Resolve gift reward based on giftId, giftName, count, and diamonds
 */
export function evaluateGiftReward(
  giftId: string | number,
  giftName: string,
  giftCount: number,
  diamondCount: number
): EvaluatedGiftReward {
  const normalizedId = String(giftId).trim();
  const normalizedName = (giftName || '').toLowerCase().trim();
  const count = Math.max(1, giftCount || 1);

  // Match by ID first, then by name
  let matchedRule = GIFT_REWARD_RULES.find((r) =>
    r.idPatterns.some((id) => String(id) === normalizedId)
  );

  if (!matchedRule) {
    matchedRule = GIFT_REWARD_RULES.find((r) =>
      r.namePatterns.some((pattern) => normalizedName.includes(pattern))
    );
  }

  if (matchedRule) {
    return {
      rule: matchedRule,
      applesToAdd: matchedRule.regularApplesToAdd * count,
      goldenApplesToAdd: matchedRule.goldenApplesToAdd * count,
      galaxyApplesToAdd: matchedRule.galaxyApplesToAdd * count,
      effectName: matchedRule.effectName,
      effectType: matchedRule.effectType,
      effectDurationMs: matchedRule.effectDurationMs,
      pointsMultiplier: matchedRule.pointsMultiplier || 1.0,
      bannerTitle: `${matchedRule.bannerEmoji} ${matchedRule.bannerTitle}`,
      bannerEmoji: matchedRule.bannerEmoji,
      themeColor: matchedRule.themeColor,
    };
  }

  // Fallback for any other TikTok gifts based on diamonds or count
  const diamonds = Math.max(1, diamondCount || count);
  let baseApples = Math.min(25, Math.max(1, count * Math.ceil(diamonds / 5)));
  let goldenApples = diamonds >= 50 ? Math.floor(diamonds / 50) : 0;
  let galaxyApples = diamonds >= 500 ? 1 : 0;

  return {
    rule: null,
    applesToAdd: baseApples,
    goldenApplesToAdd: goldenApples,
    galaxyApplesToAdd: galaxyApples,
    pointsMultiplier: diamonds >= 100 ? 2.0 : 1.0,
    bannerTitle: `🎁 Presente: ${giftName}`,
    bannerEmoji: '🎁',
    themeColor: '#06b6d4',
  };
}
