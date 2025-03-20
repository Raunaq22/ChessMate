import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import Timer from './Timer';
import ChatWindow from '../Chat/ChatWindow';
import ChatInput from '../Chat/ChatInput';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import useWindowSize from '../../hooks/useWindowSize';

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
  const [playerProfiles, setPlayerProfiles] = useState({ white: null, black: null });
  const [chatMessages, setChatMessages] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [offeringDraw, setOfferingDraw] = useState(false);
  const [drawOfferReceived, setDrawOfferReceived] = useState(false);
  const [boardSize, setBoardSize] = useState(480);
  const containerRef = useRef(null);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  
  const gameInitialized = useRef(false);
  const loadedFromStorage = useRef(false);
  const [firstMoveMade, setFirstMoveMade] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [opponentName, setOpponentName] = useState(null);

  const [moveSquares, setMoveSquares] = useState({});
  const [analysisMode, setAnalysisMode] = useState(false);
  const boardRef = useRef(null);

  // Responsive board size
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newSize = Math.min(containerWidth - 32, 640); // Max size with padding
      setBoardSize(newSize);
    }
  }, [windowWidth, containerRef]);

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
      whitePlayerProfile,
      blackPlayerProfile,
      started,
      whiteTimeLeft,
      blackTimeLeft,
      firstMoveMade: serverFirstMoveMade
    }) => {
      const newGame = new Chess(fen);
      
      setGame(newGame);
      setPosition(fen);
      setPlayerColor(playerColor); 
      
      // Add debug logging for better troubleshooting
      console.log('Game state received:', {
        whitePlayerId, blackPlayerId,
        initialTime, whiteTimeLeft, blackTimeLeft,
        increment
      });
      
      // Ensure both players are tracked properly
      setPlayerIds({ white: whitePlayerId, black: blackPlayerId });
      setPlayerProfiles({ 
        white: whitePlayerProfile || null, 
        black: blackPlayerProfile || null 
      });
      
      // CRITICAL FIX: Set opponentJoined immediately based on player IDs
      if (whitePlayerId && blackPlayerId) {
        setOpponentJoined(true);
      }
      
      // CRITICAL FIX: Only show animation once and briefly
      if (!started && !localStorage.getItem(`${STORAGE_KEY}_${gameId}_seen`)) {
        setShowStartAnimation(true);
        localStorage.setItem(`${STORAGE_KEY}_${gameId}_seen`, 'true');
        setTimeout(() => setShowStartAnimation(false), 2000);
      } else {
        setShowStartAnimation(false); // Ensure it's hidden if already seen
      }
      
      if (serverFirstMoveMade !== undefined) {
        setFirstMoveMade(serverFirstMoveMade);
      }
      
      if (started) {
        setGameStarted(true);
      }
      
      // CRITICAL FIX: Ensure time control is set correctly from server
      // Only override from storage if this is the first time getting game state
      if (!gameInitialized.current) {
        // Make sure we use the server values
        let initTime = initialTime;
        if (typeof initTime !== 'number' || initTime < 1) {
          initTime = 600; // Default 10min only if server value is invalid
        }
        
        setWhiteTime(whiteTimeLeft !== undefined ? whiteTimeLeft : initTime);
        setBlackTime(blackTimeLeft !== undefined ? blackTimeLeft : initTime);
        setTimeIncrement(increment || 0);
        
        console.log('Setting initial times:', {
          white: whiteTimeLeft !== undefined ? whiteTimeLeft : initTime,
          black: blackTimeLeft !== undefined ? blackTimeLeft : initTime,
          increment: increment || 0
        });
      }
      
      const firstMoveStatus = serverFirstMoveMade !== undefined ? serverFirstMoveMade : firstMoveMade;
      const isWhiteTurn = newGame.turn() === 'w';
      
      setIsWhiteTimerRunning(started && firstMoveStatus && isWhiteTurn);
      setIsBlackTimerRunning(started && firstMoveStatus && !isWhiteTurn);
      
      // Fix: Set opponentJoined to true when both players are present
      setOpponentJoined(whitePlayerId && blackPlayerId);
      
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
    
    // Update the socket event listener for chat in ChessGame.js:
    newSocket.on('chat', (message) => {
      console.log('Received chat message:', message);
      // Create a new array to ensure React detects the change
      setChatMessages(prevMessages => {
        // Prevent duplicate messages
        if (prevMessages.some(m => 
          m.userId === message.userId && 
          m.text === message.text &&
          m.timestamp === message.timestamp)) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });
    });
    
    newSocket.on('drawOffer', ({ fromPlayerId }) => {
      if (fromPlayerId !== currentUser.user_id) {
        setDrawOfferReceived(true);
      }
    });
    
    newSocket.on('drawOfferRejected', () => {
      setOfferingDraw(false);
    });
    
    newSocket.on('gameOver', ({ reason, winner }) => {
      if (reason === 'draw') {
        setGameStatus('Game ended in a draw by agreement');
        setGameEnded(true); // Set game ended state
      } else if (reason === 'resignation') {
        const winnerColor = winner === 'white' ? 'White' : 'Black';
        setGameStatus(`${winnerColor} wins by resignation!`);
        setGameEnded(true); // Set game ended state
        
        if ((winner === 'white' && playerIds.white === currentUser.user_id) || 
            (winner === 'black' && playerIds.black === currentUser.user_id)) {
          setShowConfetti(true);
        }
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
        setIsWhiteTimerRunning(currentTurn === 'white' && firstMoveMade);
        setIsBlackTimerRunning(currentTurn === 'black' && firstMoveMade);
      }
    }
  }, [gameStarted, game, playerColor, firstMoveMade]);

  // Fix the dependency array warning
  useEffect(() => {
    if (gameStatus && gameStatus.includes('wins')) {
      const isWinner = (
        (gameStatus.includes('White wins') && playerColor === 'white') || 
        (gameStatus.includes('Black wins') && playerColor === 'black')
      );
      
      if (isWinner) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 8000);
      }
    }
    // We're intentionally not including playerIds and firstMoveMade since we only want
    // this effect to run when the game status or player color changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, playerColor]);

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

  // Fix the overlay issue - check for playerIds directly
  useEffect(() => {
    // If both players have IDs, set opponentJoined to true
    if (playerIds.white && playerIds.black) {
      setOpponentJoined(true);
    }
  }, [playerIds]);

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

  // Update the checkGameStatus function to set gameEnded
  const checkGameStatus = (chess) => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      setGameStatus(`Checkmate! ${winner} wins!`);
      setGameEnded(true); // Set game ended state
      return true;
    } else if (chess.isDraw()) {
      setGameStatus('Game Draw');
      setGameEnded(true); // Set game ended state
      return true;
    } else if (chess.isCheck()) {
      setGameStatus('Check!');
      return false;
    }
    setGameStatus(null);
    return false;
  };

  // Make sure we're handling time increment properly in the move handler
  const onDrop = (sourceSquare, targetSquare) => {
    if (!gameInitialized.current || gameEnded) return false;

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
      promotion: validMove.promotion || 'q'
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
    
    // Add increment to the player whose turn just ended (FIXED)
    if (firstMoveMade || isFirstMove) {
      // No need to add increment here, the Timer component will handle it
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

  // Also update the handleTimeUp function
  const handleTimeUp = (color) => {
    if (gameEnded) return; // Prevent duplicate calls
    
    setGameStatus(`${color === 'w' ? 'Black' : 'White'} wins on time!`);
    setGameEnded(true); // Set game ended state
    
    if ((color === 'w' && playerColor === 'black') || (color === 'b' && playerColor === 'white')) {
      setShowConfetti(true);
    }
    
    socket?.emit('gameOver', {
      gameId,
      winner: color === 'w' ? 'black' : 'white',
      reason: 'timeout'
    });
  };

  // Fix the handleTimeUpdate function
  const handleTimeUpdate = useCallback((color, timeLeft) => {
    if (!socket || gameEnded) return;
    
    const roundedTime = Math.floor(timeLeft);
    
    if (color === 'white' && Math.abs(whiteTime - roundedTime) >= 1) {
      setWhiteTime(roundedTime);
      socket.emit('timeUpdate', { gameId, color: 'white', timeLeft: roundedTime });
    } else if (color === 'black' && Math.abs(blackTime - roundedTime) >= 1) {
      setBlackTime(roundedTime);
      socket.emit('timeUpdate', { gameId, color: 'black', timeLeft: roundedTime });
    }
  }, [socket, gameId, whiteTime, blackTime, gameEnded]);

  // Update the handleSendMessage function to properly handle chat
  const handleSendMessage = (text) => {
    if (!socket || !text || !currentUser) {
      console.error('Cannot send message: missing socket, text, or user');
      return;
    }
    
    const message = {
      text, // <-- just using the text directly
      userId: currentUser.user_id,
      username: currentUser.username,
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending message:', message);
    
    // Add to local state first
    setChatMessages(prev => [...prev, message]);
    
    // Then emit to server
    socket.emit('chat', { gameId, message });
  };

  // Fix handleResign to ensure timers stop
  const handleResign = () => {
    if (gameEnded) return;
    
    const winner = playerColor === 'white' ? 'black' : 'white';
    setGameStatus(`${playerColor === 'white' ? 'Black' : 'White'} wins by resignation`);
    setGameEnded(true);
    
    if (winner !== playerColor) {
      setShowConfetti(true);
    }
    
    socket?.emit('gameOver', {
      gameId,
      winner,
      reason: 'resignation'
    });
  };

  const confirmResign = () => {
    socket?.emit('resign', { 
      gameId,
      playerId: currentUser.user_id,
      color: playerColor
    });
    
    setGameStatus(`${playerColor === 'white' ? 'Black' : 'White'} wins by resignation!`);
    setShowResignConfirm(false);
  };

  const cancelResign = () => {
    setShowResignConfirm(false);
  };

  const handleOfferDraw = () => {
    if (!socket) return;
    
    setOfferingDraw(true);
    socket.emit('offerDraw', {
      gameId,
      fromPlayerId: currentUser.user_id
    });
    
    // Add temporary notification
    setNotification({
      message: 'Draw offer sent',
      type: 'info'
    });
    
    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  // Also update handleAcceptDraw
  const handleAcceptDraw = () => {
    socket?.emit('acceptDraw', { gameId });
    setGameStatus('Game ended in a draw by agreement');
    setGameEnded(true); // Set game ended state
    setDrawOfferReceived(false);
  };

  const handleDeclineDraw = () => {
    socket?.emit('declineDraw', { 
      gameId,
      fromPlayerId: currentUser.user_id
    });
    setDrawOfferReceived(false);
  };
  
  // Fix the PlayerProfile component implementation
  const PlayerProfile = ({ color }) => {
    const isWhite = color === 'white';
    const profile = isWhite ? playerProfiles.white : playerProfiles.black;
    const playerId = isWhite ? playerIds.white : playerIds.black;
    const isCurrentUser = playerId === currentUser?.user_id;
    const username = isCurrentUser ? currentUser.username : (profile?.username || 'Opponent');
    const rating = isCurrentUser ? currentUser.elo_rating || '?' : (profile?.elo_rating || '?');
    
    return (
      <div 
        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
        onClick={() => navigate(`/profile/${playerId}`)}
      >
        <div 
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold"
        >
          {username[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-medium">{username}</div>
          <div className="text-sm flex items-center">
            <span className={color === 'white' ? 'text-yellow-600' : 'text-gray-700'}>
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </span>
            <span className="mx-1">•</span>
            <span className="font-medium text-gray-600">{rating}</span>
          </div>
        </div>
      </div>
    );
  };

  const customPieces = useMemo(() => {
    // You can customize piece styling here if needed
    return {};
  }, []);

  // Ensure the highlightSquares function works for both colors:
  const highlightSquares = useCallback((square) => {
    const moves = game.moves({ square: square, verbose: true });
    if (moves.length === 0) return;
    
    const newSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%'
      };
    });
    setMoveSquares(newSquares);
  }, [game]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Confetti animation */}
      {showConfetti && <Confetti width={windowWidth} height={windowHeight} recycle={false} numberOfPieces={500} />}



      {/* Game status banner */}
      {gameStatus && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className={`w-full mb-4 p-4 rounded-lg shadow-xl text-center ${
            gameStatus.includes('wins') ? 
              (((gameStatus.includes('White wins') && playerColor === 'white') || 
               (gameStatus.includes('Black wins') && playerColor === 'black')) ? 
                 'bg-green-500 text-white' : 'bg-red-500 text-white') : 
              gameStatus.includes('Draw') ? 
                'bg-blue-500 text-white' : 
                'bg-yellow-100 border border-yellow-400 text-yellow-800'
          }`}
        >
          <h2 className="text-xl font-bold">{gameStatus}</h2>
          {(gameStatus.includes('wins') || gameStatus.includes('Draw')) && (
            <button
              onClick={() => navigate('/lobby')}
              className="mt-3 bg-white text-gray-800 px-4 py-2 rounded-full hover:bg-gray-100"
            >
              Back to Lobby
            </button>
          )}
        </motion.div>
      )}

      {/* Disconnection warning */}
      {disconnected && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Opponent disconnected. Returning to lobby...
        </div>
      )}

      {showResignConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-red-600">Confirm Resignation</h3>
            <p className="mb-6">Are you sure you want to resign this game?</p>
            <div className="flex justify-end space-x-4">
              <button 
                onClick={cancelResign}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={confirmResign}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-40 ${
          notification.type === 'info' ? 'bg-blue-100 text-blue-800 border-blue-300' :
          notification.type === 'success' ? 'bg-green-100 text-green-800 border-green-300' :
          'bg-red-100 text-red-800 border-red-300'
        } border`}>
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col items-center" ref={containerRef}>
          {/* Top player (opponent) */}
          <div className="mb-4 w-full flex justify-between items-center bg-white p-4 rounded-lg shadow">
            <PlayerProfile color={playerColor === 'white' ? 'black' : 'white'} />
            <Timer
              initialTime={playerColor === 'white' ? blackTime : whiteTime}
              increment={timeIncrement}
              isRunning={(playerColor === 'white' ? isBlackTimerRunning : isWhiteTimerRunning) && gameStarted && firstMoveMade && !gameEnded}
              onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'b' : 'w')}
              onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'black' : 'white', time)}
              gameEnded={gameEnded}
            />
          </div>

          {/* Chessboard */}
          <div className="w-full max-w-2xl mx-auto lg:mx-0 mb-4">
            <Chessboard 
              id="responsive-board"
              position={position}
              onPieceDrop={onDrop}
              onPieceDragBegin={onPieceDragStart}
              boardOrientation={playerColor}
              boardWidth={boardSize}
              customSquareStyles={possibleMoves.reduce((obj, square) => {
                obj[square] = {
                  background: 'radial-gradient(circle, rgba(0,0,0,0.1) 25%, transparent 25%)',
                  borderRadius: '50%'
                };
                return obj;
              }, {})}
              areArrowsAllowed={true}
              showBoardNotation={true}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }} // Revert to brown
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }} // Revert to brown
              customPieces={customPieces}
              ref={boardRef}
              allowDrag={({ piece }) => {
                // Always allow dragging when in analysis mode
                if (analysisMode) return true;
                // Only allow dragging player's pieces during the game
                return !gameEnded && 
                       ((piece[0] === 'w' && playerColor === 'white') || 
                        (piece[0] === 'b' && playerColor === 'black'));
              }}
            />
          </div>

          {/* Bottom player (user) */}
          <div className="mt-2 mb-4 w-full flex justify-between items-center bg-white p-4 rounded-lg shadow">
            <PlayerProfile color={playerColor} />
            <Timer
              initialTime={playerColor === 'white' ? whiteTime : blackTime}
              increment={timeIncrement}
              isRunning={(playerColor === 'white' ? isWhiteTimerRunning : isBlackTimerRunning) && gameStarted && firstMoveMade && !gameEnded}
              onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'w' : 'b')}
              onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'white' : 'black', time)}
              gameEnded={gameEnded}
            />
          </div>

          {/* Game controls */}
          <div className="w-full flex justify-center space-x-4 mb-4">
            <button
              onClick={handleResign}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              disabled={!gameStarted || gameStatus?.includes('wins') || gameStatus?.includes('Draw')}
            >
              Resign
            </button>
            <button
              onClick={handleOfferDraw}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              disabled={offeringDraw || drawOfferReceived || !gameStarted || gameStatus?.includes('wins') || gameStatus?.includes('Draw')}
            >
              {offeringDraw ? 'Draw Offered' : 'Offer Draw'}
            </button>
          </div>

          {/* Draw offer dialog */}
          {drawOfferReceived && (
            <div className="w-full bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
              <p className="mb-2">Your opponent offers a draw</p>
              <div className="flex space-x-4">
                <button 
                  onClick={handleAcceptDraw}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Accept
                </button>
                <button 
                  onClick={handleDeclineDraw}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

         
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 transition-all hover:shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Game History
            </h2>
            <div className="h-64 md:h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {moveHistory.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-sm md:text-base">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                    const moveIdx = idx * 2;
                    const whiteMove = moveHistory[moveIdx];
                    const blackMove = moveHistory[moveIdx + 1];
                    return (
                      <React.Fragment key={idx}>
                        <span className="text-gray-500 font-medium">{idx + 1}.</span>
                        <span className="font-mono">{whiteMove?.notation || ''}</span>
                        <span className="font-mono text-gray-800">{blackMove?.notation || ''}</span>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No moves yet</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4">Chat</h2>
            <ChatWindow
              messages={chatMessages}
              currentUser={currentUser}
            />
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={false}
            />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ChessGame;