import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,  // This is important for CORS
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to handle auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect for actual auth errors from protected endpoints
    // Not for login/register endpoint failures
    if (error.response?.status === 401 && 
        !error.config.url.includes('/login') && 
        !error.config.url.includes('/register')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api; 