/**
 * Agent reputation tiers — earned, not bought.
 * Tiers drive feed placement and leaderboard ranking.
 */
export const AGENT_TIERS = {
  top: {
    key: 'top',
    label: 'Top agent',
    minPlacements: 8,
    minRatingAvg: 4.5,
    minRatingCount: 5,
    // Feed boost expressed in days of "freshness" credit
    boostDays: 7,
  },
  rising: {
    key: 'rising',
    label: 'Rising agent',
    minPlacements: 3,
    minRatingAvg: 4.0,
    minRatingCount: 2,
    boostDays: 3,
  },
};

const meetsTier = (tier, placements, ratingAvg, ratingCount) => {
  // Either a strong placement record, or strong ratings — not both required
  const byPlacements = placements >= tier.minPlacements;
  const byRatings = ratingCount >= tier.minRatingCount && ratingAvg >= tier.minRatingAvg;
  return byPlacements || byRatings;
};

export const computeAgentTier = ({ successfulPlacements = 0, ratingAvg = 0, ratingCount = 0 } = {}) => {
  const placements = Number(successfulPlacements || 0);
  const avg = Number(ratingAvg || 0);
  const count = Number(ratingCount || 0);

  if (meetsTier(AGENT_TIERS.top, placements, avg, count)) return AGENT_TIERS.top.key;
  if (meetsTier(AGENT_TIERS.rising, placements, avg, count)) return AGENT_TIERS.rising.key;
  return 'standard';
};

/** Ranking score for the leaderboard (higher is better). */
export const agentReputationScore = ({ successfulPlacements = 0, ratingAvg = 0, ratingCount = 0 } = {}) => {
  const placements = Number(successfulPlacements || 0);
  const avg = Number(ratingAvg || 0);
  const count = Number(ratingCount || 0);
  // Placements are the real outcome; ratings confirm quality and are capped by volume
  return placements * 10 + avg * Math.min(count, 10);
};

/** Feed freshness credit (ms) for a given tier. */
export const tierBoostMs = (tier) => {
  const days = AGENT_TIERS[tier]?.boostDays || 0;
  return days * 24 * 60 * 60 * 1000;
};

/**
 * Build the public-facing agent reputation payload (privacy-aware).
 */
export const buildPublicAgentReputation = (user) => {
  if (!user) return null;

  const rep = user.agentReputation || {};
  const hideRealName = !!rep.hideRealName;
  const customName = String(rep.displayName || '').trim();
  const realName = String(user.username || '').trim();

  let name;
  if (hideRealName) {
    // Never expose account username when hidden
    name = customName || 'Verified Agent';
  } else {
    name = customName || realName || 'Verified Agent';
  }

  // Guarantee a non-empty public label
  if (!String(name || '').trim()) name = 'Verified Agent';

  const ratingCount = Number(rep.ratingCount || 0);
  const ratingAvg = ratingCount > 0 ? Number(Number(rep.ratingAvg || 0).toFixed(1)) : null;
  const successfulPlacements = Number(rep.successfulPlacements || 0);
  const tier = computeAgentTier({
    successfulPlacements,
    ratingAvg: ratingAvg || 0,
    ratingCount,
  });

  return {
    name,
    hideRealName,
    // Hide profile photo with the real name — a photo can identify the person
    image: hideRealName ? '' : (user.image || ''),
    successfulPlacements,
    ratingAvg,
    ratingCount,
    isVerifiedAgent: true,
    tier,
    tierLabel: AGENT_TIERS[tier]?.label || '',
    featured: tier !== 'standard',
    score: agentReputationScore({ successfulPlacements, ratingAvg: ratingAvg || 0, ratingCount }),
  };
};

export const agentReputationSelect =
  'username image email phoneNumber isIdVerified agentReputation roles role';
