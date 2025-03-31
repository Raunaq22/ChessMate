import React from 'react';
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
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return url;
};

// Profile Avatar Component - will only be rendered when AuthContext is available
const ProfileAvatar = () => {
  const { currentUser, isAuthenticated } = React.useContext(AuthContext);
  const navigate = useNavigate();
  
  if (!isAuthenticated || !currentUser) return null;
  
  const name = currentUser.username || 'User';
  const src = formatImageUrl(currentUser.profile_image_url);
  
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
          size="md"
          name={name}
          src={src}
          bg="chess-light"
          color="white"
          cursor="pointer"
          onClick={() => navigate('/profile')}
          _hover={{ 
            transform: 'scale(1.05)',
            shadow: "md" 
          }}
          transition="all 0.2s"
        />
      </Tooltip>
    </Flex>
  );
};

function App() {
  return (
    <ChakraProvider theme={theme}>
      <CSSReset />
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Box display="flex" minH="100vh">
              <Sidebar />
              <Box 
                flex="1" 
                display="flex" 
                flexDir="column"
                marginLeft={{ base: 0, md: "60px" }}
                transition="margin-left 0.3s ease-in-out"
                width="100%"
                maxW="100vw"
              >
                {/* Global avatar in top-right corner */}
                <ProfileAvatar />
                
                <Box 
                  as="main" 
                  flexGrow="1" 
                  p={{ base: 4, md: 8 }} 
                  pt={{ base: 16, md: 8 }} /* Added top padding for mobile */
                  width="100%"
                >
                  <Routes>
                    <Route path="/" element={<Home />} />
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