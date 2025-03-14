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
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);

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
      console.log('Connected to game server');
      newSocket.emit('joinGame', { gameId, userId: currentUser.user_id });
    });

    newSocket.on('gameState', ({ fen, playerColor }) => {
      setPosition(fen);
      setPlayerColor(playerColor);
    });

    newSocket.on('move', ({ from, to, fen, moveNotation }) => {
      try {
        const newGame = new Chess(fen);
        setGame(newGame);
        setPosition(fen);
        
        setMoveHistory(prev => [...prev, {
          notation: moveNotation,
          color: newGame.turn() === 'w' ? 'Black' : 'White',
          fen: fen
        }]);
      } catch (error) {
        console.error('Error processing received move:', error);
      }
    });

    newSocket.on('playerDisconnected', ({ message }) => {
      setGameError(message);
      setTimeout(() => navigate('/lobby'), 3000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [gameId, currentUser?.user_id, navigate]);

  const onPieceDragStart = (piece, sourceSquare) => {
    // Only allow moving pieces if it's player's turn
    if ((game.turn() === 'w' && playerColor !== 'white') ||
        (game.turn() === 'b' && playerColor !== 'black')) {
      return false;
    }

    // Get possible moves for the selected piece
    const moves = game.moves({
      square: sourceSquare,
      verbose: true
    });
    setPossibleMoves(moves.map(move => move.to));
    return true;
  };

  const onDrop = (sourceSquare, targetSquare) => {
    try {
      // Create a new chess instance for the move
      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move) {
        // Update local state
        setGame(newGame);
        setPosition(newGame.fen());
        
        // Add move to history with correct notation
        const notation = {
          notation: move.san,
          color: move.color === 'w' ? 'White' : 'Black',
          fen: newGame.fen(),
          moveNumber: Math.floor(newGame.moveNumber() / 2) + 1
        };
        setMoveHistory(prev => [...prev, notation]);

        // Emit move to server
        socket.emit('move', {
          gameId,
          move: { from: sourceSquare, to: targetSquare },
          fen: newGame.fen(),
          moveNotation: move.san,
          moveNumber: notation.moveNumber
        });

        setPossibleMoves([]);
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    return false;
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4">
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
          onPieceDragBegin={onPieceDragStart}
          boardOrientation={playerColor} // Add this line to flip board based on player's color
          customSquareStyles={{
            ...possibleMoves.reduce((obj, square) => ({
              ...obj,
              [square]: {
                background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                borderRadius: '50%'
              }
            }), {})
          }}
        />
      </div>
      
      <div className="w-full md:w-1/3">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-bold mb-4">Game History</h2>
          <div className="h-96 overflow-y-auto">
            {moveHistory.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                  const moveIdx = idx * 2;
                  const whiteMove = moveHistory[moveIdx];
                  const blackMove = moveHistory[moveIdx + 1];
                  return (
                    <React.Fragment key={idx}>
                      <span className="text-gray-500">{idx + 1}.</span>
                      <span className="text-black">{whiteMove?.notation || ''}</span>
                      <span className="text-gray-700">{blackMove?.notation || ''}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No moves yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessGame;