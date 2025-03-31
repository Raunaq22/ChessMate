import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';
import { io } from 'socket.io-client';

// Set default axios configuration
axios.defaults.baseURL = process.env.REACT_APP_API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

// Add JWT token to headers if available - but this will be refreshed for each request
// in the gameService to handle token updates during app lifecycle
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Set up an interceptor to refresh the token on each request
axios.interceptors.request.use(
  config => {
    // Get the latest token before each request
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Configure Socket.IO client
window.socket = io(process.env.REACT_APP_API_URL, {
  withCredentials: true,
  transports: ['websocket'],
  auth: {
    token: localStorage.getItem('token')
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);