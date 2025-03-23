import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import io from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import ChatWindow from '../components/Chat/ChatWindow';
import ThemedChessboard from '../components/Board/ThemedChessboard';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useContext(AuthContext);
  
  const [game, setGame] = useState(new Chess());
  const [gameState, setGameState] = useState({
    status: 'waiting', // waiting, playing, completed
    player1: null,
    player2: null,
    currentTurn: 'w',
    winner: null,
    timeControl: 'Rapid',
  });
  const [socket, setSocket] = useState(null);
  const [orientation, setOrientation] = useState('white');
  const [messages, setMessages] = useState([]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/game/${gameId}` } });
    }
  }, [isAuthenticated, navigate, gameId]);
  
  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    
    const newSocket = io(`${process.env.REACT_APP_API_URL}`, {
      query: { gameId }
    });
    
    setSocket(newSocket);
    
    // Socket event listeners
    newSocket.on('gameState', (data) => {
      setGameState(data);
      
      // Set board orientation based on player assignment
      if (data.player1 && data.player1.id === currentUser.user_id) {
        setOrientation('white');
      } else if (data.player2 && data.player2.id === currentUser.user_id) {
        setOrientation('black');
      }
      
      // Update chess game if moves exist
      if (data.fen) {
        const newGame = new Chess(data.fen);
        setGame(newGame);
      }
    });
    
    newSocket.on('move', (move) => {
      try {
        const newGame = new Chess(game.fen());
        const result = newGame.move(move);
        
        if (result) {
          setGame(newGame);
        }
      } catch (err) {
        console.error('Invalid move', err);
      }
    });
    
    newSocket.on('chat', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('playerDisconnected', ({ message, gameActive }) => {
      // Only redirect if game was still active and not completed
      if (gameActive && gameState.status !== 'completed') {
        alert(message || 'Opponent disconnected. Returning to lobby...');
        setTimeout(() => navigate('/lobby'), 3000);
      } else {
        // Just display a notification for completed games
        alert(message || 'Opponent has left the game.');
      }
    });
    
    // Join the game room
    newSocket.emit('joinGame', { 
      gameId, 
      userId: currentUser.user_id,
      username: currentUser.username
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, currentUser, gameId, game, gameState.status, navigate]);
  
  const onDrop = (sourceSquare, targetSquare) => {
    if (!socket || !isAuthenticated) return false;
    
    try {
      // Check if it's player's turn
      const isWhiteTurn = game.turn() === 'w';
      const isPlayerTurn = 
        (isWhiteTurn && gameState.player1?.id === currentUser.user_id) ||
        (!isWhiteTurn && gameState.player2?.id === currentUser.user_id);
        
      if (!isPlayerTurn) return false;
      
      // Make move
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });
      
      // If illegal move
      if (move === null) return false;
      
      // Update game state
      setGame(new Chess(game.fen()));
      
      // Send move to server
      socket.emit('move', {
        gameId,
        move: {
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
        },
        fen: game.fen()
      });
      
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  };
  
  const sendMessage = (text) => {
    if (!socket || !text.trim()) return;
    
    socket.emit('chat', {
      gameId,
      userId: currentUser.user_id,
      username: currentUser.username,
      text,
      timestamp: new Date().toISOString()
    });
  };
  
  const resignGame = () => {
    if (!socket) return;
    
    socket.emit('resign', {
      gameId,
      userId: currentUser.user_id
    });
  };
  
  const offerDraw = () => {
    if (!socket) return;
    
    socket.emit('offerDraw', {
      gameId,
      userId: currentUser.user_id
    });
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Game #{gameId}</h2>
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {gameState.player1?.username || 'Waiting...'} vs {gameState.player2?.username || 'Waiting...'}
              </span>
              <span>
                {gameState.timeControl} • {gameState.status === 'waiting' ? 'Waiting for opponent' : 
                  gameState.status === 'playing' ? 'Game in progress' : 'Game completed'}
              </span>
            </div>
          </div>
          
          <div className="w-full max-w-md mx-auto mb-4">
            <ThemedChessboard 
              position={game.fen()} 
              onPieceDrop={onDrop}
              boardOrientation={orientation}
              customBoardStyle={{
                borderRadius: '4px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
          </div>
          
          <div className="flex justify-center space-x-4">
            <button 
              onClick={resignGame}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
              disabled={gameState.status !== 'playing'}
            >
              Resign
            </button>
            <button 
              onClick={offerDraw}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
              disabled={gameState.status !== 'playing'}
            >
              Offer Draw
            </button>
          </div>
        </div>
      </div>
      
      <div className="lg:col-span-1">
        <ChatWindow 
          messages={messages} 
          onSendMessage={sendMessage} 
          currentUserId={currentUser?.user_id}
        />
      </div>
    </div>
  );
};

export default GamePage;