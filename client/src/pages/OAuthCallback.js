import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processOAuthCallback } from '../services/oauth/oauthService';
import { AuthContext } from '../context/AuthContext';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setCurrentUser, setIsAuthenticated } = useContext(AuthContext);
  
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('Starting OAuth callback handling');
        const result = await processOAuthCallback(location.search);
        
        if (result.success && result.user) {
          console.log('OAuth successful, updating user state');
          setCurrentUser(result.user);
          setIsAuthenticated(true);
          
          // Force navigation to home page
          window.location.href = '/';
          return;
        } else {
          console.error('OAuth failed:', result.error);
          setError(result.error || 'Authentication failed');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Failed to complete authentication');
      } finally {
        setLoading(false);
      }
    };
    
    handleOAuthCallback();
  }, [location, setCurrentUser, setIsAuthenticated]);
  
  // Redirect to home if we somehow get stuck here after successful auth
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !loading && !error) {
      window.location.href = '/';
    }
  }, [loading, error]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        <div className="ml-4 text-gray-600">Completing authentication...</div>
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
          onClick={() => window.location.href = '/login'}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Login
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600">Redirecting to home page...</div>
    </div>
  );
};

export default OAuthCallback;