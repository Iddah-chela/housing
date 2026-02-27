/**
 * Generate a ui-avatars.com URL for letter-based avatar fallback.
 * Works even when avatar.iran.liara.run is down.
 */
export const getAvatarFallback = (name = 'U') => {
  const clean = (name || 'U').trim() || 'U'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(clean)}&background=6366f1&color=fff&bold=true`
}

/**
 * onError handler for avatar <img> tags.
 * Swaps to letter-based avatar on any load failure.
 */
export const onAvatarError = (e, name = 'U') => {
  const fallback = getAvatarFallback(name)
  if (e.target.src !== fallback) {
    e.target.src = fallback
  }
}
