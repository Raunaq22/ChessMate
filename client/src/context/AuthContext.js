import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

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
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/verify`);
          setCurrentUser(res.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // Function to update activity
  const updateActivity = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/activity`);
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
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        email,
        password
      });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      return res.data;
    } catch (error) {
      throw error.response.data;
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
      
      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }
      
      // Set auth state after successful registration
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        throw new Error(error.response.data.message || 'Registration failed');
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('Network error - Cannot connect to server');
      } else {
        // Something happened in setting up the request
        throw new Error('Error setting up request');
      }
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
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