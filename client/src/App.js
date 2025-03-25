import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import PrivateRoute from './components/Auth/PrivateRoute';
import Sidebar from './components/common/Sidebar';
import Home from './pages/Home';
import ProfilePage from './pages/ProfilePage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { AuthProvider } from './context/AuthContext';
import GamePage from './pages/GamePage';
import GameLobby from './components/Game/GameLobby';
import PlayWithFriendPage from './pages/PlayWithFriendPage';
import ComputerGamePage from './pages/ComputerGamePage';
import GameReplayPage from './pages/GameReplayPage';
import SettingsPage from './pages/SettingsPage';
import ProfileSettings from './pages/Settings/ProfileSettings';
import ThemeSettings from './pages/Settings/ThemeSettings';
import NotificationSettings from './pages/Settings/NotificationSettings';
import PrivacySettings from './pages/Settings/PrivacySettings';
import OAuthCallback from './pages/OAuthCallback';
import { ThemeProvider } from './context/ThemeContext';
import theme from './config/theme'; // Ensure this path is correct

function App() {
  return (
    <ChakraProvider theme={theme}>
      <CSSReset />
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <div className="flex min-h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <main className="flex-grow p-4 md:p-8">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/oauth-callback" element={<OAuthCallback />} />
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
                      <Route path="notifications" element={<NotificationSettings />} />
                      <Route path="privacy" element={<PrivacySettings />} />
                    </Route>
                  </Routes>
                </main>
              </div>
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;