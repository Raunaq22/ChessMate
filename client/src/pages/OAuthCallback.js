import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { updateUser, setIsAuthenticated } = React.useContext(AuthContext);
  
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('Starting OAuth callback handling...');
        
        // Get token from URL hash
        const hash = location.hash.substring(1); // Remove the # symbol
        console.log('Hash from URL:', hash);
        
        const params = new URLSearchParams(hash);
        const token = params.get('token');
        console.log('Token received:', token ? 'Yes' : 'No');
        
        if (!token) {
          throw new Error('No authentication token received');
        }
        
        // Store token
        localStorage.setItem('token', token);
        console.log('Token stored in localStorage');
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Axios header set with token');
        
        // Get user data
        console.log('Fetching user data from:', `${process.env.REACT_APP_API_URL}/api/auth/verify`);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/verify`);
        console.log('User data received:', response.data);
        
        if (!response.data || !response.data.user) {
          throw new Error('Invalid user data received');
        }
        
        // Update user context
        updateUser(response.data.user);
        setIsAuthenticated(true);
        console.log('User context updated');
        
        // Redirect to home page
        console.log('Redirecting to home page...');
        navigate('/');
      } catch (err) {
        console.error('OAuth callback error:', err);
        console.error('Error details:', err.response?.data || err.message);
        setError(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };
    
    handleOAuthCallback();
  }, [location, navigate, updateUser, setIsAuthenticated]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Authentication Error</p>
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Login
        </button>
      </div>
    );
  }
  
  return null;
};

export default OAuthCallback;