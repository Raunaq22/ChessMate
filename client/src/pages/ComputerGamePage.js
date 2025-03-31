import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import ThemedChessboard from '../components/Board/ThemedChessboard';
import ComputerGameModal from '../components/Game/ComputerGameModal';
import useWindowSize from '../hooks/useWindowSize';
import Confetti from 'react-confetti';
import Timer from '../components/Game/Timer';
import chessEngineService from '../utils/chessEngineService';
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
  const [showResignConfirm, setShowResignConfirm] = useState(false);

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
      // Calculate board size based on container width, ensuring it's square
      const maxSize = Math.min(containerWidth - 16, windowHeight * 0.6);
      setBoardSize(maxSize);
    }
  }, [windowWidth, windowHeight, containerRef]);

  // Update the game reference when game state changes
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Handle time control initialization
  useEffect(() => {
    if (!gameInitialized || !selectedTimeControl) return;

    console.log("Time control selected:", selectedTimeControl);
    
    // Initialize timers based on selected time control
    if (selectedTimeControl.time !== null) {
      // Only set initial times if they haven't been set yet
      if (whiteTime === 600 && blackTime === 600) { // Check if using default values
        setWhiteTime(selectedTimeControl.time);
        setBlackTime(selectedTimeControl.time);
      }
      setTimeIncrement(0); // Always set to 0 for computer games
      console.log(`Setting time to ${selectedTimeControl.time}s`);
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

    // Only update timer running state, don't modify the actual time values
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
      setWhiteTime(prev => {
        // Only update if the new time is less than or equal to the previous time
        // This prevents the timer from resetting to a higher value
        return timeLeft <= prev ? timeLeft : prev;
      });
    } else {
      setBlackTime(prev => {
        // Only update if the new time is less than or equal to the previous time
        // This prevents the timer from resetting to a higher value
        return timeLeft <= prev ? timeLeft : prev;
      });
    }
  }, []);

  // Handle timer expiration
  const handleTimeUp = useCallback((color) => {
    // Don't trigger timeout if the game hasn't properly started
    if (!gameInitialized || !gameStarted) {
      console.log("Ignoring time up event because game is not fully initialized or started");
      return;
    }
    
    // Color is passed as 'w' or 'b' from Timer component
    const winner = color === 'w' ? 'black' : 'white';
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

  // Make computer move
  const makeComputerMove = useCallback(async () => {
    try {
      if (!gameRef.current || gameOver || gameRef.current.isGameOver()) return;
      
      setComputerThinking(true);
      setLoading(true);
      
      // Simulate thinking time based on difficulty
      const thinkingTime = 500 + (difficultyToDepthMapping[difficulty] * 200);
      await new Promise(resolve => setTimeout(resolve, thinkingTime));
      
      // Set current position and difficulty
      chessEngineService.setBoardPosition(gameRef.current.fen());
      chessEngineService.setDifficulty(difficulty);
      
      // Get the next move
      chessEngineService.getNextMove((move) => {
        if (!move) {
          console.error('No valid move returned from engine');
          setLoading(false);
          setComputerThinking(false);
          return;
        }
        
        try {
          // Make the move
          const chessMove = gameRef.current.move({
            from: move.from,
            to: move.to,
            promotion: 'q' // Always promote to queen for simplicity
          });
          
          if (!chessMove) {
            console.error('Invalid move returned by engine:', move);
            setLoading(false);
            setComputerThinking(false);
            return;
          }
          
          // Update state
          const newPosition = gameRef.current.fen();
          setPosition(newPosition);
          setGame(new Chess(newPosition));
          
          // Add the move to history
          const formattedMove = {
            ...chessMove,
            notation: convertToStandardNotation(chessMove)
          };
          setMoveHistory(prev => [...prev, formattedMove]);
          
          // Check if game is over after computer move
          if (gameRef.current.isGameOver()) {
            handleGameOver(gameRef.current);
          }
        } catch (error) {
          console.error('Error applying computer move:', error);
        } finally {
          setLoading(false);
          setComputerThinking(false);
        }
      });
    } catch (error) {
      console.error('Error in makeComputerMove:', error);
      setLoading(false);
      setComputerThinking(false);
    }
  }, [difficulty, gameOver, handleGameOver, playerColor]);

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
      
      // Update state
      const newPosition = gameRef.current.fen();
      setPosition(newPosition);
      setGame(new Chess(newPosition));
      
      // Add the move to the history with formatted notation
      const formattedMove = {
        ...move,
        notation: convertToStandardNotation(move)
      };
      setMoveHistory(prev => [...prev, formattedMove]);
      
      // Check if game is over after player move
      if (gameRef.current.isGameOver()) {
        handleGameOver(gameRef.current);
      }
      
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  }, [gameOver, loading, playerColor, handleGameOver]);

  // Start a new game
  const handleStartGame = useCallback(({ timeControl, difficulty: selectedDifficulty, playerColor: selectedColor }) => {
    console.log("Starting new game with time control:", timeControl);
    
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
    
    // Initialize timers only if they haven't been set yet
    if (timeControl && timeControl.time !== null) {
      console.log(`Setting initial times: ${timeControl.time}s`);
      setWhiteTime(timeControl.time);
      setBlackTime(timeControl.time);
      setTimeIncrement(0);
    } else {
      setWhiteTime(null);
      setBlackTime(null);
      setTimeIncrement(0);
    }
    
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

  // Handle resignation
  const handleResign = useCallback(() => {
    setShowResignConfirm(true);
  }, []);

  const confirmResign = useCallback(() => {
    const winner = playerColor === 'white' ? 'black' : 'white';
    setResult(`${winner} wins by resignation`);
    setGameOver(true);
    setIsWhiteTimerRunning(false);
    setIsBlackTimerRunning(false);
    setShowResignConfirm(false);
    
    toast({
      title: "Game Over",
      description: `${winner} wins by resignation!`,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  }, [playerColor, toast]);

  const cancelResign = useCallback(() => {
    setShowResignConfirm(false);
  }, []);

  // Main layout render
  return (
    <Container maxW="container.xl" p={{ base: 2, md: 4 }}>
      <Box position="relative" minH="100vh">
        {/* Game header */}
        <Flex 
          justify="space-between" 
          align="center" 
          mb={4} 
          wrap="wrap"
          gap={2}
        >
          <HStack>
            <IconButton
              icon={<FaArrowLeft />}
              onClick={() => navigate('/')}
              aria-label="Back to home"
              variant="ghost"
              color="chess-dark"
            />
            <Heading size={{ base: "md", md: "lg" }} color="chess-dark">
              Playing Against Computer
            </Heading>
          </HStack>
          <Badge
            colorScheme="blue"
            p={2}
            borderRadius="md"
            fontSize={{ base: "xs", md: "sm" }}
          >
            {difficultyNames[difficulty]}
          </Badge>
        </Flex>

        {/* Main game content */}
        <Grid
          templateColumns={{ base: "1fr", lg: "2fr 1fr" }}
          gap={{ base: 4, lg: 6 }}
        >
          {/* Left column - Chessboard */}
          <GridItem>
            <VStack spacing={4} align="stretch">
              {/* Top player (Computer) */}
              <Flex 
                justify="space-between" 
                align="center"
                p={{ base: 2, md: 3 }}
                bg="chess-light"
                borderRadius="md"
                shadow="sm"
              >
                <HStack>
                  <Avatar icon={<FaRobot />} bg="chess-dark" color="white" />
                  <Text fontWeight="bold" color="chess-dark">Computer</Text>
                </HStack>
                <Flex 
                  bg="chess-dark" 
                  color="white" 
                  p={2} 
                  rounded="md" 
                  align="center"
                  shadow="md"
                  minW="100px"
                >
                  <FaClock size={16} style={{ marginRight: '8px' }} />
                  <Timer
                    initialTime={playerColor === 'white' ? blackTime : whiteTime}
                    increment={timeIncrement}
                    isRunning={playerColor === 'white' ? isBlackTimerRunning : isWhiteTimerRunning}
                    onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'b' : 'w')}
                    gameEnded={gameOver}
                  />
                </Flex>
              </Flex>

              {/* Chessboard container */}
              <Box
                ref={containerRef}
                position="relative"
                paddingBottom="100%"
                bg="white"
                borderRadius="lg"
                shadow="md"
              >
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {chessBoard}
                </Box>
              </Box>

              {/* Bottom player (User) */}
              <Flex 
                justify="space-between" 
                align="center"
                p={{ base: 2, md: 3 }}
                bg="chess-light"
                borderRadius="md"
                shadow="sm"
              >
                <HStack>
                  <Avatar icon={<FaUser />} bg="chess-dark" color="white" />
                  <Text fontWeight="bold" color="chess-dark">You</Text>
                </HStack>
                <Flex 
                  bg="chess-dark" 
                  color="white" 
                  p={2} 
                  rounded="md" 
                  align="center"
                  shadow="md"
                  minW="100px"
                >
                  <FaClock size={16} style={{ marginRight: '8px' }} />
                  <Timer
                    initialTime={playerColor === 'white' ? whiteTime : blackTime}
                    increment={timeIncrement}
                    isRunning={playerColor === 'white' ? isWhiteTimerRunning : isBlackTimerRunning}
                    onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'w' : 'b')}
                    gameEnded={gameOver}
                  />
                </Flex>
              </Flex>

              {/* Game controls for mobile */}
              <Box display={{ base: "block", lg: "none" }}>
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <Button
                    leftIcon={<FaUndo />}
                    onClick={handleRestartGame}
                    isDisabled={moveHistory.length === 0 || loading}
                    colorScheme="blue"
                    size="lg"
                  >
                    Undo Move
                  </Button>
                  <Button
                    leftIcon={<FaRedo />}
                    onClick={handleResign}
                    isDisabled={gameOver || loading}
                    colorScheme="red"
                    size="lg"
                  >
                    Resign
                  </Button>
                </Grid>
              </Box>
            </VStack>
          </GridItem>

          {/* Right column - Game info and controls */}
          <GridItem display={{ base: "none", lg: "block" }}>
            <VStack spacing={4} align="stretch">
              {/* Game controls */}
              <Card bg="chess-light" boxShadow="md">
                <CardHeader bg="chess-hover" py={3}>
                  <Flex align="center">
                    <Icon as={FaChess} mr={2} color="white" />
                    <Heading size="md" color="white">Game Controls</Heading>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3}>
                    <Button
                      leftIcon={<FaUndo />}
                      onClick={handleRestartGame}
                      isDisabled={moveHistory.length === 0 || loading}
                      colorScheme="blue"
                      size="lg"
                      width="100%"
                    >
                      Undo Move
                    </Button>
                    <Button
                      leftIcon={<FaRedo />}
                      onClick={handleResign}
                      isDisabled={gameOver || loading}
                      colorScheme="red"
                      size="lg"
                      width="100%"
                    >
                      Resign
                    </Button>
                  </VStack>
                </CardBody>
              </Card>

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
                      <Grid templateColumns="auto 1fr 1fr" gap={2}>
                        {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                          const moveIdx = idx * 2;
                          const whiteMove = moveHistory[moveIdx];
                          const blackMove = moveHistory[moveIdx + 1];
                          return (
                            <React.Fragment key={`move-pair-${idx}`}>
                              <Text color="gray.500" fontWeight="medium">{idx + 1}.</Text>
                              <Text fontFamily="mono">{whiteMove?.notation || ''}</Text>
                              <Text fontFamily="mono" color="gray.800">{blackMove?.notation || ''}</Text>
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
            </VStack>
          </GridItem>
        </Grid>

        {/* Modals and overlays */}
        <ComputerGameModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onStart={handleStartGame}
          selectedColor={playerColor}
          onSelectColor={setPlayerColor}
          selectedDifficulty={difficulty}
          onSelectDifficulty={setDifficulty}
        />

        {showResignConfirm && (
          <Alert
            status="warning"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="200px"
            bg="white"
            borderRadius="md"
            shadow="lg"
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            zIndex={2}
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              Confirm Resignation
            </AlertTitle>
            <Text mb={4}>Are you sure you want to resign?</Text>
            <HStack spacing={3}>
              <Button onClick={confirmResign} colorScheme="red">
                Yes, Resign
              </Button>
              <Button onClick={cancelResign} variant="outline">
                Cancel
              </Button>
            </HStack>
          </Alert>
        )}

        {showConfetti && <Confetti />}
      </Box>
    </Container>
  );
};

export default ComputerGamePage;
