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

  return {
    name,
    hideRealName,
    // Hide profile photo with the real name — a photo can identify the person
    image: hideRealName ? '' : (user.image || ''),
    successfulPlacements: Number(rep.successfulPlacements || 0),
    ratingAvg,
    ratingCount,
    isVerifiedAgent: true,
  };
};

export const agentReputationSelect =
  'username image email phoneNumber isIdVerified agentReputation roles role';
