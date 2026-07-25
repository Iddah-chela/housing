import { Star, BadgeCheck, Trophy } from 'lucide-react';

/**
 * Compact agent reputation display for cards + detail pages.
 * reputation: { name, ratingAvg, ratingCount, successfulPlacements, isVerifiedAgent, hideRealName }
 */
export default function AgentReputationBadge({
  reputation,
  compact = false,
  className = '',
  showImage = false,
  image,
}) {
  if (!reputation?.name && !reputation?.isVerifiedAgent) return null;

  const name = String(reputation.name || '').trim() || 'Verified Agent';
  const avg = reputation.ratingAvg;
  const count = Number(reputation.ratingCount || 0);
  const placements = Number(reputation.successfulPlacements || 0);
  const filled = avg != null ? Math.round(avg) : 0;
  const canShowImage = showImage && !reputation.hideRealName;
  const tierLabel = reputation.featured ? (reputation.tierLabel || 'Top agent') : '';
  const isTopTier = reputation.tier === 'top';

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600 dark:text-gray-300 ${className}`}>
        <span className='font-semibold text-gray-800 dark:text-gray-100'>{name}</span>
        {avg != null && (
          <span className='inline-flex items-center gap-0.5 text-amber-500'>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i <= filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
              />
            ))}
            <span className='ml-0.5 text-gray-700 dark:text-gray-200 font-medium'>{avg.toFixed(1)}</span>
          </span>
        )}
        {placements > 0 && (
          <span className='text-gray-500 dark:text-gray-400'>{placements} placement{placements === 1 ? '' : 's'}</span>
        )}
        {reputation.isVerifiedAgent && (
          <span className='inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-300'>
            <BadgeCheck className='w-3.5 h-3.5' /> Verified
          </span>
        )}
        {tierLabel && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${isTopTier ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            <Trophy className='w-3.5 h-3.5' /> {tierLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {canShowImage && (
        <img
          src={image || reputation.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&bold=true`}
          alt={name}
          className='w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-600'
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&bold=true`;
          }}
        />
      )}
      <div className='min-w-0'>
        <p className='font-semibold text-gray-900 dark:text-white truncate'>{name}</p>
        <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1'>
          {avg != null ? (
            <span className='inline-flex items-center gap-0.5 text-amber-500 text-sm'>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i <= filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                />
              ))}
              <span className='ml-1 font-medium text-gray-800 dark:text-gray-100'>{avg.toFixed(1)}</span>
              {count > 0 && (
                <span className='text-xs text-gray-500 dark:text-gray-400'>({count})</span>
              )}
            </span>
          ) : (
            <span className='text-xs text-gray-500 dark:text-gray-400'>No ratings yet</span>
          )}
        </div>
        <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
          {placements > 0
            ? `${placements} successful house placement${placements === 1 ? '' : 's'}`
            : 'New agent — no confirmed placements yet'}
        </p>
        <div className='flex flex-wrap items-center gap-2 mt-1'>
          {reputation.isVerifiedAgent && (
            <span className='inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-300'>
              <BadgeCheck className='w-3.5 h-3.5' /> Verified Agent
            </span>
          )}
          {tierLabel && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isTopTier
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            }`}>
              <Trophy className='w-3.5 h-3.5' /> {tierLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
