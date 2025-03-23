import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// Add this helper function to format image URLs
const formatImageUrl = (url) => {
  if (!url) return `/assets/default-avatar.png`;
  if (url.startsWith('http')) return url;
  
  // For uploads, just return the path as-is
  return url;
};

const Navbar = () => {
  const { isAuthenticated, currentUser, logout } = useContext(AuthContext);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  
  // Only show profile image when authenticated and we have a user
  const showProfileImage = isAuthenticated && !!currentUser;
  
  // Use a fallback image path directly without adding the API URL
  const avatarSrc = showProfileImage && currentUser.profile_image_url 
    ? formatImageUrl(currentUser.profile_image_url)
    : '/assets/default-avatar.png';

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold">ChessMate</Link>
          
          <div className="flex items-center space-x-6">
            <Link to="/" className="hover:text-chess-hover">Home</Link>
            <Link to="/leaderboard" className="hover:text-chess-hover">Leaderboard</Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="hover:text-chess-hover">
                  Profile {currentUser?.username && `(${currentUser.username})`}
                </Link>
                <Link to="/settings" className="hover:text-chess-hover">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Settings
                  </span>
                </Link>
                {showProfileImage && (
                  <img 
                    src={avatarSrc}
                    alt={currentUser.username || "User"}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      // Only set the fallback once to prevent loops
                      if (!imageFailed) {
                        setImageFailed(true);
                        e.target.src = '/assets/default-avatar.png';
                      }
                    }}
                    onLoad={() => setImageLoaded(true)}
                  />
                )}
                <button 
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="bg-chess-dark hover:bg-chess-hover text-white py-1 px-3 rounded"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-chess-dark hover:bg-chess-hover text-white py-1 px-3 rounded"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;