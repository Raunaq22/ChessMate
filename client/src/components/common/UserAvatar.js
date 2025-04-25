import React, { useState, useEffect } from 'react';

// Updated formatImageUrl function in this file
export const formatImageUrl = (url) => {
  if (!url) return '/assets/default-avatar.png';
  
  // Add a timestamp to prevent caching issues for all external/uploaded images
  const timestamp = new Date().getTime();
  
  // Check if it's already a URL with query params
  const separator = url.includes('?') ? '&' : '?';

  // Return the URL with the timestamp, unless it's the default avatar
  return `${url}${separator}t=${timestamp}`;
};

// Define size classes for different avatar sizes
const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24'
};

const UserAvatar = ({ user, className = '', size = 'md' }) => {
  const [error, setError] = useState(false);
  const [cachedImage, setCachedImage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;
  
  const imageUrl = !error && user?.profile_image_url 
    ? formatImageUrl(user.profile_image_url)
    : '/assets/default-avatar.png';

  // Use useEffect to cache the image once it's loaded
  useEffect(() => {
    if (user?.profile_image_url && !cachedImage && retryCount < MAX_RETRIES) {
      // Load and cache image when it's not already cached
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        setCachedImage(imageUrl);
        setError(false);
      };
      img.onerror = () => {
        console.log("UserAvatar: Image failed to load:", imageUrl);
        setError(true);
        setRetryCount(prev => prev + 1);
      };
    }
  }, [user?.profile_image_url, imageUrl, cachedImage, retryCount]);

  return (
    <img
      src={cachedImage || imageUrl}
      alt={user?.username || 'User'}
      className={`${className} ${sizeClasses[size] || ''}`}
      onError={(e) => {
        console.log("UserAvatar: Image failed to load:", e.target.src);
        e.target.onerror = null; // Prevent loops
        e.target.src = '/assets/default-avatar.png';
        setError(true);
      }}
      crossOrigin="anonymous"
    />
  );
};

export default UserAvatar;
