import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import ThemedChessboard from '../components/Board/ThemedChessboard';
import ComputerGameModal from '../components/Game/ComputerGameModal';
import useWindowSize from '../hooks/useWindowSize';
import Confetti from 'react-confetti';
import Timer from '../components/Game/Timer';
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Text,
  Button,
  Avatar,
  Badge,
  VStack,
  HStack,
  Heading,
  Divider,
  IconButton,
  useToast,
  Container,
  useDisclosure,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  Card,
  CardHeader,
  CardBody,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import { FaHistory, FaClock, FaUser, FaRobot, FaChessRook, FaChessKnight, FaChessQueen, FaChessBishop, FaPause, FaPlay, FaUndo, FaTrophy, FaSpinner, FaBrain, FaArrowLeft, FaChess, FaArrowLeftAlt, FaRedo, FaHome } from 'react-icons/fa';

// Custom utility function to convert chess.js move notation to standard algebraic notation
const convertToStandardNotation = (move) => {
  if (!move) return '';
  
  // Extract basic move components
  const { from, to, piece, san, flags } = move;
  
  // Return SAN if available
  if (san) return san;
  
  // Otherwise build it manually
  let notation = '';
  
  // Add piece letter for non-pawns (P is implied for pawns)
  if (piece && piece.toUpperCase() !== 'P') {
    notation += piece.toUpperCase();
  }
  
  // Add capture symbol
  if (flags && flags.includes('c')) {
    // If it's a pawn capture, add the file
    if (piece && piece.toUpperCase() === 'P') {
      notation += from.charAt(0);
    }
    notation += 'x';
  }
  
  // Add destination square
  notation += to;
  
  // Add promotion piece if applicable
  if (flags && flags.includes('p') && move.promotion) {
    notation += '=' + move.promotion.toUpperCase();
  }
  
  return notation;
};

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Difficulty to JS Chess Engine depth mapping
const difficultyToDepthMapping = {
  very_easy: 1,
  easy: 2,
  medium: 3,
  hard: 4,
  very_hard: 5
};

// Map difficulty to display name for UI
const difficultyNames = {
  very_easy: 'Very Easy',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  very_hard: 'Very Hard'
};

