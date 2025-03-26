import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in from localStorage
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        try {
          // Set the token in axios defaults
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Restore user from localStorage
          setCurrentUser(JSON.parse(userData));
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error restoring session:', error);
          clearAuthData();
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // Function to update activity and check token validity
  const updateActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      // Try a light API call to verify token is still valid
      await axios.get(`${process.env.REACT_APP_API_URL}/api/health`);
    } catch (error) {
      console.error('Error updating activity:', error);
      if (error.response?.status === 401) {
        // Token is invalid or expired
        clearAuthData();
        window.location.href = '/login?expired=true';
      }
    }
  };

  // Clear all auth data
  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setIsAuthenticated(false);
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
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        email,
        password
      });
      
      if (!res.data || !res.data.token || !res.data.user) {
        throw new Error('Invalid response from server');
      }
      
      // Store data in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userData', JSON.stringify(res.data.user));
      
      // Set token in axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      // Update state
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data;
    } catch (error) {
      console.error('Login error:', error);
      clearAuthData();
      throw error.response?.data || { message: 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      console.log('Attempting registration with:', { username, email }); // Debug log
      
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/register`,
        { username, email, password },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Server response:', res.data); // Debug log
      
      if (!res.data || !res.data.token || !res.data.user) {
        throw new Error('Invalid response from server');
      }
      
      // Store data in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userData', JSON.stringify(res.data.user));
      
      // Set token in axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      // Update state
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response) {
        throw new Error(error.response.data.message || 'Registration failed');
      } else if (error.request) {
        throw new Error('Network error - Cannot connect to server');
      } else {
        throw new Error('Error setting up request');
      }
    }
  };

  // Logout function
  const logout = () => {
    clearAuthData();
  };

  // Update user function
  const updateUser = (userData) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('userData', JSON.stringify(userData));
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
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};