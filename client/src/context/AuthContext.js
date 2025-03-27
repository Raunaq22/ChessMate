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
          const res = await api.get('/api/auth/verify');
          setCurrentUser(res.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Verification error:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // Function to update activity
  const updateActivity = async () => {
    try {
      await api.post('/api/auth/activity');
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  // Call it on successful login and setup an interval
  useEffect(() => {
    if (isAuthenticated) {
      updateActivity();
      const interval = setInterval(updateActivity, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Login function
  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email });
      const res = await api.post('/api/auth/login', { email, password });
      
      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', res.data.token);
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      return res.data;
    } catch (error) {
      console.error('Login error:', error);
      throw {
        message: error.response?.data?.message || 'Login failed',
        status: error.response?.status || 500
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await api.post('/api/auth/register', { 
        username, 
        email, 
        password 
      });
      
      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', res.data.token);
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw {
        message: error.response?.data?.message || 'Registration failed',
        status: error.response?.status || 500
      };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Add updateUser function
  const updateUser = (userData) => {
    // Update the current user in state
    setCurrentUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        updateUser // Add this to the context value
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};