// Add utility functions to replace the missing imports
const ComputerGamePage = () => {
  const navigate = useNavigate();
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const [showModal, setShowModal] = useState(true);
  const [playerColor, setPlayerColor] = useState('white');
  const [difficulty, setDifficulty] = useState('medium');
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState(DEFAULT_FEN);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes default
  const [blackTime, setBlackTime] = useState(600);
  const [isWhiteTimerRunning, setIsWhiteTimerRunning] = useState(false);
  const [isBlackTimerRunning, setIsBlackTimerRunning] = useState(false);
  const [timeIncrement, setTimeIncrement] = useState(0);
  const [boardSize, setBoardSize] = useState(600);
  const [showConfetti, setShowConfetti] = useState(false);
  const [computerThinking, setComputerThinking] = useState(false);

  const containerRef = useRef(null);
  const gameRef = useRef(game);
  const possibleMoves = useRef([]);
  const toast = useToast();
  
  // Track game initialization
  const [gameInitialized, setGameInitialized] = useState(false);
  const [selectedTimeControl, setSelectedTimeControl] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  // Memo for current turn
  const currentTurn = useMemo(() => {
    return game.turn() === 'w' ? 'white' : 'black';
  }, [game]);

  // Responsive board size
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      // Calculate board size based on container width
      const newSize = Math.min(containerWidth, windowHeight * 0.7);
      setBoardSize(newSize);
    }
  }, [windowWidth, windowHeight, containerRef]);

  // Update the game reference when game state changes
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Handle time control initialization
  useEffect(() => {
    if (!gameInitialized || !selectedTimeControl) return;

    // Initialize timers based on selected time control
    if (selectedTimeControl.time !== null) {
      setWhiteTime(selectedTimeControl.time);
      setBlackTime(selectedTimeControl.time);
      setTimeIncrement(selectedTimeControl.increment);
    } else {
      // Unlimited time
      setWhiteTime(null);
      setBlackTime(null);
      setTimeIncrement(0);
    }

    // Start white's timer if white is to move first
    if (currentTurn === 'white') {
      setIsWhiteTimerRunning(true);
      setIsBlackTimerRunning(false);
    } else {
      setIsWhiteTimerRunning(false);
      setIsBlackTimerRunning(true);
    }

    setStartTime(Date.now());
  }, [gameInitialized, selectedTimeControl, currentTurn]);

  // Update timers when turn changes
  useEffect(() => {
    if (!gameInitialized || gameOver) return;

    if (currentTurn === 'white') {
      setIsWhiteTimerRunning(true);
      setIsBlackTimerRunning(false);
    } else {
      setIsWhiteTimerRunning(false);
      setIsBlackTimerRunning(true);
    }
  }, [currentTurn, gameInitialized, gameOver]);

  // Handle timer updates
  const handleTimeUpdate = useCallback((color, timeLeft) => {
    if (color === 'white') {
      setWhiteTime(timeLeft);
    } else {
      setBlackTime(timeLeft);
    }
  }, []);

  // Handle timer expiration
  const handleTimeUp = useCallback((color) => {
    // Don't trigger timeout if the game hasn't properly started
    if (!gameInitialized || !gameStarted) {
      console.log("Ignoring time up event because game is not fully initialized or started");
      return;
    }
    
    const winner = color === 'white' ? 'black' : 'white';
    setResult(`${winner} wins by timeout`);
    setGameOver(true);
    setIsWhiteTimerRunning(false);
    setIsBlackTimerRunning(false);
    
    // Show victory confetti if player wins
    if ((winner === 'white' && playerColor === 'white') || 
        (winner === 'black' && playerColor === 'black')) {
      setShowConfetti(true);
    }
    
    toast({
      title: "Game Over",
      description: `${winner} wins by timeout!`,
      status: winner === playerColor ? "success" : "error",
      duration: 5000,
      isClosable: true,
    });
  }, [playerColor, toast, gameInitialized, gameStarted]);

  // Make computer move
  const makeComputerMove = useCallback(async () => {
    try {
      if (!gameRef.current || gameOver || gameRef.current.isGameOver()) return;
      
      setComputerThinking(true);
      setLoading(true);
      
      // Simulate computer "thinking" time based on difficulty
      const thinkingTime = 500 + (difficultyToDepthMapping[difficulty] * 200);
      await new Promise(resolve => setTimeout(resolve, thinkingTime));
      
      // Get best move from JS Chess Engine
      const engineDepth = difficultyToDepthMapping[difficulty] || 3;
      const currentGame = gameRef.current;
      
      // Generate best move (simulating stockfish - replace with actual engine later)
      const legalMoves = currentGame.moves();
      if (legalMoves.length === 0) return;
      
      // For simplicity, we'll use a random move selector with weight based on difficulty
      // In a real implementation, you would use an actual chess engine evaluation
      let selectedMove;
      
      // For very easy and easy, occasionally make a "blunder"
      if (difficulty === 'very_easy' && Math.random() < 0.4) {
        // Pick a completely random move 40% of the time
        selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      } else if (difficulty === 'easy' && Math.random() < 0.25) {
        // Pick a completely random move 25% of the time
        selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      } else {
        // Otherwise pick from top 3 moves (this is a simplification - 
        // in a real implementation you would rank moves based on evaluation)
        // Simulate top moves by picking the first few in the list
        const potentialMoves = legalMoves.slice(0, Math.min(3, legalMoves.length));
        selectedMove = potentialMoves[Math.floor(Math.random() * potentialMoves.length)];
      }
      
      if (!selectedMove) {
        selectedMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
      
      // Make the selected move
      const move = currentGame.move(selectedMove);
      
      // Add increment to player's time if applicable
      if (timeIncrement > 0) {
        if (currentGame.turn() === 'w') {
          setBlackTime(prev => prev + timeIncrement);
        } else {
          setWhiteTime(prev => prev + timeIncrement);
        }
      }
      
      // Update state
      const newPosition = currentGame.fen();
      setPosition(newPosition);
      setGame(new Chess(newPosition));
      
      // Add the move to the history
      const newMoveHistory = [...moveHistory, move];
      setMoveHistory(newMoveHistory);
      
      // Check if game is over after computer move
      if (currentGame.isGameOver()) {
        handleGameOver(currentGame);
      }
    } catch (error) {
      console.error('Error making computer move:', error);
      toast({
        title: "Error",
        description: "There was an error processing the computer's move.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
      setComputerThinking(false);
    }
  }, [difficulty, gameOver, moveHistory, timeIncrement, toast]);

  // Make computer move if it's the computer's turn
  useEffect(() => {
    if (!gameInitialized || !gameStarted || gameOver) return;
    
    const currentGameState = gameRef.current;
    const computerColor = playerColor === 'white' ? 'black' : 'white';
    
    // If it's computer's turn, make a move
    if (currentTurn === computerColor && !loading && !computerThinking) {
      // Short delay before computer makes its move
      const timeoutId = setTimeout(() => {
        makeComputerMove();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentTurn, gameInitialized, gameStarted, gameOver, loading, makeComputerMove, playerColor, computerThinking]);

  // Handle piece drag start
  const onPieceDragBegin = useCallback((piece, sourceSquare) => {
    // Only allow dragging if it's the player's turn and the game is active
    if (gameOver || loading) return;
    
    const turn = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (turn !== playerColor) return;
    
    // Get possible moves for the piece
    const moves = gameRef.current.moves({ 
      square: sourceSquare, 
      verbose: true 
    });
    
    if (moves.length > 0) {
      // Store possible destinations for highlighting
      const destinations = moves.map(move => move.to);
      possibleMoves.current = destinations;
    } else {
      // Reset to empty array
      possibleMoves.current = [];
    }
  }, [gameOver, loading, playerColor]);

  // Handle piece drop (player move)
  const onDrop = useCallback((sourceSquare, targetSquare) => {
    // Clear possible moves
    possibleMoves.current = [];
    
    // Exit if game is over or it's not player's turn
    if (gameOver || loading) return false;
    
    const turn = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (turn !== playerColor) return false;
    
    try {
      // Try to make the move
      const move = gameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });
      
      // If the move is invalid, return false to snap piece back
      if (!move) return false;
      
      // Add increment to player's time if applicable
      if (timeIncrement > 0) {
        if (move.color === 'w') {
          setBlackTime(prev => prev + timeIncrement);
        } else {
          setWhiteTime(prev => prev + timeIncrement);
        }
      }
      
      // Update state
      const newPosition = gameRef.current.fen();
      setPosition(newPosition);
      setGame(new Chess(newPosition));
      
      // Add the move to the history
      const newMoveHistory = [...moveHistory, move];
      setMoveHistory(newMoveHistory);
      
      // Check if game is over after player move
      if (gameRef.current.isGameOver()) {
        handleGameOver(gameRef.current);
      }
      
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  }, [gameOver, loading, moveHistory, playerColor, timeIncrement]);

  // Handle game over conditions
  const handleGameOver = useCallback((currentGame) => {
    // Only process game over if game is properly initialized
    if (!gameInitialized) return;
    
    setGameOver(true);
    setIsWhiteTimerRunning(false);
    setIsBlackTimerRunning(false);
    
    let resultMessage = "";
    
    if (currentGame.isCheckmate()) {
      const winner = currentGame.turn() === 'w' ? 'Black' : 'White';
      resultMessage = `${winner} wins by checkmate`;
      
      // Show confetti if player wins
      if ((winner === 'White' && playerColor === 'white') || 
          (winner === 'Black' && playerColor === 'black')) {
        setShowConfetti(true);
      }
      
      toast({
        title: "Checkmate!",
        description: `${winner} wins the game!`,
        status: (winner === 'White' && playerColor === 'white') || 
                (winner === 'Black' && playerColor === 'black') ? "success" : "error",
        duration: 5000,
        isClosable: true,
      });
    } else if (currentGame.isDraw()) {
      if (currentGame.isStalemate()) {
        resultMessage = "Draw by stalemate";
      } else if (currentGame.isInsufficientMaterial()) {
        resultMessage = "Draw by insufficient material";
      } else if (currentGame.isThreefoldRepetition()) {
        resultMessage = "Draw by threefold repetition";
          } else {
        resultMessage = "Draw";
      }
      
      toast({
        title: "Game Drawn",
        description: resultMessage,
        status: "info",
        duration: 5000,
        isClosable: true,
      });
    }
    
    setResult(resultMessage);
  }, [playerColor, toast, gameInitialized]);

  // Start a new game
  const handleStartGame = useCallback(({ timeControl, difficulty: selectedDifficulty, playerColor: selectedColor }) => {
    // Initialize new game
    const newGame = new Chess();
    setGame(newGame);
    setPosition(DEFAULT_FEN);
    setMoveHistory([]);
    setGameOver(false);
    setResult(null);
    setPlayerColor(selectedColor);
    setDifficulty(selectedDifficulty);
    setSelectedTimeControl(timeControl);
    setShowConfetti(false);
    
    // Initialize game state
    setGameInitialized(true);
    setGameStarted(true);
    setShowModal(false);
    
    toast({
      title: "Game Started",
      description: `You are playing as ${selectedColor} against ${difficultyNames[selectedDifficulty]} computer.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    // If player is black, computer (white) makes the first move
    if (selectedColor === 'black') {
      // Small delay before computer makes the first move
      setTimeout(() => {
        makeComputerMove();
      }, 500);
    }
  }, [makeComputerMove, toast]);

  // Restart the game with the same settings
  const handleRestartGame = useCallback(() => {
    // Initialize new game
    const newGame = new Chess();
    setGame(newGame);
    setPosition(DEFAULT_FEN);
    setMoveHistory([]);
    setGameOver(false);
    setResult(null);
    setShowConfetti(false);
    
    // Restart timers if applicable
    if (selectedTimeControl && selectedTimeControl.time !== null) {
      setWhiteTime(selectedTimeControl.time);
      setBlackTime(selectedTimeControl.time);
    }
    
    // Start appropriate timer
    if (playerColor === 'white') {
      setIsWhiteTimerRunning(true);
      setIsBlackTimerRunning(false);
    } else {
            setIsWhiteTimerRunning(false);
            setIsBlackTimerRunning(true);
    }
    
    toast({
      title: "Game Restarted",
      description: "A new game has been started with the same settings.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
    
    // If player is black, computer (white) makes the first move
    if (playerColor === 'black') {
      // Small delay before computer makes the first move
      setTimeout(() => {
        makeComputerMove();
      }, 500);
    }
  }, [makeComputerMove, playerColor, selectedTimeControl, toast]);

  // New game with different settings
  const handleNewGame = useCallback(() => {
    setShowModal(true);
    setGameInitialized(false);
    setGameStarted(false);
  }, []);

  // Format move for display
  const formatMove = useCallback((move, index) => {
    if (!move) return '';
    
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhiteMove = index % 2 === 0;
    
    const formattedMove = convertToStandardNotation(move);
    
    if (isWhiteMove) {
      return `${moveNumber}. ${formattedMove}`;
    } else {
      return formattedMove;
    }
  }, []);

  // Render player profiles
  const PlayerProfile = ({ color }) => {
    const isPlayer = color === playerColor;
    const displayName = isPlayer ? 'You' : 'Computer';
    const isWhite = color === 'white';

  return (
      <Flex
        alignItems="center"
        p={3}
        borderRadius="lg"
        bg="chess-light"
        boxShadow="sm"
        mb={3}
      >
        <Avatar
          size="md"
          icon={isPlayer ? <FaUser /> : <FaRobot />}
          bg={isWhite ? "white" : "gray.800"}
          color={isWhite ? "black" : "white"}
          mr={3}
          border="2px solid"
          borderColor={isWhite ? "gray.300" : "gray.600"}
        />
        <Box>
          <Text fontWeight="medium" color="chess-dark">{displayName}</Text>
          <Badge
            colorScheme={isWhite ? "yellow" : "gray"}
            variant="solid"
          >
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Badge>
        </Box>
      </Flex>
    );
  };

  // Memoize the board to avoid unnecessary re-renders
  const chessBoard = useMemo(() => (
              <ThemedChessboard
                id="computer-game"
                position={position}
                onPieceDrop={onDrop}
                onPieceDragBegin={onPieceDragBegin}
                boardOrientation={playerColor}
                boardWidth={boardSize}
      customSquareStyles={Array.isArray(possibleMoves.current) ? 
                  possibleMoves.current.reduce((obj, square) => {
                    obj[square] = {
                      background: 'radial-gradient(circle, rgba(0,0,0,0.1) 25%, transparent 25%)',
                      borderRadius: '50%'
                    };
                    return obj;
        }, {}) : {}}
                areArrowsAllowed={true}
                showBoardNotation={true}
                allowDrag={({ piece }) => {
        if (gameOver || loading) return false;
                  return (piece[0] === 'w' && playerColor === 'white') || 
                         (piece[0] === 'b' && playerColor === 'black');
                }}
              />
  ), [position, boardSize, playerColor, gameOver, loading, onDrop, onPieceDragBegin]);

  // Main layout render
  return (
    <Container maxW="100%" px={[2, 4]} py={4}>
      {showConfetti && <Confetti 
        width={windowWidth} 
        height={windowHeight} 
        recycle={false} 
        numberOfPieces={200}
        gravity={0.3}
        tweenDuration={3000}
      />}
      
      {/* Game status display */}
      {gameStarted && (result || gameOver) && (
        <Alert
          status={
            result?.includes('wins') ?
              (result.toLowerCase().includes(playerColor) ? 'success' : 'error') :
              'info'
          }
          variant="solid"
          mb={4}
          borderRadius="md"
        >
          <AlertIcon />
          <AlertTitle mr={2}>Game Over:</AlertTitle>
          <Text>{result}</Text>
        </Alert>
      )}
      
      {/* Main game grid */}
      {gameStarted ? (
        <Grid
          templateColumns={{ base: "1fr", lg: "60% 40%" }}
          gap={6}
        >
          {/* Left column - Chessboard and player info */}
          <GridItem>
            <Flex direction="column" h="100%">
              {/* Top player (Computer or You depending on color) */}
              <Box>
                <PlayerProfile color={playerColor === 'white' ? 'black' : 'white'} />
              </Box>
              
              {/* Chess board */}
              <Box
                ref={containerRef}
                position="relative"
                mb={4}
                alignSelf="center"
                w="100%"
                maxW="800px"
                mx="auto"
              >
                <Box w="100%" mx="auto">
                  {chessBoard}
                </Box>
                
                {/* Computer thinking indicator */}
                {computerThinking && (
                  <Flex
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    bg="blackAlpha.700"
                    color="white"
                    p={3}
                    borderRadius="md"
                    alignItems="center"
                    shadow="md"
                  >
                    <Spinner size="sm" mr={2} />
                    <Text>Computer thinking...</Text>
                  </Flex>
                )}
              </Box>
              
              {/* Bottom player (You or Computer depending on color) */}
              <Box>
                <PlayerProfile color={playerColor} />
              </Box>

            {/* Game controls */}
                <Flex 
                  justify="center" 
                  align="center" 
                  wrap="wrap"
                  gap={3}
                  mt={2}
                >
                  <Button
                    leftIcon={<Icon as={FaUndo} />}
                    onClick={handleRestartGame}
                    colorScheme="blue"
                    variant="outline"
                    size="md"
                  >
                    Restart
                  </Button>
                  <Button
                    leftIcon={<Icon as={FaTrophy} />}
                    onClick={handleNewGame}
                    bg="primary"
                    color="white"
                    _hover={{ bg: "chess-hover" }}
                    size="md"
                  >
                    New Game
                  </Button>
                  <Button
                    leftIcon={<Icon as={FaArrowLeft} />}
                    onClick={() => navigate("/home")}
                    colorScheme="gray"
                    variant="outline"
                    size="md"
                  >
                    Exit
                  </Button>
                </Flex>
              </Flex>
            </GridItem>
          
            {/* Right column - Game info, timers, and history */}
            <GridItem>
              <Card bg="chess-light" mb={4} boxShadow="md">
                <CardHeader bg="chess-hover" py={3}>
                  <Flex align="center">
                    <Icon as={FaRobot} mr={2} color="white" />
                    <Heading size="md" color="white">Game Info</Heading>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text fontWeight="medium" color="chess-dark">Difficulty:</Text>
                      <Badge colorScheme="blue" fontSize="0.9em" p={1}>
                        {difficultyNames[difficulty]}
                      </Badge>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <Text fontWeight="medium" color="chess-dark">Your color:</Text>
                      <Badge
                        colorScheme={playerColor === 'white' ? "yellow" : "gray"}
                        fontSize="0.9em"
                        p={1}
                      >
                        {playerColor.charAt(0).toUpperCase() + playerColor.slice(1)}
                      </Badge>
                    </HStack>
                    
                    <HStack justify="space-between">
                      <Text fontWeight="medium" color="chess-dark">Game status:</Text>
                      <Badge
                        colorScheme={gameOver ? "red" : "green"}
                        fontSize="0.9em"
                        p={1}
                      >
                        {gameOver ? "Game Over" : "In Progress"}
                      </Badge>
                    </HStack>
                    
                    {!gameOver && (
                      <HStack justify="space-between">
                        <Text fontWeight="medium" color="chess-dark">Current turn:</Text>
                        <Badge
                          colorScheme={currentTurn === playerColor ? "green" : "purple"}
                          fontSize="0.9em"
                          p={1}
                        >
                          {currentTurn === playerColor ? "Your Turn" : "Computer's Turn"}
                        </Badge>
                      </HStack>
                    )}
                    
                    {result && (
                      <HStack justify="space-between">
                        <Text fontWeight="medium" color="chess-dark">Result:</Text>
                        <Text color="chess-dark" fontStyle="italic">{result}</Text>
                      </HStack>
                    )}
                  </VStack>
                </CardBody>
              </Card>
              
              {/* Timers */}
              {selectedTimeControl && selectedTimeControl.time !== null && (
                <Card bg="chess-light" mb={4} boxShadow="md">
                  <CardHeader bg="chess-hover" py={3}>
                    <Flex align="center">
                      <Icon as={FaClock} mr={2} color="white" />
                      <Heading size="md" color="white">Timers</Heading>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <Box p={2} bg={currentTurn === 'white' ? "rgba(255,255,255,0.2)" : "transparent"} borderRadius="md">
                        <Flex justify="space-between" align="center">
                          <Text fontWeight="semibold" color="chess-dark">White:</Text>
                          <Timer
                            initialTime={whiteTime} 
                            time={whiteTime}
                            isRunning={isWhiteTimerRunning && !gameOver && gameInitialized && gameStarted}
                            onTimeChange={(time) => handleTimeUpdate('white', time)}
                            onTimeUp={() => handleTimeUp('white')}
                            increment={timeIncrement}
                            gameEnded={gameOver}
                          />
                        </Flex>
                      </Box>
                      
                      <Box p={2} bg={currentTurn === 'black' ? "rgba(0,0,0,0.1)" : "transparent"} borderRadius="md">
                        <Flex justify="space-between" align="center">
                          <Text fontWeight="semibold" color="chess-dark">Black:</Text>
                          <Timer
                            initialTime={blackTime}
                            time={blackTime}
                            isRunning={isBlackTimerRunning && !gameOver && gameInitialized && gameStarted}
                            onTimeChange={(time) => handleTimeUpdate('black', time)}
                            onTimeUp={() => handleTimeUp('black')}
                            increment={timeIncrement}
                            gameEnded={gameOver}
                          />
                        </Flex>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              )}
              
              {/* Move history */}
              <Card bg="chess-light" boxShadow="md">
                <CardHeader bg="chess-hover" py={3}>
                  <Flex align="center">
                    <Icon as={FaHistory} mr={2} color="white" />
                    <Heading size="md" color="white">Move History</Heading>
                  </Flex>
                </CardHeader>
                <CardBody>
                  {moveHistory.length > 0 ? (
                    <Box
                      maxH="300px"
                      overflowY="auto"
                      p={2}
                      borderRadius="md"
                      bg="white"
                      fontSize="sm"
                    >
                      <Grid templateColumns="1fr 1fr" gap={1}>
                        {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, pairIndex) => {
                          const moveIdx = pairIndex * 2;
                      return (
                            <React.Fragment key={`move-pair-${pairIndex}`}>
                              <Box p={1} bg={pairIndex % 2 === 0 ? "gray.100" : "transparent"}>
                                {formatMove(moveHistory[moveIdx], moveIdx)}
                              </Box>
                              <Box p={1} bg={pairIndex % 2 === 0 ? "gray.100" : "transparent"}>
                                {formatMove(moveHistory[moveIdx + 1], moveIdx + 1)}
                              </Box>
                        </React.Fragment>
                      );
                    })}
                      </Grid>
                    </Box>
                  ) : (
                    <Text color="chess-dark" textAlign="center" py={4}>
                      No moves yet. Start playing!
                    </Text>
                  )}
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        ) : (
          <Flex 
            direction="column" 
            align="center" 
            justify="center" 
            minH="50vh"
            bg="chess-light"
            p={8}
            borderRadius="lg"
          >
            <Heading size="lg" mb={6} color="chess-dark">Play Against Computer</Heading>
            <Text mb={6} color="chess-dark" textAlign="center">
              Challenge the computer to a game of chess. Choose your difficulty level and preferred color.
            </Text>
            <Button
              leftIcon={<Icon as={FaRobot} />}
              onClick={() => setShowModal(true)}
              size="lg"
              bg="primary"
              color="white"
              _hover={{ bg: "chess-hover" }}
            >
              Start New Game
            </Button>
          </Flex>
        )}
      
      {/* Game setup modal */}
      {showModal && (
        <ComputerGameModal
          onClose={() => {
            // Simply close the modal without redirecting
            setShowModal(false);
          }}
          onStartGame={handleStartGame}
        />
      )}
    </Container>
  );
};

export default ComputerGamePage;
