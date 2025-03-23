import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ThemedChessboard from '../Board/ThemedChessboard';

const GameAnalysis = ({ gameHistory, initialFen, onClose }) => {
  const [game, setGame] = useState(new Chess(initialFen || 'start'));
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [position, setPosition] = useState(initialFen || 'start');
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bestMove, setBestMove] = useState(null);
  const [arrows, setArrows] = useState([]);
  const [boardSize, setBoardSize] = useState(560);
  const [engineReady, setEngineReady] = useState(false);
  const [isOffBook, setIsOffBook] = useState(false); // Track if we're viewing a position not in the game
  const [customPosition, setCustomPosition] = useState(null); // Store custom position FEN
  const engineRef = useRef(null);
  const containerRef = useRef(null);
  
  // Initialize Stockfish
  useEffect(() => {
    // Create Web Worker for Stockfish
    try {
      // The issue is with this path - we need to use the correct path to the stockfish file
      // The file is directly in the public folder, not in a subfolder
      const stockfishPath = `/stockfish/stockfish-nnue-16-single.js`;
      console.log(`Loading Stockfish from: ${stockfishPath}`);
      
      const stockfish = new Worker(stockfishPath);
      engineRef.current = stockfish;
      
      stockfish.addEventListener('message', (e) => {
        const message = e.data;
        console.log("Stockfish message:", message);
        
        if (message.includes('readyok')) {
          console.log('Stockfish engine ready');
          setEngineReady(true);
        } else if (message.includes('bestmove')) {
          const bestMove = message.split(' ')[1];
          setBestMove(bestMove);
          
          if (bestMove && bestMove.length >= 4) {
            // Create arrow for best move
            const from = bestMove.substring(0, 2);
            const to = bestMove.substring(2, 4);
            setArrows([[from, to, 'green']]);
          }
          
          setLoading(false);
        } else if (message.includes('cp ')) {
          // Parse evaluation score
          try {
            const cpMatch = message.match(/cp (-?\d+)/);
            if (cpMatch) {
              const cp = parseInt(cpMatch[1]) / 100;
              setEvaluation({ 
                score: cp, 
                mate: false,
                formatted: cp > 0 ? `+${cp.toFixed(2)}` : cp.toFixed(2) 
              });
            }
          } catch (error) {
            console.error('Error parsing evaluation:', error);
          }
        } else if (message.includes('mate ')) {
          // Parse mate score
          try {
            const mateMatch = message.match(/mate (-?\d+)/);
            if (mateMatch) {
              const mate = parseInt(mateMatch[1]);
              setEvaluation({ 
                score: mate > 0 ? 100 : -100, // Use extreme value for charting
                mate: true,
                mateIn: Math.abs(mate),
                formatted: mate > 0 ? `Mate in ${mate}` : `Mated in ${Math.abs(mate)}`
              });
            }
          } catch (error) {
            console.error('Error parsing mate score:', error);
          }
        }
      });
      
      // Initialize Stockfish
      stockfish.postMessage('uci');
      stockfish.postMessage('isready');
      stockfish.postMessage('setoption name Use NNUE value true');
      stockfish.postMessage('setoption name UCI_AnalyseMode value true');
      
      // Clean up
      return () => {
        if (engineRef.current) {
          engineRef.current.postMessage('quit');
          engineRef.current.terminate();
        }
      };
    } catch (error) {
      console.error("Error initializing Stockfish:", error);
      setEngineReady(false);
    }
  }, []);
  
  // Handle responsive board sizing
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      // Set a bit smaller than container to leave room for controls
      setBoardSize(Math.min(containerWidth - 32, 560));
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setBoardSize(Math.min(containerWidth - 32, 560));
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Set position when current move index changes or when exploring off-book moves
  useEffect(() => {
    let newGame;
    
    if (isOffBook && customPosition) {
      // Use the custom position if we're off-book
      newGame = new Chess(customPosition);
      setGame(newGame);
      setPosition(customPosition);
    } else {
      // Otherwise, use the game history
      newGame = new Chess(initialFen || 'start');
      
      if (currentMoveIndex >= 0 && gameHistory && gameHistory.length > 0) {
        // Apply moves up to the current index
        for (let i = 0; i <= currentMoveIndex && i < gameHistory.length; i++) {
          try {
            if (gameHistory[i]?.notation) {
              newGame.move(gameHistory[i].notation);
            }
          } catch (error) {
            console.error('Invalid move:', gameHistory[i], error);
          }
        }
      }
      
      setGame(newGame);
      setPosition(newGame.fen());
    }
    
    // Analyze position with Stockfish (regardless of whether it's from game or custom)
    if (engineReady && engineRef.current) {
      setLoading(true);
      engineRef.current.postMessage('stop'); // Stop any previous analysis
      engineRef.current.postMessage(`position fen ${newGame.fen()}`);
      engineRef.current.postMessage('go depth 18'); // Adjust depth based on performance needs
    }
  }, [currentMoveIndex, gameHistory, initialFen, engineReady, isOffBook, customPosition]);
  
  // Handle making a move on the board
  const onDrop = (sourceSquare, targetSquare) => {
    try {
      const tempGame = new Chess(position);
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Default to queen promotion
      });
      
      if (move) {
        // If move is legal, set to off-book mode and update custom position
        setIsOffBook(true);
        setCustomPosition(tempGame.fen());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Invalid move attempt:', error);
      return false;
    }
  };
  
  // Return to game mode from off-book mode
  const returnToGamePosition = (moveIdx) => {
    setIsOffBook(false);
    setCustomPosition(null);
    setCurrentMoveIndex(moveIdx);
  };
  
  const handlePreviousMove = () => {
    if (isOffBook) {
      // If we're off-book, return to the last position from the game
      returnToGamePosition(currentMoveIndex);
    } else if (currentMoveIndex > -1) {
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };
  
  const handleNextMove = () => {
    if (isOffBook) {
      // If we're off-book, do nothing (or could implement a move history for exploration)
      return;
    }
    
    if (gameHistory && currentMoveIndex < gameHistory.length - 1) {
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };
  
  const handleFirstMove = () => {
    setIsOffBook(false);
    setCustomPosition(null);
    setCurrentMoveIndex(-1);
  };
  
  const handleLastMove = () => {
    if (gameHistory) {
      setIsOffBook(false);
      setCustomPosition(null);
      setCurrentMoveIndex(gameHistory.length - 1);
    }
  };
  
  // Format evaluation bar height
  const getEvaluationBarHeight = () => {
    if (!evaluation) return '50%'; // Neutral
    
    const scoreValue = evaluation.score;
    // Clamp between -5 and 5 for display purposes
    const clampedScore = Math.max(-5, Math.min(5, scoreValue));
    // Convert to percentage (0-100%), with 50% being neutral
    const percentage = 50 - (clampedScore * 10); // Each pawn worth is 10%
    return `${percentage}%`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-5/6 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">
            Game Analysis
            {isOffBook && (
              <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Exploring variations
              </span>
            )}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-600 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 flex-grow overflow-hidden">
          {/* Evaluation bar */}
          <div className="hidden md:block md:col-span-1">
            <div className="relative h-full w-8 mx-auto bg-gray-200 rounded overflow-hidden">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-black transition-all duration-300"
                style={{ height: getEvaluationBarHeight() }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-gray-800 bg-white bg-opacity-70 px-1 rounded">
                  {evaluation?.formatted || '0.00'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Chessboard - with visual indication for off-book */}
          <div 
            ref={containerRef}
            className={`md:col-span-3 flex flex-col items-center justify-center ${isOffBook ? 'bg-yellow-50 p-2 rounded' : ''}`}
          >
            <ThemedChessboard
              position={position}
              boardWidth={boardSize}
              customArrows={arrows}
              areArrowsAllowed={false}
              showBoardNotation={true}
              onPieceDrop={onDrop} // Enable making moves
              customBoardStyle={{
                opacity: isOffBook ? '0.95' : '1', // Slightly transparent when exploring variations
              }}
            />
            
            {isOffBook && (
              <button
                onClick={() => returnToGamePosition(currentMoveIndex)}
                className="mt-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Return to game position
              </button>
            )}
          </div>
          
          {/* Move history */}
          <div className="md:col-span-1 overflow-y-auto">
            <div className="bg-gray-50 p-3 rounded-lg shadow-inner h-full">
              <h3 className="font-semibold mb-2">Move History</h3>
              <div className="grid grid-cols-3 gap-1 text-sm">
                {gameHistory.map((move, idx) => {
                  const moveNumber = Math.floor(idx / 2) + 1;
                  const isWhiteMove = idx % 2 === 0;
                  const isCurrentMove = !isOffBook && currentMoveIndex === idx;
                  
                  return (
                    <React.Fragment key={idx}>
                      {isWhiteMove && <span className="text-gray-500">{moveNumber}.</span>}
                      <span 
                        className={`cursor-pointer py-1 px-1 rounded 
                          ${isCurrentMove ? 'bg-blue-100 font-medium' : 'hover:bg-gray-100'}`}
                        onClick={() => {
                          // Always return to game mode when clicking a move
                          returnToGamePosition(idx);
                        }}
                      >
                        {move.notation}
                      </span>
                      {!isWhiteMove && idx === gameHistory.length - 1 && <span></span>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t">
          <div className="flex justify-center space-x-4">
            <button 
              onClick={handleFirstMove} 
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              disabled={!isOffBook && currentMoveIndex === -1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h1a2 2 0 002-2V5a2 2 0 00-2-2H5zM15 3a2 2 0 00-2 2v10a2 2 0 002 2h1a2 2 0 002-2V5a2 2 0 00-2-2h-1z" />
              </svg>
            </button>
            <button 
              onClick={handlePreviousMove} 
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              disabled={!isOffBook && currentMoveIndex === -1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={handleNextMove} 
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              disabled={isOffBook || currentMoveIndex === gameHistory.length - 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={handleLastMove} 
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              disabled={isOffBook || currentMoveIndex === gameHistory.length - 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h1a2 2 0 002-2V5a2 2 0 00-2-2H5zM15 17a2 2 0 002-2V5a2 2 0 00-2-2h-1a2 2 0 00-2 2v10a2 2 0 002 2h1z" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4 text-center">
            {!engineReady && (
              <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-sm rounded">
                Stockfish engine failed to load. Please check console for errors.
              </span>
            )}
            {loading && engineReady && (
              <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                Analyzing position...
              </span>
            )}
            {isOffBook && (
              <div className="mt-2 text-sm text-gray-600">
                You're exploring a variation. Moves on the board will be analyzed,
                but aren't part of the original game.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameAnalysis;