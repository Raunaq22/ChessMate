import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const gameService = {
  getAvailableGames: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games/available`);
      console.log('Game service response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Game service error:', error);
      throw error;
    }
  },

  createGame: async (params = {}) => {
    console.log('Creating game with params:', params);
    
    // Use default values for any missing parameters
    const timeControl = params.timeControl || 'rapid';
    const initialTime = params.initialTime !== undefined ? Number(params.initialTime) : 600;
    const increment = Number(params.increment || 0);
  
    // Create a validated payload with proper types
    const payload = {
      timeControl: timeControl,
      initialTime: initialTime, // Must be a number
      increment: increment // Must be a number
    };
    
    console.log('Sending validated payload:', payload);
  
    try {
      const response = await axios.post(`${API_URL}/api/games`, payload);
      console.log('Game service response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  },

  joinGame: async (gameId) => {
    const response = await axios.post(`${API_URL}/api/games/${gameId}/join`);
    return response.data;
  },

  cancelGame: async (gameId) => {
    const response = await axios.delete(`${API_URL}/api/games/${gameId}`);
    return response.data;
  }
};

export default gameService;