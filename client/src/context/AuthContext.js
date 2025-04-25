import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Set token in api instance
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          console.log('Verifying stored token');
          const res = await api.get('/api/auth/verify');
          
          if (res.data && res.data.user) {
            console.log('Token verified, user:', res.data.user.username);
            setCurrentUser(res.data.user);
            setIsAuthenticated(true);
          } else {
            console.log('Invalid user data received');
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
          }
        } catch (error) {
          console.error('Token verification error:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // Function to update activity
  const updateActivity = async () => {
    if (isAuthenticated) {
      try {
        await api.post('/api/auth/activity');
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    }
  };

  // Call updateActivity on mount and set up interval
  useEffect(() => {
    if (isAuthenticated) {
      updateActivity();
      const interval = setInterval(updateActivity, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      
      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', res.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      return res.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setIsAuthenticated(false);
    window.location.replace('/login');
  };

  // Add register function
  const register = async (username, email, password) => {
    try {
      const res = await api.post('/api/auth/register', { username, email, password });
      
      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }
      
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Add the updateUser function
  const updateUser = (userData) => {
    // Update the current user in state
    setCurrentUser(prevState => ({ ...prevState, ...userData }));
    
    // Optionally update user data in localStorage if you store it there
    // For simplicity, we're just updating the state here, 
    // assuming the backend keeps the persistent source of truth.
  };

  const value = {
    currentUser,
    setCurrentUser,
    isAuthenticated,
    setIsAuthenticated,
    loading,
    login,
    logout,
    register,
    updateActivity,
    updateUser // Add updateUser to the context value
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};