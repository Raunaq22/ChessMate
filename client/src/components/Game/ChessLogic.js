import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { AuthContext } from '../../context/AuthContext';
import supabase from '../../config/supabase';
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

  // Initialize from storage and connect to Supabase real-time
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

    // Subscribe to game updates
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'games',
          filter: `game_id=eq.${gameId}`
        }, 
        (payload) => {
          console.log('Game update received:', payload);
          handleGameUpdate(payload);
        }
      )
      .subscribe();

    // Subscribe to player updates
    const playerSubscription = supabase
      .channel(`players:${gameId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('Player update received:', payload);
          handlePlayerUpdate(payload);
        }
      )
      .subscribe();

    // Subscribe to move updates
    const moveSubscription = supabase
      .channel(`moves:${gameId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_moves',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('Move update received:', payload);
          handleMoveUpdate(payload);
        }
      )
      .subscribe();

    // Subscribe to chat messages
    const chatSubscription = supabase
      .channel(`chat:${gameId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_chat',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          console.log('Chat message received:', payload);
          handleChatUpdate(payload);
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      gameSubscription.unsubscribe();
      playerSubscription.unsubscribe();
      moveSubscription.unsubscribe();
      chatSubscription.unsubscribe();
    };
  }, [gameId, currentUser]);

  // Handler functions for different types of updates
  const handleGameUpdate = useCallback((payload) => {
    const { new: gameData } = payload;
    if (!gameData) return;

    // Update game state based on the new data
    if (gameData.fen) {
      const newGame = new Chess(gameData.fen);
      setGame(newGame);
      setPosition(gameData.fen);
    }

    if (gameData.status === 'completed') {
      setGameEnded(true);
      setGameStatus(`Game ended: ${gameData.result}`);
    }

    // Update time controls
    if (gameData.white_time !== undefined) setWhiteTime(gameData.white_time);
    if (gameData.black_time !== undefined) setBlackTime(gameData.black_time);
    if (gameData.increment !== undefined) setTimeIncrement(gameData.increment);
  }, []);

  const handlePlayerUpdate = useCallback((payload) => {
    const { new: playerData } = payload;
    if (!playerData) return;

    // Update player information
    if (playerData.player_id === playerIds.white) {
      setPlayerProfiles(prev => ({ ...prev, white: playerData }));
    } else if (playerData.player_id === playerIds.black) {
      setPlayerProfiles(prev => ({ ...prev, black: playerData }));
    }
  }, [playerIds]);

  const handleMoveUpdate = useCallback((payload) => {
    const { new: moveData } = payload;
    if (!moveData) return;

    // Update game state with new move
    if (moveData.fen) {
      const newGame = new Chess(moveData.fen);
      setGame(newGame);
      setPosition(moveData.fen);
    }

    // Update move history
    if (moveData.move_notation) {
      setMoveHistory(prev => [...prev, moveData.move_notation]);
    }
  }, []);

  const handleChatUpdate = useCallback((payload) => {
    const { new: chatData } = payload;
    if (!chatData) return;

    // Add new chat message
    setChatMessages(prev => [...prev, {
      userId: chatData.user_id,
      text: chatData.message,
      timestamp: chatData.created_at
    }]);
  }, []);

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
    
    // Functions
    onPieceDragStart,
    onDrop,
    highlightSquares,
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
    setShowResignConfirm
  };
};

export default useChessLogic; 