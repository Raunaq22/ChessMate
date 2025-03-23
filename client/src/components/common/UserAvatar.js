import React, { useState } from 'react';

// Helper function to format image URLs - simplified to avoid recursive API calls
export const formatImageUrl = (url) => {
  if (!url) return '/assets/default-avatar.png';
  if (url.startsWith('http')) return url;
  
  // Ensure we're not returning an API endpoint as a direct image path
  if (url.includes('/api/users/')) {
    return '/assets/default-avatar.png';
  }
  
  // Return the path as-is
  return url;
};

const UserAvatar = ({ user, className = "h-8 w-8 rounded-full object-cover" }) => {
  const [imageFailed, setImageFailed] = useState(false);
  
  // Default source
  const avatarSrc = user?.profile_image_url 
    ? formatImageUrl(user.profile_image_url)
    : '/assets/default-avatar.png';
  
  return (
    <img 
      src={avatarSrc} 
      alt={user?.username || "User"}
      className={className}
      onError={(e) => {
        // Only try to set fallback once to prevent infinite loops
        if (!imageFailed) {
          console.log(`Image failed to load: ${e.target.src}, falling back to default avatar`);
          setImageFailed(true);
          e.target.src = '/assets/default-avatar.png';
        }
      }}
    />
  );
};

export default UserAvatar;
