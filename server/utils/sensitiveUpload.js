import cloudinary from '../config/cloudinary.js';

/**
 * Upload ID / ownership docs as authenticated assets (not publicly fetchable).
 * Store the returned publicId in Mongo; use signedUrlForPublicId when admins view.
 */
export const uploadSensitiveDocument = async (file, folder) => {
  if (!file?.path) return null;
  const result = await cloudinary.uploader.upload(file.path, {
    folder,
    resource_type: 'auto',
    type: 'authenticated',
    access_mode: 'authenticated',
  });
  return {
    publicId: result.public_id,
    // Fallback display URL (still requires signature when access_mode is authenticated)
    resourceType: result.resource_type || 'image',
  };
};

/** Short-lived signed URL for admin review (default 1 hour). */
export const signedUrlForPublicId = (publicId, { resourceType = 'image', expiresSec = 3600 } = {}) => {
  if (!publicId) return null;
  // Legacy rows may still hold a full https URL from before this change
  if (String(publicId).startsWith('http')) return publicId;

  return cloudinary.url(publicId, {
    type: 'authenticated',
    resource_type: resourceType,
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresSec,
  });
};
