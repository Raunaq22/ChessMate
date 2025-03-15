import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import Timer from './Timer';

const STORAGE_KEY = 'chessmate_game_state';

const loadSavedGameState = (gameId) => {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY}_${gameId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load saved game state:', error);
  }
  return null;
};

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
  const [gameStatus, setGameStatus] = useState(null);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [isWhiteTimerRunning, setIsWhiteTimerRunning] = useState(false);
  const [isBlackTimerRunning, setIsBlackTimerRunning] = useState(false);
  const [timeIncrement, setTimeIncrement] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerIds, setPlayerIds] = useState({ white: null, black: null });

  useEffect(() => {
    if (!gameId || !currentUser?.user_id) return;

    const savedState = loadSavedGameState(gameId);
    if (savedState) {
      setGame(new Chess(savedState.fen));
      setPosition(savedState.fen);
      setPlayerColor(savedState.playerColor);
      setWhiteTime(savedState.whiteTime);
      setBlackTime(savedState.blackTime);
      setTimeIncrement(savedState.timeIncrement);
      setIsWhiteTimerRunning(savedState.isWhiteTimerRunning);
      setIsBlackTimerRunning(savedState.isBlackTimerRunning);
      setPlayerIds(savedState.playerIds);
      setGameStarted(savedState.gameStarted);
      setMoveHistory(savedState.moveHistory);
    }

    const newSocket = io(process.env.REACT_APP_API_URL, {
      withCredentials: true,
      query: { 
        gameId, 
        userId: currentUser.user_id 
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to game server');
      newSocket.emit('joinGame', { gameId, userId: currentUser.user_id });
    });

    newSocket.on('gameState', ({ 
      fen, 
      playerColor, 
      initialTime, 
      increment, 
      isWhiteTimerRunning, 
      isBlackTimerRunning,
      whitePlayerId,
      blackPlayerId,
      started
    }) => {
      console.log('Game state received', {
        playerColor,
        started,
        whitePlayerId,
        blackPlayerId
      });
      
      const newGame = new Chess(fen);
      setGame(newGame);
      setPosition(fen);
      setPlayerColor(playerColor);
      setWhiteTime(initialTime);
      setBlackTime(initialTime);
      setTimeIncrement(increment);
      setIsWhiteTimerRunning(isWhiteTimerRunning);
      setIsBlackTimerRunning(isBlackTimerRunning);
      setPlayerIds({ white: whitePlayerId, black: blackPlayerId });
      setGameStarted(started);
    });

    newSocket.on('move', ({ fen, moveNotation, isWhiteTimerRunning, isBlackTimerRunning }) => {
      try {
        const newGame = new Chess(fen);
        setGame(newGame);
        setPosition(fen);
        setIsWhiteTimerRunning(isWhiteTimerRunning);
        setIsBlackTimerRunning(isBlackTimerRunning);
        setMoveHistory(prev => [...prev, { notation: moveNotation, fen }]);
      } catch (error) {
        console.error('Error processing received move:', error);
      }
    });

    newSocket.on('playerDisconnected', ({ message }) => {
      setDisconnected(true);
      setGameError(message);
      setTimeout(() => navigate('/lobby'), 3000);
    });

    newSocket.on('timeUpdate', ({ color, timeLeft }) => {
      if (color === 'white') {
        setWhiteTime(timeLeft);
      } else {
        setBlackTime(timeLeft);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [gameId, currentUser?.user_id, navigate]);

  useEffect(() => {
    if (gameId && gameStarted) {
      const gameState = {
        fen: game.fen(),
        playerColor,
        whiteTime,
        blackTime,
        timeIncrement,
        isWhiteTimerRunning,
        isBlackTimerRunning,
        playerIds,
        gameStarted,
        moveHistory
      };
      
      localStorage.setItem(`${STORAGE_KEY}_${gameId}`, JSON.stringify(gameState));
    }
  }, [
    gameId,
    game,
    playerColor,
    whiteTime,
    blackTime,
    timeIncrement,
    isWhiteTimerRunning,
    isBlackTimerRunning,
    playerIds,
    gameStarted,
    moveHistory
  ]);

  useEffect(() => {
    return () => {
      if (gameId) {
        localStorage.removeItem(`${STORAGE_KEY}_${gameId}`);
      }
    };
  }, [gameId]);

  const onPieceDragStart = (piece, sourceSquare) => {
    // Only allow dragging if the game has started
    if (!gameStarted) {
      console.log('Game not started yet - cannot drag');
      return false;
    }
    
    // Get piece color (w = white, b = black)
    const pieceColor = piece[0] === 'w' ? 'white' : 'black';
    
    // Check if the player is moving their own color pieces
    if (pieceColor !== playerColor) {
      console.log('Cannot move opponent pieces');
      return false;
    }
    
    // Check if it's the player's turn
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    if (currentTurn !== playerColor) {
      console.log('Not your turn');
      return false;
    }
    
    // Get possible moves for the piece
    const moves = game.moves({ square: sourceSquare, verbose: true });
    const targetSquares = moves.map(move => move.to);
    console.log('Possible moves:', targetSquares); // Debug to see if moves are being found
    setPossibleMoves(targetSquares);
    return true;
  };

  const checkGameStatus = (chess) => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      setGameStatus(`Checkmate! ${winner} wins!`);
      return true;
    } else if (chess.isDraw()) {
      setGameStatus('Game Draw');
      return true;
    } else if (chess.isCheck()) {
      setGameStatus('Check!');
      return false;
    }
    setGameStatus(null);
    return false;
  };

// For the onDrop function, let's add clearer debugging
const onDrop = (sourceSquare, targetSquare) => {
  try {
    console.log('Move attempt:', sourceSquare, 'to', targetSquare);
    console.log('Game state:', gameStarted, playerColor, game.turn());
    
    // Check if game has started
    if (!gameStarted) {
      console.log('Game not started yet');
      return false;
    }

    // Current turn color
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    
    // Check if it's this player's turn
    if (currentTurn !== playerColor) {
      console.log('Not your turn');
      return false;
    }

    // Try the move directly on a new instance
    const gameCopy = new Chess(game.fen());
    
    // Log the current FEN for debugging
    console.log('Current FEN before move:', gameCopy.fen());
    
    const move = gameCopy.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });

    // Log the move result
    console.log('Move result:', move);
    
    if (!move) {
      console.log('Invalid move');
      return false;
    }

    const isWhiteTurnAfter = gameCopy.turn() === 'w';
    console.log('New FEN after move:', gameCopy.fen());
    
    // Update local state with the new game
    setGame(gameCopy);
    setPosition(gameCopy.fen());
    setIsWhiteTimerRunning(isWhiteTurnAfter);
    setIsBlackTimerRunning(!isWhiteTurnAfter);
    
    // Add move to history
    setMoveHistory(prev => [...prev, { notation: move.san, fen: gameCopy.fen() }]);
    
    const isGameOver = checkGameStatus(gameCopy);
    
    // Notify server with explicit console logs
    console.log('Emitting move to server:', {
      gameId,
      from: sourceSquare,
      to: targetSquare,
      fen: gameCopy.fen()
    });
    
    socket.emit('move', {
      gameId,
      move: { from: sourceSquare, to: targetSquare },
      fen: gameCopy.fen(),
      moveNotation: move.san,
      whiteTimeLeft: whiteTime,
      blackTimeLeft: blackTime,
      isWhiteTimerRunning: isWhiteTurnAfter,
      isBlackTimerRunning: !isWhiteTurnAfter,
      isGameOver
    });
    
    setPossibleMoves([]);
    return true;
  } catch (error) {
    console.error('Move error:', error);
    return false;
  }
};

  const handleTimeUp = (color) => {
    setGameStatus(`${color === 'w' ? 'Black' : 'White'} wins on time!`);
    socket?.emit('gameOver', {
      gameId,
      winner: color === 'w' ? 'black' : 'white',
      reason: 'timeout'
    });
  };

  const handleTimeUpdate = useCallback((color, timeLeft) => {
    if (socket) {
      socket.emit('timeUpdate', { gameId, color, timeLeft });
    }
  }, [gameId, socket]);

  // Determine which player is playing which color
  const whitePlayer = playerIds.white === currentUser?.user_id ? 'You' : 'Opponent';
  const blackPlayer = playerIds.black === currentUser?.user_id ? 'You' : 'Opponent';

  // For debugging purposes
  console.log('Render state:', {
    gameStarted,
    playerColor,
    currentTurn: game.turn() === 'w' ? 'white' : 'black',
    canMove: gameStarted && game.turn() === (playerColor === 'white' ? 'w' : 'b')
  });

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4">
      {disconnected && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Opponent disconnected. Returning to lobby...
        </div>
      )}
      {gameError && (
        <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {gameError}
        </div>
      )}
      {gameStatus && (
        <div className={`w-full ${gameStatus.includes('wins') ? 'bg-green-100 border-green-400 text-green-700' : 'bg-blue-100 border-blue-400 text-blue-700'} px-4 py-3 rounded mb-4`}>
          {gameStatus}
        </div>
      )}
