import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import OAuthButtons from './OAuth/OAuthButtons';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for expired token message
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const expired = params.get('expired') === 'true';
    const verificationError = params.get('error') === 'verification_failed';
    
    if (expired) {
      setError('Your session has expired. Please log in again.');
    } else if (verificationError) {
      setError('There was an issue verifying your session. Please log in again.');
      // Clear any existing token when verification fails
      localStorage.removeItem('token');
    }
    
    // Clear the error parameters from the URL
    if (expired || verificationError) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location]);
  
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Clear any existing token before attempting login
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      await login(email, password);
      // Clear any existing error parameters from URL
      window.history.replaceState({}, '', window.location.pathname);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Sign in</h2>
          <p className="text-gray-300">Enter your email below to sign in to your account</p>
        </div>
        
        {error && (
          <div className="p-4 border rounded-md bg-red-100 border-red-300 text-red-700 mb-6">
            <p>{error}</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg p-6 shadow-xl border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <input
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-chess-hover">
                  Forgot password?
                </Link>
              </div>
              <input
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-md bg-primary hover:bg-chess-hover text-white font-medium transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in with Email'}
            </button>
          </form>
          
          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR CONTINUE WITH</span>
            </div>
          </div>
          
          <div className="mt-6">
            <OAuthButtons />
          </div>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Don't have an account?</span>{' '}
            <Link to="/register" className="font-medium text-primary hover:text-chess-hover">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;