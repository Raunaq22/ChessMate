import api from '../api';

// Handle OAuth callback and token processing
export const processOAuthCallback = async (queryParams) => {
  try {
    // Get token from URL params
    const params = new URLSearchParams(queryParams);
    const token = params.get('token');
    
    console.log('Processing OAuth callback with token:', token ? 'present' : 'missing');
    
    if (!token) {
      throw new Error('No authentication token received');
    }
    
    // Store token
    localStorage.setItem('token', token);
    
    // Set token in api instance
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get user data
    console.log('Fetching user data from /api/auth/verify');
    const response = await api.get('/api/auth/verify');
    
    if (!response.data || !response.data.user) {
      console.error('Invalid verify response:', response.data);
      throw new Error('Invalid user data received');
    }

    console.log('Successfully verified user:', response.data.user.username);
    
    return {
      success: true,
      user: response.data.user
    };
  } catch (error) {
    console.error('OAuth callback processing error:', error.response || error);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Authentication failed'
    };
  }
};