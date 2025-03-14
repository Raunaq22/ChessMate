import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';

const ChessGame = () => {
  const { gameId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [socket, setSocket] = useState(null);
  const [position, setPosition] = useState('start');
  const [playerColor, setPlayerColor] = useState('white');
  const [gameError, setGameError] = useState(null);
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!gameId || !currentUser?.user_id) return;

    const newSocket = io(process.env.REACT_APP_API_URL, {
      withCredentials: true,
      query: { 
        gameId,
        userId: currentUser.user_id
      }
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [gameId, currentUser?.user_id]);

  useEffect(() => {
    if (!gameId || !currentUser?.user_id) return;

    const newSocket = io(process.env.REACT_APP_API_URL, {
      withCredentials: true,
      query: { gameId, userId: currentUser.user_id }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('joinGame', { gameId, userId: currentUser.user_id });
    });

    newSocket.on('gameState', (gameState) => {
      console.log('Received game state:', gameState);
      if (gameState.fen) {
        game.load(gameState.fen);
        setPosition(gameState.fen);
      }
      setPlayerColor(gameState.playerColor);
    });

    newSocket.on('move', ({ from, to }) => {
      console.log('Received move:', { from, to });
      try {
        const moveResult = game.move({ from, to });
        if (moveResult) {
          setPosition(game.fen());
        }
      } catch (error) {
        console.error('Invalid move received:', error);
      }
    });

    newSocket.on('playerDisconnected', ({ message }) => {
      console.log('Opponent disconnected:', message); // Debug log
      setDisconnected(true);
      alert(message);
      // Give time for the alert to be seen
      setTimeout(() => {
        setDisconnected(false);
        navigate('/lobby');
      }, 2000);
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      console.log('Cleaning up socket connection'); // Debug log
      if (newSocket) {
        newSocket.emit('leaveGame', { gameId, userId: currentUser.user_id });
        newSocket.disconnect();
      }
    };
  }, [gameId, currentUser?.user_id, navigate]);

  const onDrop = (sourceSquare, targetSquare) => {
    try {
      const moveResult = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // always promote to queen for simplicity
      });

      if (moveResult === null) return false;

      setPosition(game.fen());
      socket.emit('move', {
        gameId,
        move: { from: sourceSquare, to: targetSquare },
        fen: game.fen()
      });

      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {disconnected && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          Opponent disconnected. Returning to lobby...
        </div>
      )}
      {gameError && (
        <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {gameError}
        </div>
      )}
      <div className="w-full md:w-2/3">
        <Chessboard
          position={position}
          onPieceDrop={onDrop}
          boardOrientation={playerColor}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
          }}
        />
      </div>
      <div className="w-full md:w-1/3">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-4">Game Info</h2>
          <div className="space-y-2">
            <p>Game ID: {gameId}</p>
            <p>Your Color: {playerColor}</p>
            <p>Status: {game.isGameOver() ? 'Game Over' : 'Active'}</p>
            {game.isGameOver() && (
              <p className="text-lg font-bold">
                {game.isCheckmate() ? 'Checkmate!' : 'Game Over'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessGame;