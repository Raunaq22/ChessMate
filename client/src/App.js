import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChakraProvider, CSSReset, Box, Flex, Avatar, Tooltip } from '@chakra-ui/react';
import PrivateRoute from './components/Auth/PrivateRoute';
import Sidebar from './components/common/Sidebar';
import Home from './pages/Home';
import ProfilePage from './pages/ProfilePage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { AuthProvider, AuthContext } from './context/AuthContext';
import GamePage from './pages/GamePage';
import GameLobby from './components/Game/GameLobby';
import PlayWithFriendPage from './pages/PlayWithFriendPage';
import ComputerGamePage from './pages/ComputerGamePage';
import GameReplayPage from './pages/GameReplayPage';
import SettingsPage from './pages/SettingsPage';
import ProfileSettings from './pages/Settings/ProfileSettings';
import ThemeSettings from './pages/Settings/ThemeSettings';

import OAuthCallback from './pages/OAuthCallback';
import { ThemeProvider } from './context/ThemeContext';
import theme from './config/theme'; // Ensure this path is correct

// Format image URL helper function
const formatImageUrl = (url) => {
  if (!url) {
    console.log("formatImageUrl: No URL provided, using default avatar");
    return '/assets/default-avatar.png';
  }
  
  // Convert relative URLs to absolute with the correct backend URL
  let absoluteUrl = url;
  if (!url.startsWith('http') && !url.startsWith('/assets/')) {
    try {
      // Use the backend API URL instead of the frontend URL
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      absoluteUrl = `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
      console.log("formatImageUrl: Converted to backend URL:", absoluteUrl);
    } catch (e) {
      console.error("formatImageUrl: Error converting to backend URL:", e);
    }
  }
  
  // Add a timestamp to prevent caching issues for all external/uploaded images
  const timestamp = new Date().getTime();
  
  // Check if it's already a URL with query params
  const separator = absoluteUrl.includes('?') ? '&' : '?';

  // Return the URL with the timestamp
  const finalUrl = `${absoluteUrl}${separator}t=${timestamp}`;
  console.log("formatImageUrl: Final URL with cache busting:", finalUrl);
  
  return finalUrl;
};

// Profile Avatar Component - will only be rendered when AuthContext is available
const ProfileAvatar = () => {
  const { currentUser, isAuthenticated } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [imageError, setImageError] = React.useState(false);
  
  if (!isAuthenticated || !currentUser) return null;
  
  const name = currentUser.username || 'User';
  
  // Get properly formatted image URL with backend origin
  let src = '/assets/default-avatar.png';
  
  if (currentUser.profile_image_url) {
    if (currentUser.profile_image_url.startsWith('/uploads/profile/')) {
      // Extract the filename from the path
      const filename = currentUser.profile_image_url.split('/').pop();
      
      // Use the dedicated API endpoint for profile images
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const apiPath = `/api/users/profile-image/${filename}`;
      
      // Add cache busting
      const timestamp = Date.now();
      src = `${backendUrl}${apiPath}?t=${timestamp}`;
      
      console.log("Using profile image API endpoint:", src);
    } else {
      src = currentUser.profile_image_url;
    }
  }
  
  // Add a unique timestamp to force re-rendering of the avatar
  const uniqueKey = `avatar-${currentUser.profile_image_url || ''}-${Date.now()}`;
  
  console.log("Rendering ProfileAvatar with src:", src);
  
  return (
    <Flex 
      position="fixed" 
      top="4" 
      right="4" 
      zIndex="10"
      justify="flex-end"
    >
      <Tooltip label="View Profile" placement="bottom">
        <Avatar
          key={uniqueKey}
          size="md"
          name={name}
          src={imageError ? '/assets/default-avatar.png' : src}
          bg="chess-light"
          color="white"
          cursor="pointer"
          onClick={() => navigate('/profile')}
          _hover={{ 
            transform: 'scale(1.05)',
            shadow: "md" 
          }}
          transition="all 0.2s"
          onError={() => {
            console.error("Avatar image failed to load:", src);
            setImageError(true);
          }}
          crossOrigin="anonymous"
        />
      </Tooltip>
    </Flex>
  );
};

function App() {
  // Prevent default behavior for form elements
  useEffect(() => {
    const preventDefaultScroll = (e) => {
      if (e.target.tagName === 'BUTTON' || 
          e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA') {
        // Don't prevent default completely as it breaks input functionality
        // Just handle the scroll side effects
        if (e.key === 'Enter') {
          // Prevent any scrolling behavior when Enter is pressed
          // but still allow the form submission
          window.scrollTo({
            top: window.pageYOffset,
            behavior: 'auto'
          });
        }
      }
    };
    
    document.addEventListener('keydown', preventDefaultScroll);
    
    return () => {
      document.removeEventListener('keydown', preventDefaultScroll);
    };
  }, []);
  
  return (
    <ChakraProvider theme={theme}>
      <CSSReset />
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Box 
              display="flex" 
              minH="100vh" 
              id="app-container"
              sx={{
                // Fix for preventing unwanted scrolling
                "& button": {
                  cursor: "pointer"
                },
                // Prevent scrolling on button click in forms
                "& button[type='submit']": {
                  "&:focus": {
                    outline: "none"
                  }
                }
              }}
            >
              <Sidebar />
              <Box 
                flex="1" 
                display="flex" 
                flexDir="column"
                marginLeft={{ base: 0, md: "60px" }}
                transition="margin-left 0.3s ease-in-out"
                width="100%"
                maxW="100vw"
                overscrollBehavior="none" // Prevent scroll chaining
              >
                {/* Global avatar in top-right corner */}
                <ProfileAvatar />
                
                <Box 
                  as="main" 
                  flexGrow="1" 
                  p={{ base: 4, md: 8 }} 
                  pt={{ base: 16, md: 8 }} /* Added top padding for mobile */
                  width="100%"
                  overscrollBehavior="none" // Prevent scroll chaining
                >
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/oauth/callback" element={<OAuthCallback />} />
                    <Route path="/lobby" element={<PrivateRoute><GameLobby /></PrivateRoute>} />
                    <Route path="/play-friend" element={<PrivateRoute><PlayWithFriendPage /></PrivateRoute>} />
                    <Route path="/play-computer" element={<PrivateRoute><ComputerGamePage /></PrivateRoute>} />
                    <Route path="/game/:gameId" element={<PrivateRoute><GamePage /></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/game-replay/:gameId" element={<GameReplayPage />} />
                    <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>}>
                      <Route path="" element={<Navigate to="profile" />} />
                      <Route path="profile" element={<ProfileSettings />} />
                      <Route path="theme" element={<ThemeSettings />} />
                    </Route>
                  </Routes>
                </Box>
              </Box>
            </Box>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;