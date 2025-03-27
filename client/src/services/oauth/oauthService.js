import api from '../api';

// Handle OAuth callback and token processing
export const processOAuthCallback = async (queryParams) => {
  try {
    // Get token from URL params
    const params = new URLSearchParams(queryParams);
    const token = params.get('token');
    
    if (!token) {
      throw new Error('No authentication token received');
    }
    
    // Store token
    localStorage.setItem('token', token);
    
    // Set token in api instance
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get user data
    const response = await api.get('/api/auth/verify');
    
    return {
      success: true,
      user: response.data.user
    };
  } catch (error) {
    console.error('OAuth callback processing error:', error);
    
    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
};