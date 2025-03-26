import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const gameService = {
  getAvailableGames: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get(`${API_URL}/api/games/available`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw error;
    }
  },

  createGame: async (payload = {}) => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('userData');
      
      if (!token || !userData) {
        throw new Error('No authentication data found');
      }

      // Parse user data
      const user = JSON.parse(userData);
      
      // Validate and normalize time control parameters
      const validatedPayload = {
        userId: user.user_id,
        username: user.username,
        timeControl: payload.initialTime ? Number(payload.initialTime) : 600,
        createFriendGame: Boolean(payload.createFriendGame)
      };

      console.log('Creating game with validated payload:', validatedPayload);
      
      // Add retry logic for network issues
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          const response = await axios.post(`${API_URL}/api/games`, validatedPayload, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Game service response:', response.data);
          
          // Validate response structure
          if (!response.data) {
            throw new Error('Empty response from server');
          }
          
          if (!response.data.game) {
            throw new Error('Invalid response structure: missing game data');
          }
          
          // Log successful creation
          console.log('Game created successfully:', {
            id: response.data.game.game_id,
            status: response.data.game.status,
            initialTime: response.data.game.white_time,
            increment: response.data.game.increment
          });
          
          return response.data;
        } catch (error) {
          lastError = error;
          if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            window.location.href = '/login?expired=true';
            throw new Error('Authentication failed. Please log in again.');
          } else if (error.response?.status === 400) {
            throw new Error(error.response.data.message || 'Invalid game parameters');
          } else if (!error.response) {
            // Network error, retry
            retries--;
            if (retries > 0) {
              console.log(`Retrying game creation (${retries} attempts left)...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              continue;
            }
          }
          throw error;
        }
      }
      
      throw lastError || new Error('Failed to create game after multiple attempts');
    } catch (error) {
      console.error('Error creating game:', error.response?.data || error);
      throw error;
    }
  },

  joinGame: async (gameId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log(`Attempting to join game ${gameId}`, {
        token: token.substring(0, 10) + '...',
        api_url: API_URL
      });
      
      // First, verify the game exists and is available
      const gameDetails = await this.getGameById(gameId);
      console.log('Game details before joining:', gameDetails);
      
      if (!gameDetails) {
        throw new Error('Game not found');
      }
      
      if (gameDetails.status !== 'waiting') {
        throw new Error('Game is not available for joining');
      }
      
      if (!gameDetails.player1 || !gameDetails.player1.username) {
        console.error('Missing player1 information:', gameDetails);
        throw new Error('Invalid game data: missing player information');
      }
      
      const response = await axios.post(`${API_URL}/api/games/${gameId}/join`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Join game response:', response.data);
      
      // Validate response structure
      if (!response.data) {
        console.error('Empty response from server');
        throw new Error('Invalid response from server');
      }
      
      if (!response.data.game) {
        console.error('No game data in response:', response.data);
        throw new Error('Invalid response from server');
      }
      
      // Ensure player information is present
      if (!response.data.game.player1) {
        console.error('Missing player1 information in response:', response.data);
        throw new Error('Invalid game data: missing player information');
      }
      
      if (!response.data.game.player1.username) {
        console.error('Missing player1 username in response:', response.data);
        throw new Error('Invalid game data: missing player username');
      }
      
      // Log successful join
      console.log('Successfully joined game:', {
        gameId: response.data.game.game_id,
        status: response.data.game.status,
        player1: response.data.game.player1.username,
        player2: response.data.game.player2?.username
      });
      
      return response.data;
    } catch (error) {
      console.error('Error joining game:', error.response?.data || error);
      if (error.response?.status === 404) {
        throw new Error('Game not found or no longer available');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Cannot join this game');
      }
      throw error;
    }
  },
  
  joinGameByCode: async (code) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      console.log(`Sending request to join game with code: ${code}`);
      const response = await axios.post(`${API_URL}/api/games/join-by-code`, { code }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Join by code response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error joining game by code:', error.response?.data || error.message);
      throw error;
    }
  },

  cancelGame: async (gameId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      console.log(`Cancelling game ${gameId}`);
      const response = await axios.delete(`${API_URL}/api/games/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling game:', error);
      throw error;
    }
  },

  getGameById: async (gameId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log(`Fetching game details for game ${gameId}`);
      const response = await axios.get(`${API_URL}/api/games/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Game details response:', response.data);
      
      if (!response.data || !response.data.game) {
        console.error('Invalid response structure:', response.data);
        throw new Error('Invalid response from server');
      }
      
      return response.data.game;
    } catch (error) {
      console.error('Error fetching game details:', error.response?.data || error);
      if (error.response?.status === 404) {
        throw new Error('Game not found');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw error;
    }
  }
};

export default gameService;