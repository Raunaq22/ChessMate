import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import GameAnalysis from '../components/Game/GameAnalysis';
import useWindowSize from '../hooks/useWindowSize';

const GameReplayPage = () => {
  const { gameId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [game, setGame] = useState(null);
  const [chess, setChess] = useState(new Chess());
  const [position, setPosition] = useState('start');
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [boardSize, setBoardSize] = useState(480);
  const [debugInfo, setDebugInfo] = useState(null); // Add debug state
  const containerRef = useRef(null);
  const { width: windowWidth } = useWindowSize();
  const [players, setPlayers] = useState({
    white: { username: null, loading: false, error: false },
    black: { username: null, loading: false, error: false }
  });

  // Get API URL with fallback
  const getApiUrl = () => {
    return process.env.REACT_APP_API_URL || 
           window.REACT_APP_API_URL || 
           'http://localhost:3001'; // Fallback URL
  };

  // Responsive board size
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newSize = Math.min(containerWidth - 32, 640);
      setBoardSize(newSize);
    }
  }, [windowWidth, containerRef]);

  // Fetch a user by ID to get username
  const fetchUsername = async (userId, playerColor) => {
    if (!userId) return;
    
    try {
      setPlayers(prev => ({
        ...prev,
        [playerColor]: { ...prev[playerColor], loading: true, error: false }
      }));
      
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/api/users/${userId}`);
      
      setPlayers(prev => ({
        ...prev,
        [playerColor]: {
          username: response.data.username,
          loading: false,
          error: false
        }
      }));
      
      return response.data.username;
    } catch (err) {
      console.error(`Error fetching ${playerColor} player username:`, err);
      setPlayers(prev => ({
        ...prev,
        [playerColor]: {
          ...prev[playerColor],
          loading: false,
          error: true
        }
      }));
      return null;
    }
  };

  // Load game data
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        const apiUrl = getApiUrl();
        
        // Store debug info
        setDebugInfo({
          apiUrl,
          gameId,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Fetching game data from: ${apiUrl}/api/games/${gameId}`);
        
        const response = await axios.get(`${apiUrl}/api/games/${gameId}`);
        console.log('Game data received:', response.data);
        
        // Handle both direct response and nested game object structures
        const gameData = response.data.game || response.data;
        setGame(gameData);
        
        // Check if we need to fetch player usernames
        const needPlayer1Username = !gameData.player1 || !gameData.player1.username;
        const needPlayer2Username = !gameData.player2 || !gameData.player2.username;
        
        // If we need to fetch usernames, do it in parallel
        const fetchPromises = [];
        
        if (needPlayer1Username && gameData.player1_id) {
          fetchPromises.push(fetchUsername(gameData.player1_id, 'white'));
        } else if (gameData.player1 && gameData.player1.username) {
          setPlayers(prev => ({
            ...prev,
            white: { username: gameData.player1.username, loading: false, error: false }
          }));
        }
        
        if (needPlayer2Username && gameData.player2_id) {
          fetchPromises.push(fetchUsername(gameData.player2_id, 'black'));
        } else if (gameData.player2 && gameData.player2.username) {
          setPlayers(prev => ({
            ...prev,
            black: { username: gameData.player2.username, loading: false, error: false }
          }));
        }
        
        // Wait for username fetches if needed
        if (fetchPromises.length > 0) {
          await Promise.allSettled(fetchPromises);
        }
        
        // Validate move_history exists and is an array before processing
        const moveHistoryData = Array.isArray(gameData.move_history) ? gameData.move_history : [];
        
        if (moveHistoryData.length > 0) {
          console.log('Processing move history of length:', moveHistoryData.length);
          
          const processedMoves = [];
          const chessInstance = new Chess();
          
          // Process each move to generate FEN and notation
          for (let i = 0; i < moveHistoryData.length; i++) {
            const move = moveHistoryData[i];
            try {
              // Skip if move is empty, null, or not properly formatted
              if (!move) {
                console.warn(`Skipping empty move at index ${i}`);
                continue;
              }
              
              // Handle the {to: "d4", from: "d2"} format
              let result;
              if (move.from && move.to) {
                // Create a move object that chess.js can understand
                const moveObj = {
                  from: move.from,
                  to: move.to,
                  // Add promotion if it exists
                  ...(move.promotion && { promotion: move.promotion })
                };
                
                result = chessInstance.move(moveObj);
              } else {
                // Fallback to the original approach
                result = chessInstance.move(move);
              }
              
              if (result) {
                processedMoves.push({
                  notation: result.san,
                  fen: chessInstance.fen(),
                  move: move
                });
              } else {
                console.warn(`Move ${i} (${JSON.stringify(move)}) was not valid`);
              }
            } catch (moveErr) {
              console.error(`Error processing move ${i} (${JSON.stringify(move)}):`, moveErr);
            }
          }
          
          console.log('Processed moves:', processedMoves.length);
          setMoveHistory(processedMoves);
          
          if (processedMoves.length > 0) {
            setCurrentMoveIndex(processedMoves.length - 1); // Start at the last move
            setPosition(processedMoves[processedMoves.length - 1].fen); // Set final position
            
            // Update chess instance to final position
            const finalChess = new Chess();
            finalChess.load(processedMoves[processedMoves.length - 1].fen);
            setChess(finalChess);
          } else {
            // If all moves failed to process, show initial position
            setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            setChess(new Chess());
          }
          
          // Set orientation based on which color the current user played
          if (currentUser && gameData.player1_id === currentUser.user_id) {
            setBoardOrientation('white');
          } else if (currentUser && gameData.player2_id === currentUser.user_id) {
            setBoardOrientation('black');
          }
        } else {
          // Clear and useful warning message
          console.warn(
            'No valid moves found in game data:',
            gameData.move_history === undefined 
              ? 'Invalid format: undefined' 
              : Array.isArray(gameData.move_history) 
                ? 'Empty array' 
                : `Invalid format: ${typeof gameData.move_history}`
          );
          
          // Set to initial position when no move history
          setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
          setChess(new Chess());
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching game data:', err);
        setError(`Failed to load game data: ${err.message}`);
        setDebugInfo({
          ...debugInfo,
          errorDetails: err.toString(),
          responseData: err.response?.data
        });
        setLoading(false);
      }
    };
    
    if (gameId) {
      fetchGameData();
    } else {
      setError('No game ID provided');
      setLoading(false);
    }
  }, [gameId, currentUser]);

  const handlePreviousMove = () => {
    if (currentMoveIndex > -1) {
      const newIndex = currentMoveIndex - 1;
      setCurrentMoveIndex(newIndex);
      
      if (newIndex === -1) {
        // Reset to initial position
        const initialChess = new Chess();
        setChess(initialChess);
        setPosition(initialChess.fen());
      } else {
        // Set to previous move
        const newChess = new Chess();
        newChess.load(moveHistory[newIndex].fen);
        setChess(newChess);
        setPosition(moveHistory[newIndex].fen);
      }
    }
  };

  const handleNextMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const newIndex = currentMoveIndex + 1;
      setCurrentMoveIndex(newIndex);
      
      const newChess = new Chess();
      newChess.load(moveHistory[newIndex].fen);
      setChess(newChess);
      setPosition(moveHistory[newIndex].fen);
    }
  };

  const handleFirstMove = () => {
    setCurrentMoveIndex(-1);
    const initialChess = new Chess();
    setChess(initialChess);
    setPosition(initialChess.fen());
  };

  const handleLastMove = () => {
    const lastIndex = moveHistory.length - 1;
    setCurrentMoveIndex(lastIndex);
    
    const newChess = new Chess();
    newChess.load(moveHistory[lastIndex].fen);
    setChess(newChess);
    setPosition(moveHistory[lastIndex].fen);
  };

  const handleStartAnalysis = () => {
    setShowAnalysis(true);
  };
  
  // Format the game result for display
  const formatGameResult = () => {
    if (!game) return '';
    
    // Check for the new result field first
    if (game.result) {
      if (game.result === 'draw') {
        return 'Game ended in a draw';
      }
      
      // Match patterns like "white_win_by_checkmate" or "black_win_by_resignation"
      const resultMatch = game.result.match(/(white|black)_win_by_(\w+)/);
      if (resultMatch) {
        const color = resultMatch[1].charAt(0).toUpperCase() + resultMatch[1].slice(1);
        const reason = resultMatch[2];
        
        // Format the reason nicely
        let formattedReason = '';
        switch (reason) {
          case 'checkmate':
            formattedReason = 'by checkmate';
            break;
          case 'resignation':
            formattedReason = 'by resignation';
            break;
          case 'timeout':
            formattedReason = 'on time';
            break;
          default:
            formattedReason = `by ${reason}`;
        }
        
        return `${color} won ${formattedReason}`;
      }
    }
    
    // Fall back to the old logic if result field is not available
    if (game.result && game.result.includes('draw')) {
      return 'Game ended in a draw';
    }
    
    if (game.winner_id) {
      // Determine if the winner was white or black
      const winnerColor = game.player1_id === game.winner_id ? 'White' : 'Black';
      const reason = game.result?.includes('timeout') ? 'on time' : 
                    game.result?.includes('resignation') ? 'by resignation' : 
                    'by checkmate';
      return `${winnerColor} won ${reason}`;
    }
    
    return 'Game completed';
  };

  // Format player name with loading/error states
  const formatPlayerName = (playerColor) => {
    const player = players[playerColor];
    
    if (player.loading) {
      return 'Loading...';
    }
    
    if (player.error) {
      return 'Unknown Player';
    }
    
    if (player.username) {
      return player.username;
    }
    
    // Fallbacks
    if (playerColor === 'white' && game?.player1?.username) {
      return game.player1.username;
    }
    
    if (playerColor === 'black' && game?.player2?.username) {
      return game.player2.username;
    }
    
    return playerColor === 'white' ? 'White' : 'Black';
  };

  // Format time control for display
  const formatTimeControl = () => {
    if (!game) return 'Standard';
    
    // Calculate directly from initial_time and increment
    if (game.initial_time === null) {
      return 'Unlimited';
    }
    
    const minutes = Math.floor(game.initial_time / 60);
    return game.increment > 0 ? `${minutes}+${game.increment}` : `${minutes}+0`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          {debugInfo && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Debug Info</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
          <button 
            onClick={() => navigate('/profile')} 
            className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Return to Profile
          </button>
        </div>
      </div>
    );
  }

  // Handle case when game is loaded but has no move history
  if (game && (!moveHistory || moveHistory.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <h2 className="text-xl font-bold">Game Found But No Moves Available</h2>
          <p className="mt-2">This game exists but has no recorded moves to replay.</p>
          {game && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer">Game Details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                {JSON.stringify({
                  game_id: game.game_id,
                  status: game.status,
                  result: game.result,
                  player1: game.player1?.username,
                  player2: game.player2?.username,
                  move_history_length: game.move_history?.length
                }, null, 2)}
              </pre>
            </details>
          )}
          <button 
            onClick={() => navigate('/profile')} 
            className="mt-4 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Return to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Game Replay</h1>
          <p className="text-gray-600">
            {formatPlayerName('white')} vs {formatPlayerName('black')} • {new Date(game?.end_time || game?.updated_at).toLocaleString()}
          </p>
          <p className="text-lg font-medium">{formatGameResult()}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
        >
          Back to Profile
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" ref={containerRef}>
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <Chessboard
              id="replay-board"
              position={position}
              boardOrientation={boardOrientation}
              boardWidth={boardSize}
              areArrowsAllowed={false}
              showBoardNotation={true}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            />
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-center space-x-4 mb-4">
              <button 
                onClick={handleFirstMove} 
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                disabled={currentMoveIndex === -1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h1a2 2 0 002-2V5a2 2 0 00-2-2H5zM15 3a2 2 0 00-2 2v10a2 2 0 002 2h1a2 2 0 002-2V5a2 2 0 00-2-2h-1z" />
                </svg>
              </button>
              <button 
                onClick={handlePreviousMove} 
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                disabled={currentMoveIndex === -1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={handleNextMove} 
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                disabled={currentMoveIndex === moveHistory.length - 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={handleLastMove} 
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                disabled={currentMoveIndex === moveHistory.length - 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h1a2 2 0 002-2V5a2 2 0 00-2-2H5zM15 17a2 2 0 002-2V5a2 2 0 00-2-2h-1a2 2 0 00-2 2v10a2 2 0 002 2h1z" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center">
              <button 
                onClick={handleStartAnalysis}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Detailed Analysis
              </button>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Move History
            </h2>
            <div className="h-96 overflow-y-auto">
              {moveHistory.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                    const moveIdx = idx * 2;
                    const whiteMove = moveHistory[moveIdx];
                    const blackMove = moveHistory[moveIdx + 1];
                    const isCurrentWhiteMove = currentMoveIndex === moveIdx;
                    const isCurrentBlackMove = currentMoveIndex === moveIdx + 1;
                    
                    return (
                      <React.Fragment key={idx}>
                        <span className="text-gray-500 font-medium">{idx + 1}.</span>
                        <span 
                          className={`font-mono cursor-pointer ${isCurrentWhiteMove ? 'bg-blue-100 rounded px-1' : ''}`}
                          onClick={() => {
                            if (whiteMove) {
                              setCurrentMoveIndex(moveIdx);
                              const newChess = new Chess();
                              newChess.load(whiteMove.fen);
                              setChess(newChess);
                              setPosition(whiteMove.fen);
                            }
                          }}
                        >
                          {whiteMove?.notation || ''}
                        </span>
                        <span 
                          className={`font-mono text-gray-800 cursor-pointer ${isCurrentBlackMove ? 'bg-blue-100 rounded px-1' : ''}`}
                          onClick={() => {
                            if (blackMove) {
                              setCurrentMoveIndex(moveIdx + 1);
                              const newChess = new Chess();
                              newChess.load(blackMove.fen);
                              setChess(newChess);
                              setPosition(blackMove.fen);
                            }
                          }}
                        >
                          {blackMove?.notation || ''}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No moves available</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 mt-6">
            <h2 className="text-xl font-bold mb-4">Game Info</h2>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Time Control:</span> 
                <span className="ml-2">{formatTimeControl()}</span>
              </div>
              <div>
                <span className="font-semibold">White:</span> 
                <span className="ml-2">{formatPlayerName('white')}</span>
              </div>
              <div>
                <span className="font-semibold">Black:</span> 
                <span className="ml-2">{formatPlayerName('black')}</span>
              </div>
              <div>
                <span className="font-semibold">Result:</span> 
                <span className="ml-2">{formatGameResult()}</span>
              </div>
            </div>
          </div>
      </div>
      </div>
      {showAnalysis && (
        <GameAnalysis
          gameHistory={moveHistory}
          initialFen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          onClose={() => setShowAnalysis(false)}
        />
      )}
    </div>
  );
};

export default GameReplayPage;
