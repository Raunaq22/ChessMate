import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useChessLogic from '../components/Game/ChessLogic';
import useWindowSize from '../hooks/useWindowSize';
import Confetti from 'react-confetti';
import Timer from '../components/Game/Timer';
import ChatWindow from '../components/Chat/ChatWindow';
import ChatInput from '../components/Chat/ChatInput';
import GameAnalysis from '../components/Game/GameAnalysis';
import ThemedChessboard from '../components/Board/ThemedChessboard';
import { motion, AnimatePresence } from 'framer-motion';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const [boardSize, setBoardSize] = useState(480);

  // Use the chess logic hook to get game state and functions
  const {
    // Game state
    initialLoading,
    game,
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
    drawOfferReceived,
    showResignConfirm,
    notification,
    gameEnded,
    moveSquares,
    showAnalysis,
    reconnectionCountdown,
    waitingForReconnection,
    currentUser,
    offeringDraw,
    
    // Functions
    onPieceDragStart,
    onDrop,
    handleTimeUpdate,
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
  } = useChessLogic(gameId, navigate);

  // Custom chess pieces (could be expanded for theming)
  const customPieces = {};

  // Responsive board size
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newSize = Math.min(containerWidth - 32, 640); // Max size with padding
      setBoardSize(newSize);
    }
  }, [windowWidth, containerRef]);

  // PlayerProfile component
  const PlayerProfile = ({ color }) => {
    const isWhite = color === 'white';
    const profile = isWhite ? playerProfiles.white : playerProfiles.black;
    const playerId = isWhite ? playerIds.white : playerIds.black;
    const isCurrentUser = playerId === currentUser?.user_id;
    
    // Get username with fallbacks
    let username;
    if (isCurrentUser) {
      username = currentUser.username;
    } else if (profile && profile.username) {
      username = profile.username;
    } else if (playerId) {
      username = `Player ${playerId}`;
    } else {
      username = 'Waiting...';
    }
    
    return (
      <div 
        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
        onClick={() => playerId && navigate(`/profile/${playerId}`)}
      >
        <div 
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold"
        >
          {username[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-medium">{username}</div>
          <div className="text-sm">
            <span className={color === 'white' ? 'text-yellow-600' : 'text-gray-700'}>
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              gameStatus.includes('draw') ? 
                'bg-blue-500 text-white' : 
                'bg-yellow-100 border border-yellow-400 text-yellow-800'
          }`}
        >
          <h2 className="text-xl font-bold">{gameStatus}</h2>
          {(gameStatus.includes('wins') || gameStatus.includes('draw')) && (
            <div className="mt-3 space-x-3">
              <button
                onClick={() => navigate('/lobby')}
                className="bg-white text-gray-800 px-4 py-2 rounded-full hover:bg-gray-100"
              >
                Back to Lobby
              </button>
              <button
                onClick={handleStartAnalysis}
                className="bg-blue-700 text-white px-4 py-2 rounded-full hover:bg-blue-800"
              >
                Analyse Game
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Disconnection warning - only show if game has not ended */}
      {disconnected && !gameEnded && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Opponent disconnected. Returning to lobby...
        </div>
      )}

      {/* Resign confirmation dialog */}
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

      {/* Notification toast */}
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
              isRunning={(playerColor === 'white' ? isBlackTimerRunning : isWhiteTimerRunning) && gameStarted && !gameEnded}
              onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'b' : 'w')}
              onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'black' : 'white', time)}
              gameEnded={gameEnded}
            />
          </div>

          {/* Chessboard */}
          <div className="w-full max-w-2xl mx-auto lg:mx-0 mb-4">
            <ThemedChessboard
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
              customPieces={customPieces}
              ref={boardRef}
              allowDrag={({ piece }) => {
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
              isRunning={(playerColor === 'white' ? isWhiteTimerRunning : isBlackTimerRunning) && gameStarted && !gameEnded}
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
         
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 transition-all hover:shadow-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/20000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Game History
            </h2>
            <div className="h-64 md:h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {moveHistory && moveHistory.length > 0 ? (
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

      {/* Game analysis modal */}
      {showAnalysis && (
        <GameAnalysis
          gameHistory={moveHistory}
          initialFen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          onClose={() => setShowAnalysis(false)}
        />
      )}

      {/* Reconnection countdown banner */}
      {waitingForReconnection && reconnectionCountdown > 0 && (
        <div className="w-full mb-4 p-4 rounded-lg bg-yellow-100 border border-yellow-400 text-yellow-800 text-center">
          <div className="flex items-center justify-center">
            <div className="mr-3 animate-spin h-5 w-5 border-t-2 border-yellow-500 rounded-full"></div>
            <h2 className="text-xl font-bold">
              Waiting for opponent to reconnect ({reconnectionCountdown}s)
            </h2>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage; 