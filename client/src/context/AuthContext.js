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
          if (res.data && res.data.user) {
            setCurrentUser(res.data.user);
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Token verification error:', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setCurrentUser(null);
          setIsAuthenticated(false);
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
      throw error.response?.data || error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/register`,
        { username, email, password }
      );
      
      if (!res.data || !res.data.token) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error.response?.data || error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Update user function
  const updateUser = (userData) => {
    console.log('Updating user data:', userData);
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
        updateUser,
        setIsAuthenticated
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};