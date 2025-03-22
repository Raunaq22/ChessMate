import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { AuthContext } from '../context/AuthContext';
import ComputerGameModal from '../components/Game/ComputerGameModal';
import chessEngineService from '../utils/chessEngineService';
import Timer from '../components/Game/Timer';
import Confetti from 'react-confetti'; // Add this import
import useWindowSize from '../hooks/useWindowSize'; // Add this import

const ComputerGamePage = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  const { width, height } = useWindowSize(); // Add window size hook for confetti
  
  const [showModal, setShowModal] = useState(true);
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('start');
  const [gameSettings, setGameSettings] = useState(null);
  const [playerColor, setPlayerColor] = useState('white');
  const [gameStatus, setGameStatus] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [timeIncrement, setTimeIncrement] = useState(0);
  const [isWhiteTimerRunning, setIsWhiteTimerRunning] = useState(false);
  const [isBlackTimerRunning, setIsBlackTimerRunning] = useState(false);
  const [showConfirmResign, setShowConfirmResign] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstMoveMade, setFirstMoveMade] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false); // Add state for confetti

  const containerRef = useRef(null);
  const [boardSize, setBoardSize] = useState(480);
  const possibleMoves = useRef([]);
  const isComputerThinking = useRef(false);
  const gameInitialized = useRef(false);
  const chessRef = useRef(new Chess());

  // Set up responsive board size
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newSize = Math.min(containerWidth - 32, 640);
      setBoardSize(newSize);
    }
  }, [containerRef]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Initialize game when settings are selected
  useEffect(() => {
    if (gameSettings) {
      // Initialize game
      const newGame = new Chess();
      chessRef.current = newGame;
      setGame(newGame);
      setPosition(newGame.fen());
      setPlayerColor(gameSettings.playerColor);
      setGameEnded(false);
      setMoveHistory([]);
      setFirstMoveMade(false);
      
      // Set up timers if not unlimited
      const initialTime = gameSettings.timeControl.time || 600;
      const increment = gameSettings.timeControl.increment || 0;
      setWhiteTime(initialTime);
      setBlackTime(initialTime);
      setTimeIncrement(increment);
      
      // Make the current game instance globally available for the fallback mode
      window.currentChessGame = newGame;
      
      // Initialize Chess Engine
      chessEngineService.init();
      chessEngineService.setDifficulty(gameSettings.difficulty);
      
      // If player is black, make computer move first
      if (gameSettings.playerColor === 'black') {
        setTimeout(() => makeComputerMove(), 500);
      } else {
        setIsWhiteTimerRunning(true);
      }
      
      gameInitialized.current = true;
    }
    
    return () => {
      // Cleanup Chess Engine when component unmounts
      chessEngineService.terminate();
      window.currentChessGame = null;
    };
  }, [gameSettings]);

  // Check game status after each move
  const checkGameStatus = useCallback((chess) => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'black' : 'white';
      setGameStatus(`Checkmate! ${winner === 'white' ? 'White' : 'Black'} wins!`);
      setGameEnded(true);
      
      // Show confetti if player wins
      if (winner === playerColor) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 8000);
      }
      
      return true;
    } else if (chess.isDraw()) {
      setGameStatus('Draw!');
      setGameEnded(true);
      return true;
    } else if (chess.isCheck()) {
      setGameStatus('Check!');
      return false;
    } else {
      setGameStatus(null);
      return false;
    }
  }, [playerColor]); // Add playerColor dependency

  // Handle player's move
  const onDrop = (sourceSquare, targetSquare) => {
    if (gameEnded || !gameInitialized.current) return false;
    
    // Check if it's player's turn
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    if (currentTurn !== playerColor) return false;
    
    // Try to make the move
    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Auto-promote to queen for simplicity
      });
      
      // If move is illegal
      if (!move) return false;
      
      // Update game state
      setGame(gameCopy);
      chessRef.current = gameCopy;
      window.currentChessGame = gameCopy;
      setPosition(gameCopy.fen());
      
      // Update move history
      setMoveHistory(prev => [...prev, { 
        notation: move.san, 
        fen: gameCopy.fen() 
      }]);
      
      // Handle timing
      const isFirstMove = !firstMoveMade;
      if (isFirstMove) {
        setFirstMoveMade(true);
      }
      
      // Add increment to player's clock if not the first move
      if (!isFirstMove && timeIncrement > 0) {
        if (playerColor === 'white') {
          setWhiteTime(prev => prev + timeIncrement);
        } else {
          setBlackTime(prev => prev + timeIncrement);
        }
      }

      // Switch timers
      if (currentTurn === 'white') {
        setIsWhiteTimerRunning(false);
        setIsBlackTimerRunning(true);
      } else {
        setIsWhiteTimerRunning(true);
        setIsBlackTimerRunning(false);
      }
      
      // Check game status
      const gameOver = checkGameStatus(gameCopy);
      if (!gameOver) {
        // Make computer's move after a small delay
        setTimeout(() => makeComputerMove(), 500);
      }
      
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  };

  // Computer makes a move
  const makeComputerMove = () => {
    if (gameEnded || isComputerThinking.current) return;
    
    isComputerThinking.current = true;
    setLoading(true);
    
    // Make sure we're working with the most current game state
    // This ensures the game object passed to chess engine is up-to-date
    const currentGame = chessRef.current;
    window.currentChessGame = currentGame;
    
    console.log("Computer thinking on position:", currentGame.fen());
    
    // Set the current position
    chessEngineService.setBoardPosition(currentGame.fen());
    
    // Get the best move from Chess Engine
    chessEngineService.getNextMove((move) => {
      try {
        if (!move) {
          console.error("No valid move returned from engine");
          isComputerThinking.current = false;
          setLoading(false);
          return;
        }
        
        console.log("Computer attempting move:", move);
        
        // Create a new game instance from the current position
        const gameCopy = new Chess(currentGame.fen());
        
        // Validate the move before trying to make it
        const legalMoves = gameCopy.moves({ verbose: true });
        const isLegalMove = legalMoves.some(m => 
          m.from === move.from && m.to === move.to
        );
        
        if (!isLegalMove) {
          console.error("Computer tried to make illegal move:", move);
          console.log("Legal moves:", legalMoves);
          
          // Try a random legal move as fallback
          if (legalMoves.length > 0) {
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            move = {
              from: randomMove.from,
              to: randomMove.to,
              promotion: randomMove.promotion || 'q'
            };
            console.log("Falling back to random legal move:", move);
          } else {
            throw new Error("No legal moves available");
          }
        }
        
        // Now make the move
        const result = gameCopy.move(move);
        
        if (result) {
          console.log("Computer successfully made move:", result);
          
          // Update game state
          setGame(gameCopy);
          chessRef.current = gameCopy;
          window.currentChessGame = gameCopy;
          setPosition(gameCopy.fen());
          
          // Update move history
          setMoveHistory(prev => [...prev, { 
            notation: result.san, 
            fen: gameCopy.fen() 
          }]);
          
          // Handle timing
          const isFirstMove = !firstMoveMade;
          if (isFirstMove) {
            setFirstMoveMade(true);
          }
          
          // Add increment to computer's clock if not the first move
          if (!isFirstMove && timeIncrement > 0) {
            if (playerColor === 'black') {
              setWhiteTime(prev => prev + timeIncrement);
            } else {
              setBlackTime(prev => prev + timeIncrement);
            }
          }
          
          // Switch timers
          const computerColor = playerColor === 'white' ? 'black' : 'white';
          if (computerColor === 'white') {
            setIsWhiteTimerRunning(false);
            setIsBlackTimerRunning(true);
          } else {
            setIsWhiteTimerRunning(true);
            setIsBlackTimerRunning(false);
          }
          
          // Check game status
          checkGameStatus(gameCopy);
        } else {
          throw new Error("Move returned null result");
        }
      } catch (error) {
        console.error('Error making computer move:', error);
        // Don't leave the game hanging, check if the game is over
        try {
          const currentGame = chessRef.current;
          if (currentGame.isGameOver()) {
            checkGameStatus(currentGame);
          }
        } catch (e) {
          console.error("Error checking game status after failed move", e);
        }
      } finally {
        isComputerThinking.current = false;
        setLoading(false);
      }
    });
  };

  // Handle resign
  const handleResign = () => {
    setShowConfirmResign(true);
  };

  const confirmResign = () => {
    setGameStatus(`You resigned. Computer wins!`);
    setGameEnded(true);
    setShowConfirmResign(false);
  };

  // Handle time up - Improve this function
  const handleTimeUp = (color) => {
    if (gameEnded) return;
    
    const winner = color === 'w' ? 'black' : 'white';
    const winnerText = winner === playerColor ? 'You' : 'Computer';
    const loserText = winner !== playerColor ? 'You' : 'Computer';
    
    setGameStatus(`Time's up! ${winnerText} win${winnerText === 'You' ? '' : 's'} on time!`);
    
    // Show confetti if player wins on time
    if (winner === playerColor) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }
    
    setGameEnded(true);
    
    // Also stop both timers by setting states
    setIsWhiteTimerRunning(false);
    setIsBlackTimerRunning(false);
  };

  // Handle piece drag start - show possible moves
  const onPieceDragBegin = (piece, sourceSquare) => {
    if (gameEnded) return false;
    
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    const pieceColor = piece[0] === 'w' ? 'white' : 'black';
    
    // Only allow dragging player's pieces on their turn
    if (pieceColor !== playerColor || currentTurn !== playerColor) {
      return false;
    }
    
    // Show possible moves
    const moves = game.moves({ square: sourceSquare, verbose: true });
    possibleMoves.current = moves.map(move => move.to);
    
    return true;
  };

  // Handle game settings selection
  const handleStartGame = (settings) => {
    setGameSettings(settings);
    setShowModal(false);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {showModal && (
        <ComputerGameModal
          onClose={() => navigate('/')}
          onStartGame={handleStartGame}
        />
      )}

      {/* Add confetti when player wins */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      {!showModal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col items-center" ref={containerRef}>
            {/* Game status banner */}
            {gameStatus && (
              <div className={`w-full mb-4 p-4 rounded-lg shadow-md text-center ${
                gameStatus.includes('Checkmate') ? 
                  (gameStatus.includes('You win') || gameStatus.includes('White wins') && playerColor === 'white' || 
                   gameStatus.includes('Black wins') && playerColor === 'black') ? 
                    'bg-green-500 text-white' : 'bg-red-500 text-white' :
                gameStatus.includes('Time') ? 
                  (gameStatus.includes('You win') || (gameStatus.includes('win') && !gameStatus.includes('wins'))) ?
                    'bg-green-500 text-white' : 'bg-red-500 text-white' :
                gameStatus.includes('resigned') ? 'bg-red-500 text-white' :
                gameStatus.includes('Draw') ? 'bg-blue-500 text-white' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                <h2 className="text-xl font-bold">{gameStatus}</h2>
                {gameEnded && (
                  <button
                    onClick={() => navigate('/')}
                    className="mt-2 px-4 py-2 bg-white text-gray-800 rounded hover:bg-gray-100"
                  >
                    Back to Home
                  </button>
                )}
              </div>
            )}

            {/* Computer info */}
            <div className="mb-4 w-full flex justify-between items-center bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                  C
                </div>
                <div>
                  <div className="font-medium">Computer</div>
                  <div className="text-sm text-gray-600">
                    {gameSettings?.difficulty?.toUpperCase() || 'AI'} - {playerColor === 'white' ? 'Black' : 'White'}
                  </div>
                </div>
                {loading && (
                  <div className="ml-4 text-sm text-gray-500">Thinking...</div>
                )}
              </div>
              <Timer
                initialTime={playerColor === 'white' ? blackTime : whiteTime}
                increment={timeIncrement}
                isRunning={(playerColor === 'white' ? isBlackTimerRunning : isWhiteTimerRunning) && !gameEnded}
                onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'b' : 'w')}
                gameEnded={gameEnded}
              />
            </div>

            {/* Chessboard */}
            <div className="w-full max-w-2xl mx-auto lg:mx-0 mb-4">
              <Chessboard
                id="computer-game"
                position={position}
                onPieceDrop={onDrop}
                onPieceDragBegin={onPieceDragBegin}
                boardOrientation={playerColor}
                boardWidth={boardSize}
                customSquareStyles={
                  possibleMoves.current.reduce((obj, square) => {
                    obj[square] = {
                      background: 'radial-gradient(circle, rgba(0,0,0,0.1) 25%, transparent 25%)',
                      borderRadius: '50%'
                    };
                    return obj;
                  }, {})
                }
                areArrowsAllowed={true}
                showBoardNotation={true}
                customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                allowDrag={({ piece }) => {
                  if (gameEnded || loading) return false;
                  return (piece[0] === 'w' && playerColor === 'white') || 
                         (piece[0] === 'b' && playerColor === 'black');
                }}
              />
            </div>

            {/* Player info */}
            <div className="mt-2 mb-4 w-full flex justify-between items-center bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'Y'}
                </div>
                <div>
                  <div className="font-medium">{currentUser?.username || 'You'}</div>
                  <div className="text-sm text-gray-600">
                    {playerColor === 'white' ? 'White' : 'Black'}
                  </div>
                </div>
              </div>
              <Timer
                initialTime={playerColor === 'white' ? whiteTime : blackTime}
                increment={timeIncrement}
                isRunning={(playerColor === 'white' ? isWhiteTimerRunning : isBlackTimerRunning) && !gameEnded}
                onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'w' : 'b')}
                gameEnded={gameEnded}
              />
            </div>

            {/* Game controls */}
            {!gameEnded && (
              <div className="w-full flex justify-center mb-4">
                <button
                  onClick={handleResign}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                  disabled={gameEnded}
                >
                  Resign
                </button>
              </div>
            )}

            {/* Resign confirmation */}
            {showConfirmResign && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                  <h3 className="text-xl font-bold mb-4 text-red-600">Confirm Resignation</h3>
                  <p className="mb-6">Are you sure you want to resign this game?</p>
                  <div className="flex justify-end space-x-4">
                    <button 
                      onClick={() => setShowConfirmResign(false)}
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
          </div>

          {/* Move history sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Game History
              </h2>
              <div className="h-96 overflow-y-auto">
                {moveHistory.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-sm">
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
            
            <div className="bg-white rounded-lg shadow-md p-4 mt-4">
              <h2 className="text-xl font-bold mb-4">Game Info</h2>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Difficulty:</span> 
                  <span className="ml-2 capitalize">{gameSettings?.difficulty || 'Medium'}</span>
                </div>
                <div>
                  <span className="font-semibold">Time Control:</span> 
                  <span className="ml-2">{gameSettings?.timeControl?.label || '10+5'}</span>
                </div>
                <div>
                  <span className="font-semibold">Your Color:</span> 
                  <span className="ml-2 capitalize">{playerColor}</span>
                </div>
              </div>
              
              {gameEnded && (
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComputerGamePage;
