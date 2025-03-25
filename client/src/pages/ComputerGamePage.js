import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { AuthContext } from '../context/AuthContext';
import ComputerGameModal from '../components/Game/ComputerGameModal';
import chessEngineService from '../utils/chessEngineService';
import Timer from '../components/Game/Timer';
import Confetti from 'react-confetti';
import useWindowSize from '../hooks/useWindowSize';
import ThemedChessboard from '../components/Board/ThemedChessboard';
import {
  Box,
  Flex,
  Text,
  Button,
  Avatar,
  Badge,
  VStack,
  HStack,
  Heading,
  useToast,
  Container,
  Grid
} from '@chakra-ui/react';
import { FaHistory, FaClock, FaUser, FaRobot } from 'react-icons/fa';

const ComputerGamePage = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  const { width, height } = useWindowSize();
  const toast = useToast();
  
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
  const [showConfetti, setShowConfetti] = useState(false);

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
      const newSize = Math.min(containerWidth, height * 0.8);
      setBoardSize(newSize);
    }
  }, [width, height, containerRef]);

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
      const isPlayerWinner = winner === playerColor;
      
      setGameStatus(`${isPlayerWinner ? 'You win' : 'Computer wins'} by checkmate!`);
      
      // Show confetti if player wins
      if (isPlayerWinner) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 8000);
      }
      
      setGameEnded(true);
      setIsWhiteTimerRunning(false);
      setIsBlackTimerRunning(false);
      return true;
    } else if (chess.isDraw()) {
      const reason = chess.isStalemate() ? 'stalemate' :
                     chess.isThreefoldRepetition() ? 'repetition' :
                     chess.isInsufficientMaterial() ? 'insufficient material' : 
                     'fifty-move rule';
                     
      setGameStatus(`Game ends in a draw (${reason})!`);
      setGameEnded(true);
      setIsWhiteTimerRunning(false);
      setIsBlackTimerRunning(false);
      return true;
    }
    return false;
  }, [playerColor]);

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
    setIsWhiteTimerRunning(false);
    setIsBlackTimerRunning(false);
  };

  // Handle time up
  const handleTimeUp = (color) => {
    if (gameEnded) return;
    
    const winner = color === 'w' ? 'black' : 'white';
    const winnerText = winner === playerColor ? 'You' : 'Computer';
    
    setGameStatus(`Time's up! ${winnerText} win${winnerText === 'You' ? '' : 's'} on time!`);
    
    // Show confetti if player wins on time
    if (winner === playerColor) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }
    
    setGameEnded(true);
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

  // Player profile component with Chakra UI
  const PlayerProfile = ({ isComputer = false, color }) => {
    const username = isComputer ? 'Computer' : (currentUser?.username || 'You');
    
    return (
      <Flex 
        alignItems="center" 
        p={3}
        borderRadius="lg"
        cursor="pointer"
        bg="chess-hover"
        _hover={{ opacity: 0.9 }}
      >
        <Avatar 
          size="md" 
          icon={isComputer ? <FaRobot size="1.5rem" /> : undefined}
          name={!isComputer ? username : undefined}
          bg="chess-dark" 
          color="white" 
          mr={3}
        />
        <Box>
          <Text fontWeight="medium">{username}</Text>
          <Badge 
            colorScheme={color === 'white'}
          >
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Badge>
          {isComputer && gameSettings && (
            <Text fontSize="xs" mt={1} color="gray.600">
              {gameSettings.difficulty.toUpperCase()}
            </Text>
          )}
        </Box>
      </Flex>
    );
  };

  if (showModal) {
    return (
      <ComputerGameModal
        onClose={() => navigate('/')}
        onStartGame={handleStartGame}
      />
    );
  }

  return (
    <Container maxW="100%" px={4} py={4}>
      {/* Confetti animation */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      
      {/* Game status banner */}
      {gameStatus && (
        <Box
          p={4}
          mb={4}
          rounded="lg"
          shadow="xl"
          textAlign="center"
          bg={
            gameStatus.includes('You win') ? 'green.500' : 
            gameStatus.includes('Computer wins') ? 'red.500' :
            gameStatus.includes('draw') ? 'blue.500' : 
            'yellow.100'
          }
          color={
            gameStatus.includes('draw') || gameStatus.includes('win') ? 
              'white' : 'yellow.800'
          }
        >
          <Heading as="h2" size="lg">{gameStatus}</Heading>
          {gameEnded && (
            <HStack mt={3} spacing={3} justify="center">
              <Button
                onClick={() => navigate('/')}
                bg="white"
                color="gray.800"
                px={4}
                py={2}
                rounded="full"
                _hover={{ bg: 'gray.100' }}
              >
                Back to Home
              </Button>
              <Button
                onClick={() => window.location.reload()}
                bg="blue.700"
                color="white"
                px={4}
                py={2}
                rounded="full"
                _hover={{ bg: 'blue.800' }}
              >
                Play Again
              </Button>
            </HStack>
          )}
        </Box>
      )}

      {/* Main game layout */}
      <Flex direction={{ base: "column", md: "row" }} gap={4}>
        {/* Left side - Chessboard and player info (60% width) */}
        <Box w={{ base: "100%", md: "60%" }} ref={containerRef}>
          <VStack spacing={4} align="stretch">
            {/* Top player (Computer or User depending on color) */}
            <Flex justify="space-between" align="center">
              <Box flex="1" mr={2}>
                <PlayerProfile 
                  isComputer={playerColor === 'white'} 
                  color={playerColor === 'white' ? 'black' : 'white'} 
                />
              </Box>
              <Flex 
                bg="chess-light" 
                color="white" 
                p={3} 
                rounded="md" 
                align="center" 
                shadow="md"
                minW="120px"
              >
                <FaClock size={18} style={{ marginRight: '8px' }} />
                <Timer
                  initialTime={playerColor === 'white' ? blackTime : whiteTime}
                  increment={timeIncrement}
                  isRunning={(playerColor === 'white' ? isBlackTimerRunning : isWhiteTimerRunning) && !gameEnded}
                  onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'b' : 'w')}
                  gameEnded={gameEnded}
                />
              </Flex>
            </Flex>

            {/* Chessboard */}
            <Box w="100%" mx="auto">
              <ThemedChessboard
                id="computer-game"
                position={position}
                onPieceDrop={onDrop}
                onPieceDragBegin={onPieceDragBegin}
                boardOrientation={playerColor}
                boardWidth={boardSize}
                customSquareStyles={possibleMoves.current.reduce((obj, square) => {
                  obj[square] = {
                    background: 'radial-gradient(circle, rgba(0,0,0,0.1) 25%, transparent 25%)',
                    borderRadius: '50%'
                  };
                  return obj;
                }, {})}
                areArrowsAllowed={true}
                showBoardNotation={true}
                allowDrag={({ piece }) => {
                  if (gameEnded || loading) return false;
                  return (piece[0] === 'w' && playerColor === 'white') || 
                         (piece[0] === 'b' && playerColor === 'black');
                }}
              />
            </Box>

            {/* Bottom player (User or Computer depending on color) */}
            <Flex justify="space-between" align="center">
              <Box flex="1" mr={2}>
                <PlayerProfile 
                  isComputer={playerColor === 'black'} 
                  color={playerColor} 
                />
              </Box>
              <Flex 
                bg="chess-light" 
                color="white" 
                p={3} 
                rounded="md" 
                align="center"
                shadow="md"
                minW="120px"
              >
                <FaClock size={18} style={{ marginRight: '8px' }} />
                <Timer
                  initialTime={playerColor === 'white' ? whiteTime : blackTime}
                  increment={timeIncrement}
                  isRunning={(playerColor === 'white' ? isWhiteTimerRunning : isBlackTimerRunning) && !gameEnded}
                  onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'w' : 'b')}
                  gameEnded={gameEnded}
                />
              </Flex>
            </Flex>

            {/* Game controls */}
            {!gameEnded && (
              <HStack spacing={4} justify="center" my={4}>
                <Button
                  onClick={handleResign}
                  bg="red.500"
                  color="white"
                  _hover={{ bg: "red.600" }}
                  size="lg"
                  w="full"
                  isDisabled={gameEnded}
                >
                  Resign
                </Button>
              </HStack>
            )}
          </VStack>
        </Box>

        {/* Right side - Game info and history (40% width) */}
        <Box w={{ base: "100%", md: "40%" }}>
          <VStack spacing={6} align="stretch" h="100%">
            {/* Game history */}
            <Box bg="chess-hover" rounded="lg" shadow="md" p={4} flex="1">
              <Flex align="center" mb={4}>
                <FaHistory style={{ marginRight: '8px' }} />
                <Heading as="h2" size="lg" color="white">Game History</Heading>
              </Flex>
              <Box 
                h="300px" 
                overflowY="auto" 
                bg="white"
                p={3}
                rounded="md"
                css={{
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    width: '10px',
                    background: 'rgba(0,0,0,0.05)',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '24px',
                  },
                }}
              >
                {moveHistory.length > 0 ? (
                  <Grid templateColumns="auto 1fr 1fr" gap={2} fontSize={{ base: "sm", md: "md" }}>
                    {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                      const moveIdx = idx * 2;
                      const whiteMove = moveHistory[moveIdx];
                      const blackMove = moveHistory[moveIdx + 1];
                      return (
                        <React.Fragment key={idx}>
                          <Text color="gray.500" fontWeight="medium">{idx + 1}.</Text>
                          <Text fontFamily="mono">{whiteMove?.notation || ''}</Text>
                          <Text fontFamily="mono" color="gray.800">{blackMove?.notation || ''}</Text>
                        </React.Fragment>
                      );
                    })}
                  </Grid>
                ) : (
                  <Flex align="center" justify="center" h="full" color="gray.500">
                    <Text>No moves yet</Text>
                  </Flex>
                )}
              </Box>
            </Box>
            
            {/* Game info */}
            <Box bg="chess-hover" rounded="lg" shadow="md" p={4} flex="1">
              <Heading as="h2" size="lg" mb={4} color="white">Game Info</Heading>
              <Box bg="white" p={4} rounded="md">
                <VStack spacing={3} align="stretch">
                  <Flex justify="space-between">
                    <Text fontWeight="bold">Difficulty:</Text> 
                    <Text capitalize>{gameSettings?.difficulty || 'Medium'}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text fontWeight="bold">Time Control:</Text> 
                    <Text>
                      {gameSettings?.timeControl?.time 
                        ? `${Math.floor(gameSettings.timeControl.time / 60)}:${(gameSettings.timeControl.time % 60).toString().padStart(2, '0')}`
                        : 'Unlimited'
                      }
                      {gameSettings?.timeControl?.increment > 0 
                        ? ` + ${gameSettings.timeControl.increment}s` 
                        : ''
                      }
                    </Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text fontWeight="bold">Your Color:</Text> 
                    <Text capitalize>{playerColor}</Text>
                  </Flex>
                </VStack>
              </Box>
              
              {loading && (
                <Flex align="center" justify="center" bg="blackAlpha.50" p={2} mt={4} rounded="md">
                  <Box className="animate-spin" h={5} w={5} border="2px" borderColor="chess-dark" borderTopColor="transparent" rounded="full" mr={3} />
                  <Text>Computer thinking...</Text>
                </Flex>
              )}
              
              {gameEnded && (
                <Button 
                  onClick={() => window.location.reload()}
                  w="full" mt={6} bg="primary" color="white" _hover={{ bg: "blue.600" }}
                >
                  Play Again
                </Button>
              )}
            </Box>
          </VStack>
        </Box>
      </Flex>

      {/* Resign confirmation dialog */}
      {showConfirmResign && (
        <Flex position="fixed" inset="0" bg="blackAlpha.500" align="center" justify="center" zIndex="50">
          <Box bg="white" p={6} rounded="lg" shadow="xl" maxW="sm" w="full" mx={4}>
            <Heading as="h3" size="md" mb={4} color="red.600">Confirm Resignation</Heading>
            <Text mb={6}>Are you sure you want to resign this game?</Text>
            <Flex justify="flex-end" gap={4}>
              <Button 
                onClick={() => setShowConfirmResign(false)}
                bg="gray.200"
                _hover={{ bg: 'gray.300' }}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmResign}
                bg="red.600"
                color="white"
                _hover={{ bg: 'red.700' }}
              >
                Resign
              </Button>
            </Flex>
          </Box>
        </Flex>
      )}
    </Container>
  );
};

export default ComputerGamePage;
