import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
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
    return null;
  }
  return null;
};

const ChessGame = () => {
  // Remove gameError and isInitialRender
  const { gameId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [socket, setSocket] = useState(null);
  const [position, setPosition] = useState('start');
  const [playerColor, setPlayerColor] = useState('white');
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
  const gameInitialized = useRef(false);
  const loadedFromStorage = useRef(false);
  const [firstMoveMade, setFirstMoveMade] = useState(false);

  useEffect(() => {
    if (!gameId || !currentUser || !currentUser.user_id) return;

    const savedState = loadSavedGameState(gameId);
    if (savedState) {
      setGame(new Chess(savedState.fen));
      setPosition(savedState.fen);
      setPlayerColor(savedState.playerColor);
      setWhiteTime(Math.max(0, savedState.whiteTime || 0));
      setBlackTime(Math.max(0, savedState.blackTime || 0));
      setTimeIncrement(savedState.timeIncrement || 0);
      setIsWhiteTimerRunning(false);
      setIsBlackTimerRunning(false);
      setPlayerIds(savedState.playerIds);
      setGameStarted(true);
      setMoveHistory(savedState.moveHistory || []);
      loadedFromStorage.current = true;
      gameInitialized.current = true;
    }

    const newSocket = io(process.env.REACT_APP_API_URL, {
      withCredentials: true,
      query: { 
        gameId, 
        userId: currentUser.user_id 
      }
    });

    newSocket.on('connect', () => {
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
      started,
      whiteTimeLeft,
      blackTimeLeft,
      firstMoveMade: serverFirstMoveMade
    }) => {
      const newGame = new Chess(fen);
      
      setGame(newGame);
      setPosition(fen);
      setPlayerColor(playerColor);
      setPlayerIds({ white: whitePlayerId, black: blackPlayerId });
      
      if (serverFirstMoveMade !== undefined) {
        setFirstMoveMade(serverFirstMoveMade);
      }
      
      if (started) {
        setGameStarted(true);
      }
      
      if (!loadedFromStorage.current) {
        if (typeof initialTime === 'number' && initialTime > 0) {
          setWhiteTime(whiteTimeLeft !== undefined ? whiteTimeLeft : initialTime);
          setBlackTime(blackTimeLeft !== undefined ? blackTimeLeft : initialTime);
          setTimeIncrement(increment || 0);
        }
      } else if (whiteTimeLeft !== undefined && blackTimeLeft !== undefined) {
        setWhiteTime(whiteTimeLeft);
        setBlackTime(blackTimeLeft);
      }
      
      const firstMoveStatus = serverFirstMoveMade !== undefined ? serverFirstMoveMade : firstMoveMade;
      const isWhiteTurn = newGame.turn() === 'w';
      
      setIsWhiteTimerRunning(started && firstMoveStatus && isWhiteTurn);
      setIsBlackTimerRunning(started && firstMoveStatus && !isWhiteTurn);
      
      gameInitialized.current = true;
    });

    newSocket.on('move', ({ fen, moveNotation, isWhiteTimerRunning, isBlackTimerRunning, whiteTimeLeft, blackTimeLeft, firstMoveMade: serverFirstMoveMade }) => {
      try {
        const newGame = new Chess(fen);
        setGame(newGame);
        setPosition(fen);
        
        if (serverFirstMoveMade !== undefined) {
          setFirstMoveMade(serverFirstMoveMade);
        } else {
          setFirstMoveMade(true);
        }
        
        if (firstMoveMade || serverFirstMoveMade) {
          setIsWhiteTimerRunning(isWhiteTimerRunning);
          setIsBlackTimerRunning(isBlackTimerRunning);
        }
        
        if (whiteTimeLeft !== undefined) setWhiteTime(whiteTimeLeft);
        if (blackTimeLeft !== undefined) setBlackTime(blackTimeLeft);
        
        setMoveHistory(prev => {
          if (prev.length > 0 && prev[prev.length - 1].notation === moveNotation && prev[prev.length - 1].fen === fen) {
            return prev;
          }
          return [...prev, { notation: moveNotation, fen }];
        });
      } catch (error) {
        console.error('Error processing received move:', error);
      }
    });

    newSocket.on('playerDisconnected', ({ message }) => {
      setDisconnected(true);
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
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [gameId, currentUser, navigate]);

  // Make sure game state is properly initialized when component fully mounts
  useEffect(() => {
    if (gameInitialized.current && game && playerColor) {
      const currentTurn = game.turn() === 'w' ? 'white' : 'black';
      
      if (gameStarted) {
        setIsWhiteTimerRunning(currentTurn === 'white');
        setIsBlackTimerRunning(currentTurn === 'black');
      }
    }
  }, [gameStarted, game, playerColor, firstMoveMade]);

  useEffect(() => {
    if (gameId && gameStarted && gameInitialized.current) {
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
    // Cleanup storage on unmount
    return () => {
      if (gameId) {
        localStorage.removeItem(`${STORAGE_KEY}_${gameId}`);
      }
    };
  }, [gameId]);

  const onPieceDragStart = (piece, sourceSquare) => {
    const isFirstWhiteMove = !gameStarted && game.turn() === 'w' && playerColor === 'white';
    
    if (!isFirstWhiteMove && (!gameStarted || !gameInitialized.current)) {
      return false;
    }
    
    const pieceColor = piece[0] === 'w' ? 'white' : 'black';
    
    if (pieceColor !== playerColor) {
      return false;
    }
    
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    if (currentTurn !== playerColor) {
      return false;
    }
    
    const moves = game.moves({ square: sourceSquare, verbose: true });
    const targetSquares = moves.map(move => move.to);
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

  const onDrop = (sourceSquare, targetSquare) => {
    if (!gameInitialized.current) return false;

    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    if (currentTurn !== playerColor) return false;

    // First check if the move is legal
    const moves = game.moves({ verbose: true });
    const validMove = moves.find(m => 
      m.from === sourceSquare && 
      m.to === targetSquare
    );

    if (!validMove) return false;

    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: validMove.promotion || 'q' // Use the valid move's promotion if available
    });

    if (!move) return false;

    const isFirstMove = !firstMoveMade && currentTurn === 'white';
    if (isFirstMove) {
      setFirstMoveMade(true);
      setGameStarted(true);
    }

    const isWhiteTurnAfter = gameCopy.turn() === 'w';
    setGame(gameCopy);
    setPosition(gameCopy.fen());
    
    if (firstMoveMade || isFirstMove) {
      setIsWhiteTimerRunning(isWhiteTurnAfter);
      setIsBlackTimerRunning(!isWhiteTurnAfter);
    }
    
    setMoveHistory(prev => {
      if (prev.length > 0 && 
          prev[prev.length - 1].notation === move.san && 
          prev[prev.length - 1].fen === gameCopy.fen()) {
        return prev;
      }
      return [...prev, { notation: move.san, fen: gameCopy.fen() }];
    });
    
    const isGameOver = checkGameStatus(gameCopy);
    
    socket.emit('move', {
      gameId,
      move: { 
        from: sourceSquare, 
        to: targetSquare,
        promotion: validMove.promotion || 'q'
      },
      fen: gameCopy.fen(),
      moveNotation: move.san,
      whiteTimeLeft: whiteTime,
      blackTimeLeft: blackTime,
      isWhiteTimerRunning: isWhiteTurnAfter && (firstMoveMade || isFirstMove),
      isBlackTimerRunning: !isWhiteTurnAfter && (firstMoveMade || isFirstMove),
      isGameOver,
      firstMoveMade: true
    });
    
    setPossibleMoves([]);
    return true;
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
      const roundedTime = Math.round(timeLeft);
      socket.emit('timeUpdate', { gameId, color, timeLeft: roundedTime });
    }
  }, [gameId, socket]);

  // Determine which player is playing which color
  const whitePlayer = playerIds.white === currentUser?.user_id ? 'You' : 'Opponent';
  const blackPlayer = playerIds.black === currentUser?.user_id ? 'You' : 'Opponent';

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4">
      {disconnected && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Opponent disconnected. Returning to lobby...
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