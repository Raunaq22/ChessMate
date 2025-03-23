/**
 * Helper function to safely format image URLs
 * This is a shared utility to ensure consistent handling of images
 */
export const formatImageUrl = (url) => {
  // Default avatar
  if (!url) return '/assets/default-avatar.png';
  
  // Already absolute URL
  if (url.startsWith('http')) return url;
  
  // Return the URL as is - let the browser handle it through the proxy
  return url;
};

/**
 * Safe image component with error handling to prevent infinite loops
 */
export const safeImageOnErrorHandler = (e) => {
  // Special check to prevent infinite loops
  const defaultAvatarPath = '/assets/default-avatar.png';
  if (e.target.src.includes(defaultAvatarPath) || e.target.hasSetFallback) {
    return; // Already using fallback or has tried to set it
  }
  
  // Set a flag on the element to prevent multiple fallback attempts
  e.target.hasSetFallback = true;
  e.target.src = defaultAvatarPath;
};