<div className="flex flex-col items-center w-full md:w-2/3">
  <div className="mb-4 flex justify-between w-full">
    <div className="font-bold">
      {playerColor === 'white' ? blackPlayer : whitePlayer} ({playerColor === 'white' ? 'Black' : 'White'})
    </div>
    <Timer
      initialTime={playerColor === 'white' ? blackTime : whiteTime}
      increment={timeIncrement}
      isRunning={(playerColor === 'white' ? isBlackTimerRunning : isWhiteTimerRunning) && gameStarted}
      onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'b' : 'w')}
      onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'black' : 'white', time)}
    />
  </div>

  <Chessboard 
  position={position}
  onPieceDrop={onDrop}
  onPieceDragBegin={onPieceDragStart}
  boardOrientation={playerColor}
  customSquareStyles={possibleMoves.reduce((obj, square) => {
    obj[square] = {
      background: 'radial-gradient(circle, rgba(0,0,0,0.1) 25%, transparent 25%)',
      borderRadius: '50%'
    };
    return obj;
  }, {})}
/>

  <div className="mt-4 flex justify-between w-full">
    <div className="font-bold">
      {playerColor === 'white' ? whitePlayer : blackPlayer} ({playerColor === 'white' ? 'White' : 'Black'})
    </div>
    <Timer
      initialTime={playerColor === 'white' ? whiteTime : blackTime}
      increment={timeIncrement}
      isRunning={(playerColor === 'white' ? isWhiteTimerRunning : isBlackTimerRunning) && gameStarted}
      onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'w' : 'b')}
      onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'white' : 'black', time)}
    />
  </div>
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