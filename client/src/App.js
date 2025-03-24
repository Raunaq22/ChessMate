import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/Auth/PrivateRoute';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { AuthProvider } from './context/AuthContext';
import ChessGame from './components/Game/ChessGame';
import GameLobby from './components/Game/GameLobby';
import PlayWithFriendPage from './pages/PlayWithFriendPage';
import ComputerGamePage from './pages/ComputerGamePage';
import GameReplayPage from './pages/GameReplayPage';
import SettingsPage from './pages/SettingsPage';
import ProfileSettings from './pages/Settings/ProfileSettings';
import ThemeSettings from './pages/Settings/ThemeSettings';
import NotificationSettings from './pages/Settings/NotificationSettings';
import PrivacySettings from './pages/Settings/PrivacySettings';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-gray-100">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                  path="/lobby" 
                  element={
                    <PrivateRoute>
                      <GameLobby />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/play-friend" 
                  element={
                    <PrivateRoute>
                      <PlayWithFriendPage />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/play-computer" 
                  element={
                    <PrivateRoute>
                      <ComputerGamePage />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/game/:gameId" 
                  element={
                    <PrivateRoute>
                      <ChessGame />
                    </PrivateRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <PrivateRoute>
                      <ProfilePage />
                    </PrivateRoute>
                  } 
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/game-replay/:gameId" element={<GameReplayPage />} />
                <Route 
                  path="/settings" 
                  element={
                    <PrivateRoute>
                      <SettingsPage />
                    </PrivateRoute>
                  }
                >
                  <Route path="" element={<Navigate to="profile" />} />
                  <Route path="profile" element={<ProfileSettings />} />
                  <Route path="theme" element={<ThemeSettings />} />
                  <Route path="notifications" element={<NotificationSettings />} />
                  <Route path="privacy" element={<PrivacySettings />} />
                </Route>
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;