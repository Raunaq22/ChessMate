import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processOAuthCallback } from '../services/oauth/oauthService';
import { AuthContext } from '../context/AuthContext';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { updateUser } = React.useContext(AuthContext);
  
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get token from URL hash
        const hash = location.hash.substring(1); // Remove the # symbol
        const params = new URLSearchParams(hash);
        const token = params.get('token');
        
        if (!token) {
          throw new Error('No authentication token received');
        }
        
        // Store token
        localStorage.setItem('token', token);
        
        // Get user data
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to verify token');
        }
        
        const userData = await response.json();
        updateUser(userData.user);
        
        // Redirect to home page
        navigate('/');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };
    
    handleOAuthCallback();
  }, [location, navigate, updateUser]);
  
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