import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import OAuthButtons from './OAuth/OAuthButtons';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleSubmit = async e => {
    e.preventDefault();
    
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center min-h-screen">
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
          <form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            method="post"
          >
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