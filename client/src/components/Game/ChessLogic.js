import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';

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

const useChessLogic = (gameId, navigate) => {
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  
  // Game state
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [firstMoveMade, setFirstMoveMade] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [opponentName, setOpponentName] = useState(null);
  const [moveSquares, setMoveSquares] = useState({});
  const [analysisMode, setAnalysisMode] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [reconnectionCountdown, setReconnectionCountdown] = useState(0);
  const [waitingForReconnection, setWaitingForReconnection] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [premoves, setPremoves] = useState([]);
  const [hasPremoves, setHasPremoves] = useState(false);
  
  const gameInitialized = useRef(false);
  const loadedFromStorage = useRef(false);

  // Check game status on initial load
  useEffect(() => {
    const checkGameStatus = async () => {
      if (!isAuthenticated || !currentUser) return;
      
      try {
        setInitialLoading(true);
        // Get the game data from the server
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/games/${gameId}`);
        const gameData = response.data.game || response.data;
        
        // If game is completed, redirect to replay page
        if (gameData.status === 'completed') {
          console.log(`Game ${gameId} is already completed. Redirecting to replay...`);
          navigate(`/game-replay/${gameId}`);
          return;
        }
        
        setInitialLoading(false);
      } catch (error) {
        console.error('Error checking game status:', error);
        setInitialLoading(false);
      }
    };
    
    checkGameStatus();
  }, [gameId, currentUser, isAuthenticated, navigate]);

  // Initialize from storage and connect socket
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
      },
      // Add reconnection settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      newSocket.emit('joinGame', { gameId, userId: currentUser.user_id });
    });

    // Add this new event listener for player updates
    newSocket.on('playerUpdate', ({ whitePlayerId, blackPlayerId, whitePlayerProfile, blackPlayerProfile }) => {
      console.log('Player update received:', { whitePlayerProfile, blackPlayerProfile });
      
      // Update player IDs
      setPlayerIds({ 
        white: whitePlayerId, 
        black: blackPlayerId 
      });
      
      // Update player profiles
      setPlayerProfiles({ 
        white: whitePlayerProfile || null, 
        black: blackPlayerProfile || null 
      });
      
      // Set opponent joined to true if both players are present
      if (whitePlayerId && blackPlayerId) {
        setOpponentJoined(true);
        
        // Update opponent name based on current player color
        if (playerColor === 'white' && blackPlayerProfile?.username) {
          setOpponentName(blackPlayerProfile.username);
          console.log('Black player joined:', blackPlayerProfile.username);
        } else if (playerColor === 'black' && whitePlayerProfile?.username) {
          setOpponentName(whitePlayerProfile.username);
          console.log('White player joined:', whitePlayerProfile.username);
        }
      }
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
      firstMoveMade: serverFirstMoveMade,
      moveHistory: serverMoveHistory, // Get move history from server on reconnection
      // Add new field to capture raw game data
      gameData
    }) => {
      const newGame = new Chess(fen);
      
      // Enhanced debugging - log the full game state object
      console.log('DETAILED SERVER RESPONSE:', {
        initialTime, 
        increment,
        whiteTimeLeft,
        blackTimeLeft,
        whitePlayerProfile,
        blackPlayerProfile,
        gameData // This will show the raw game object if the server sends it
      });
      
      // No default values - use exactly what the server sends
      setGame(newGame);
      setPosition(fen);
      setPlayerColor(playerColor); 
      
      // Set player profiles with real data from server
      setPlayerProfiles({
        white: whitePlayerProfile || null,
        black: blackPlayerProfile || null
      });
      
      // Get opponent name
      if (playerColor === 'white' && blackPlayerProfile?.username) {
        setOpponentName(blackPlayerProfile.username);
      } else if (playerColor === 'black' && whitePlayerProfile?.username) {
        setOpponentName(whitePlayerProfile.username);
      }
      
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
      
      // Update move history from server on reconnection
      if (serverMoveHistory && Array.isArray(serverMoveHistory) && serverMoveHistory.length > 0) {
        console.log(`Received ${serverMoveHistory.length} moves from server on reconnection`);
        
        // Process the raw move objects into our expected format
        const processedMoves = [];
        const chessInstance = new Chess();
        
        for (const moveObj of serverMoveHistory) {
          try {
            const result = chessInstance.move({
              from: moveObj.from,
              to: moveObj.to,
              promotion: moveObj.promotion
            });
            
            if (result) {
              processedMoves.push({
                notation: result.san,
                fen: chessInstance.fen()
              });
            }
          } catch (err) {
            console.error("Error replaying move:", err);
          }
        }
        
        // Only update if we have valid moves
        if (processedMoves.length > 0) {
          setMoveHistory(processedMoves);
          console.log(`Processed ${processedMoves.length} moves for reconnection`);
        }
      }
      
      // CRITICAL FIX: Time control initialization
      // Remove fallbacks to force using only server values
      let whiteTimeValue = whiteTimeLeft !== undefined ? whiteTimeLeft : initialTime;
      let blackTimeValue = blackTimeLeft !== undefined ? blackTimeLeft : initialTime;
      
      console.log('Final time settings:', {
        white: whiteTimeValue,
        black: blackTimeValue,
        increment: increment || 0
      });
      
      setWhiteTime(whiteTimeValue);
      setBlackTime(blackTimeValue);
      setTimeIncrement(increment || 0);
  
      const firstMoveStatus = serverFirstMoveMade !== undefined ? serverFirstMoveMade : firstMoveMade;
      const isWhiteTurn = newGame.turn() === 'w';
      
      setIsWhiteTimerRunning(started && firstMoveStatus && isWhiteTurn);
      setIsBlackTimerRunning(started && firstMoveStatus && !isWhiteTurn);
      
      // Fix: Set opponentJoined to true when both players are present
      setOpponentJoined(whitePlayerId && blackPlayerId);
      
      gameInitialized.current = true;
    });

    // Add event listener for notifications
    newSocket.on('notification', ({ type, message }) => {
      if (message) {
        setNotification({
          message,
          type: type || 'info'
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      }
    });

    newSocket.on('move', ({ fen, move, moveNotation, isWhiteTimerRunning, isBlackTimerRunning, isCheckmate, winner }) => {
      const newGame = new Chess(fen);
      setGame(newGame);
      setPosition(fen);
      setIsWhiteTimerRunning(isWhiteTimerRunning);
      setIsBlackTimerRunning(isBlackTimerRunning);

      // Add move to history
      setMoveHistory(prev => [...prev, { notation: moveNotation, fen }]);
      
      // If there are premoves, try to execute the first one
      if (hasPremoves && premoves.length > 0) {
        const [fromSquare, toSquare] = premoves[0];
        // Try to make the premove
        const success = executePremove(fromSquare, toSquare);
        // Remove this premove regardless of success
        setPremoves(prev => prev.slice(1));
        if (premoves.length <= 1) {
          setHasPremoves(false);
        }
      }
      
      // Check if the game is over
      if (isCheckmate) {
        setGameStatus(`Checkmate! ${winner === playerColor ? 'You win!' : winner === 'white' ? 'White wins!' : 'Black wins!'}`);
        setGameEnded(true);
        if (winner === playerColor) {
          setShowConfetti(true);
        }
      } else {
        checkGameStatus(newGame);
      }
    });

    newSocket.on('playerDisconnected', ({ message, gameActive }) => {
      // Only show disconnection UI and redirect if the game was still active
      if (gameActive && !gameEnded) {
        setDisconnected(true);
        
        // Show notification
        setNotification({
          message: message || 'Opponent disconnected. Returning to lobby...',
          type: 'warning'
        });
        
        // Redirect after delay only for active games
        setTimeout(() => navigate('/lobby'), 3000);
      } else {
        // For completed games, just show a subtle notification without the banner
        setNotification({
          message: message || 'Opponent has left the game.',
          type: 'info'
        });
        
        // Clear notification after a few seconds
        setTimeout(() => setNotification(null), 5000);
        
        // DON'T set disconnected to true for completed games
        // This prevents showing the red disconnection banner
      }
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
      console.log("GAME OVER EVENT RECEIVED:", { reason, winner, playerColor });
      console.log("Player IDs:", playerIds);
      console.log("Current user ID:", currentUser.user_id);
      
      if (reason === 'draw') {
        setGameStatus('Game ended in a draw by agreement');
        setGameEnded(true); // Set game ended state
      } else if (reason === 'resignation') {
        const winnerColor = winner === 'white' ? 'White' : 'Black';
        const isCurrentPlayerWinner = 
          (winner === 'white' && playerIds.white === currentUser.user_id) || 
          (winner === 'black' && playerIds.black === currentUser.user_id);
        
        // Different messages for winner and loser
        if (isCurrentPlayerWinner) {
          setGameStatus(`You win! Your opponent resigned.`);
          setShowConfetti(true);
        } else if (playerIds.white === currentUser.user_id || playerIds.black === currentUser.user_id) {
          // Only show this message if current user is a player (not a spectator)
          setGameStatus(`You resigned. ${winnerColor} wins!`);
        } else {
          // Generic message for spectators
          setGameStatus(`${winnerColor} wins by resignation!`);
        }
        
        setGameEnded(true);
      } else if (reason === 'checkmate') {
        console.log("CHECKMATE event received from server!");
        const winnerColor = winner === 'white' ? 'White' : 'Black';
        const isCurrentPlayerWinner = 
          (winner === 'white' && playerIds.white === currentUser.user_id) || 
          (winner === 'black' && playerIds.black === currentUser.user_id);
        
        console.log("Is current player the winner?", isCurrentPlayerWinner);
        
        if (isCurrentPlayerWinner) {
          console.log("Setting winner UI for checkmate from server");
          setGameStatus(`Checkmate! You win!`);
          setShowConfetti(true);
        } else if (playerIds.white === currentUser.user_id || playerIds.black === currentUser.user_id) {
          console.log("Setting loser UI for checkmate from server");
          setGameStatus(`Checkmate! ${winnerColor} wins!`);
        } else {
          console.log("Setting spectator UI for checkmate from server");
          setGameStatus(`Checkmate! ${winnerColor} wins!`);
        }
        
        setGameEnded(true);
      } else if (reason === 'timeout') {
        const winnerColor = winner === 'white' ? 'White' : 'Black';
        const isCurrentPlayerWinner = 
          (winner === 'white' && playerIds.white === currentUser.user_id) || 
          (winner === 'black' && playerIds.black === currentUser.user_id);
        
        if (isCurrentPlayerWinner) {
          setGameStatus(`You win on time!`);
          setShowConfetti(true);
        } else if (playerIds.white === currentUser.user_id || playerIds.black === currentUser.user_id) {
          setGameStatus(`${winnerColor} wins on time!`);
        } else {
          setGameStatus(`${winnerColor} wins on time!`);
        }
        
        setGameEnded(true);
      } else if (reason === 'abandonment') {
        const winnerColor = winner === 'white' ? 'White' : 'Black';
        const isCurrentPlayerWinner = 
          (winner === 'white' && playerIds.white === currentUser.user_id) || 
          (winner === 'black' && playerIds.black === currentUser.user_id);
        
        if (isCurrentPlayerWinner) {
          setGameStatus(`You win! Your opponent abandoned the game.`);
          setShowConfetti(true);
        } else {
          setGameStatus(`Game forfeit. ${winnerColor} wins by abandonment.`);
        }
        
        setGameEnded(true);
        setWaitingForReconnection(false);
      }
    });

    newSocket.on('playerTemporarilyDisconnected', ({ message, userId }) => {
      // Show reconnection countdown if opponent disconnected
      setWaitingForReconnection(true);
      setReconnectionCountdown(15);
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        setReconnectionCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setNotification({
        message: `${message} (${15}s)`,
        type: 'warning'
      });
    });

    newSocket.on('playerReconnected', ({ message }) => {
      // Clear reconnection state
      setWaitingForReconnection(false);
      setReconnectionCountdown(0);
      
      setNotification({
        message: message || 'Your opponent has reconnected. The game continues!',
        type: 'success'
      });
      
      setTimeout(() => setNotification(null), 3000);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [gameId, currentUser, navigate]);

  // Properly initialize game state
  useEffect(() => {
    if (gameInitialized.current && game && playerColor) {
      const currentTurn = game.turn() === 'w' ? 'white' : 'black';
      
      if (gameStarted) {
        setIsWhiteTimerRunning(currentTurn === 'white' && firstMoveMade);
        setIsBlackTimerRunning(currentTurn === 'black' && firstMoveMade);
      }
    }
  }, [gameStarted, game, playerColor, firstMoveMade]);

  // Handle winner confetti
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

  // Save game state to local storage
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

  // Cleanup storage on unmount
  useEffect(() => {
    return () => {
      if (gameId) {
        localStorage.removeItem(`${STORAGE_KEY}_${gameId}`);
      }
    };
  }, [gameId]);

  // Track opponent joined status
  useEffect(() => {
    // If both players have IDs, set opponentJoined to true
    if (playerIds.white && playerIds.black) {
      setOpponentJoined(true);
    }
  }, [playerIds]);

  // Update reconnection countdown notification
  useEffect(() => {
    if (waitingForReconnection && reconnectionCountdown > 0) {
      setNotification({
        message: `Opponent disconnected. Waiting for reconnection... (${reconnectionCountdown}s)`,
        type: 'warning'
      });
    }
  }, [reconnectionCountdown, waitingForReconnection]);

  // Game logic functions
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

  const handleTimeUpdate = useCallback((color, timeLeft) => {
    if (!socket || gameEnded) return;
    
    const roundedTime = Math.floor(timeLeft);
    
    // Only send updates if time changed by at least 1 second
    // and no more frequently than once per second
    if (color === 'white' && Math.abs(whiteTime - roundedTime) >= 1) {
      // Use setTimeout to ensure we're not flooding the server
      setTimeout(() => {
        socket.emit('timeUpdate', { gameId, color: 'white', timeLeft: roundedTime });
      }, 500); // 500ms throttle
      
      // Update local state immediately for UI
      setWhiteTime(roundedTime);
    } else if (color === 'black' && Math.abs(blackTime - roundedTime) >= 1) {
      setTimeout(() => {
        socket.emit('timeUpdate', { gameId, color: 'black', timeLeft: roundedTime });
      }, 500); // 500ms throttle
      
      // Update local state immediately for UI
      setBlackTime(roundedTime);
    }
  }, [socket, gameId, whiteTime, blackTime, gameEnded]);

  // Clean up the checkGameStatus function to be more direct
  const checkGameStatus = (chess) => {
    if (chess.isCheckmate()) {
      const winnerColor = chess.turn() === 'w' ? 'black' : 'white';
      const winner = winnerColor === 'white' ? 'White' : 'Black';
      
      // Emit gameOver immediately and ensure it's a reliable message
      socket?.emit('gameOver', {
        gameId,
        winner: winnerColor,
        reason: 'checkmate'
      }, (ack) => {
        // Log if acknowledgment received (optional)
        if (ack) console.log("Server acknowledged checkmate");
      });
      
      // Check if current player is the winner
      const isCurrentPlayerWinner = playerColor === winnerColor;
      
      // Set personalized message based on if player won or lost
      if (isCurrentPlayerWinner) {
        setGameStatus(`Checkmate! You win!`);
        setShowConfetti(true); // Only winner gets confetti
      } else {
        setGameStatus(`Checkmate! ${winner} wins!`);
      }
      
      setGameEnded(true); 
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

  // Simplify the onDrop function to avoid duplicate event emission
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
    
    // Check for checkmate directly
    const isCheckmate = gameCopy.isCheckmate();
    const winner = isCheckmate ? 
      (gameCopy.turn() === 'w' ? 'black' : 'white') : null;
    
    // Use the current timer values
    const currentWhiteTime = whiteTime;
    const currentBlackTime = blackTime;
    
    // Include explicit checkmate information in move event
    socket.emit('move', {
      gameId,
      move: { 
        from: sourceSquare, 
        to: targetSquare,
        promotion: validMove.promotion || 'q'
      },
      fen: gameCopy.fen(),
      moveNotation: move.san,
      whiteTimeLeft: currentWhiteTime,
      blackTimeLeft: currentBlackTime,
      isWhiteTimerRunning: isWhiteTurnAfter && (firstMoveMade || isFirstMove),
      isBlackTimerRunning: !isWhiteTurnAfter && (firstMoveMade || isFirstMove),
      isCheckmate: isCheckmate,  // Explicit flag for checkmate
      winner: winner             // Include winner information 
    });
    
    // Call checkGameStatus after emitting move
    checkGameStatus(gameCopy);
    
    setPossibleMoves([]);
    return true;
  };

  // Also update the handleTimeUp function
  const handleTimeUp = (color) => {
    if (gameEnded) return; // Prevent duplicate calls
    
    socket?.emit('gameOver', {
      gameId,
      winner: color === 'w' ? 'black' : 'white',
      reason: 'timeout'
    });
  };

  // Fix the handleSendMessage function to properly structure the message
  const handleSendMessage = (text) => {
    if (!socket || !text || !currentUser) {
      console.error('Cannot send message: missing socket, text, or user');
      return;
    }
    
    const message = {
      text, // The message text
      userId: currentUser.user_id,
      username: currentUser.username,
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending message:', message);
    
    // Add to local state immediately for UI responsiveness
    setChatMessages(prevMessages => [...prevMessages, message]);
    
    // Send to server in the expected format
    socket.emit('chat', { 
      gameId, 
      message // Send the complete message object
    });
  };

  // Fix handleResign to show confirmation dialog
  const handleResign = () => {
    if (gameEnded) return;
    
    // Instead of immediately resigning, show the confirmation dialog
    setShowResignConfirm(true);
  };

  // Simplify confirmResign to just emit the event
  const confirmResign = () => {
    socket?.emit('resign', { 
      gameId,
      playerId: currentUser.user_id,
      color: playerColor
    });
    
    // Let the socket event handler set the game status
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

  const handleStartAnalysis = () => {
    setShowAnalysis(true);
  };

  // Handle square click for click-to-move functionality
  const onSquareClick = useCallback((square) => {
    // If game ended, do nothing
    if (gameEnded) return;
    
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    
    // Handle premoves if it's not our turn
    if (currentTurn !== playerColor && gameInitialized.current) {
      // If no square is selected, check if we're selecting a valid piece for premove
      if (!selectedSquare) {
        const piece = game.get(square);
        // Only allow selecting own pieces for premoves
        if (piece && 
            ((piece.color === 'w' && playerColor === 'white') || 
             (piece.color === 'b' && playerColor === 'black'))) {
          setSelectedSquare(square);
          
          // Show possible moves for visual feedback
          // We use the same UI for premoves, even though not all moves might be valid later
          const gameCopy = new Chess(game.fen());
          // Temporarily change the turn to calculate possible moves
          const oppositeColor = playerColor === 'white' ? 'b' : 'w';
          gameCopy.load(game.fen().replace(/ [wb] /, ` ${oppositeColor} `));
          try {
            const moves = gameCopy.moves({ square, verbose: true });
            const targetSquares = moves.map(move => move.to);
            setPossibleMoves(targetSquares);
          } catch (error) {
            console.error('Error calculating premove possibilities:', error);
            setPossibleMoves([]);
          }
        }
      } 
      // If a square is already selected for premove
      else {
        // Add the premove
        setPremoves(prev => [...prev, [selectedSquare, square]]);
        setHasPremoves(true);
        
        // Clear selection and possible moves
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
      return;
    }
    
    // Below here is regular move handling (when it's our turn)
    if (!gameInitialized.current) return;
    
    // Get piece at square if any
    const piece = game.get(square);
    
    // If no square is selected and clicked on own piece, select it
    if (!selectedSquare) {
      if (piece && 
          ((piece.color === 'w' && playerColor === 'white') || 
           (piece.color === 'b' && playerColor === 'black'))) {
        // Select the square
        setSelectedSquare(square);
        
        // Show possible moves
        const moves = game.moves({ square, verbose: true });
        const targetSquares = moves.map(move => move.to);
        setPossibleMoves(targetSquares);
      }
    } 
    // If a square is already selected
    else {
      // If clicking on own piece again, update selection
      if (piece && 
          ((piece.color === 'w' && playerColor === 'white') || 
           (piece.color === 'b' && playerColor === 'black'))) {
        // Update selection to new square
        setSelectedSquare(square);
        
        // Show new possible moves
        const moves = game.moves({ square, verbose: true });
        const targetSquares = moves.map(move => move.to);
        setPossibleMoves(targetSquares);
      }
      // If clicking on valid destination square, make the move
      else if (possibleMoves.includes(square)) {
        // Make the move
        onDrop(selectedSquare, square);
        
        // Clear selection and possible moves
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
      // If clicking on invalid square, clear selection
      else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  }, [game, playerColor, selectedSquare, possibleMoves, gameEnded, gameInitialized, onDrop]);

  // Helper function to execute a premove
  const executePremove = useCallback((sourceSquare, targetSquare) => {
    // Only execute premove if it's our turn now
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    if (currentTurn !== playerColor) return false;
    
    // Try to make the move
    try {
      const moves = game.moves({ verbose: true });
      const validMove = moves.find(m => 
        m.from === sourceSquare && 
        m.to === targetSquare
      );
      
      if (!validMove) return false;
      
      // If valid, use onDrop to make the move
      return onDrop(sourceSquare, targetSquare);
    } catch (error) {
      console.error('Error executing premove:', error);
      return false;
    }
  }, [game, playerColor, onDrop]);
  
  // Function to clear all premoves
  const clearPremoves = useCallback(() => {
    setPremoves([]);
    setHasPremoves(false);
  }, []);

  return {
    // Game state
    initialLoading,
    game,
    socket,
    position,
    playerColor,
    disconnected,
    possibleMoves,
    moveHistory,
    gameStatus,
    whiteTime,
    blackTime,
    isWhiteTimerRunning,
    isBlackTimerRunning,
    timeIncrement,
    gameStarted,
    playerIds,
    playerProfiles,
    chatMessages,
    showConfetti,
    showStartAnimation,
    offeringDraw,
    drawOfferReceived,
    firstMoveMade,
    showResignConfirm,
    notification,
    gameEnded,
    opponentJoined,
    opponentName,
    moveSquares,
    analysisMode,
    showAnalysis,
    reconnectionCountdown,
    waitingForReconnection,
    currentUser,
    selectedSquare,
    hasPremoves,
    premoves,
    
    // Functions
    onPieceDragStart,
    onDrop,
    highlightSquares,
    onSquareClick,
    handleTimeUpdate,
    checkGameStatus,
    handleTimeUp,
    handleSendMessage,
    handleResign,
    confirmResign,
    cancelResign,
    handleOfferDraw,
    handleAcceptDraw,
    handleDeclineDraw,
    handleStartAnalysis,
    setShowAnalysis,
    setShowResignConfirm,
    clearPremoves
  };
};

export default useChessLogic; 