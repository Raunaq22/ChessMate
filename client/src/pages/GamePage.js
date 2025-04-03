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
import CapturedPieces from '../components/Game/CapturedPieces';
import { motion } from 'framer-motion';
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
  useColorModeValue,
  Divider,
  IconButton,
  useToast,
  Container
} from '@chakra-ui/react';
import { FaHistory, FaComment, FaClock, FaUser } from 'react-icons/fa';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const [boardSize, setBoardSize] = useState(600);
  const toast = useToast();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
    onSquareClick,
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
    const calculateBoardSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const viewportHeight = window.innerHeight;
        // Calculate board size based on container width and viewport height
        // Ensure it maintains aspect ratio and doesn't overflow
        const maxHeightSize = viewportHeight * 0.65; // Limit to 65% of viewport height
        const newSize = Math.min(containerWidth - 16, maxHeightSize);
        setBoardSize(newSize);
      }
    };

    // Calculate immediately if container exists
    calculateBoardSize();

    // Also recalculate after a brief delay to ensure DOM is fully rendered
    const resizeTimeout = setTimeout(() => {
      calculateBoardSize();
    }, 100);

    // Set up a MutationObserver to detect changes in container dimensions
    if (containerRef.current) {
      const observer = new ResizeObserver(() => {
        calculateBoardSize();
      });
      observer.observe(containerRef.current);
      
      return () => {
        observer.disconnect();
        clearTimeout(resizeTimeout);
      };
    }
    
    return () => clearTimeout(resizeTimeout);
  }, [windowWidth, windowHeight]);

  // Show notification as toast
  useEffect(() => {
    if (notification) {
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        status: notification.type === 'success' ? 'success' : 
                notification.type === 'info' ? 'info' : 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  }, [notification, toast]);

  // Display and update reconnection notification
  useEffect(() => {
    const reconnectionToastId = "reconnection-toast"; // Use a constant ID
    
    if (waitingForReconnection && reconnectionCountdown > 0) {
      // Check if toast already exists
      const existingToast = toast.isActive(reconnectionToastId);
      
      if (!existingToast) {
        // Create new toast if it doesn't exist
        toast({
          id: reconnectionToastId,
          title: "Warning",
          description: `Opponent disconnected. Waiting for reconnection... (${reconnectionCountdown}s)`,
          status: "warning",
          duration: null, // Keep it until manually closed
          isClosable: true,
          position: "top",
        });
      } else {
        // Update existing toast
        toast.update(reconnectionToastId, {
          description: `Opponent disconnected. Waiting for reconnection... (${reconnectionCountdown}s)`
        });
      }
    } else {
      // Close toast when no longer waiting
      if (toast.isActive(reconnectionToastId)) {
        toast.close(reconnectionToastId);
      }
    }
    
    return () => {
      if (toast.isActive(reconnectionToastId)) {
        toast.close(reconnectionToastId);
      }
    };
  }, [waitingForReconnection, reconnectionCountdown, toast]);

  // PlayerProfile component - remove the onClick and cursor pointer
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
    
    // Calculate material advantage
    const calculateAdvantage = () => {
      if (!position) return 0;
      
      const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      let materialDiff = 0;
      
      // Count pieces in current position
      const pieceCount = {
        p: 0, n: 0, b: 0, r: 0, q: 0,
        P: 0, N: 0, B: 0, R: 0, Q: 0
      };
      
      const board = position.split(' ')[0];
      for (const char of board) {
        if (pieceCount.hasOwnProperty(char)) {
          pieceCount[char]++;
        }
      }
      
      // Calculate material difference
      for (const piece in pieceCount) {
        const pieceType = piece.toLowerCase();
        const value = pieceValues[pieceType] || 0;
        
        if (piece === piece.toUpperCase()) {  // White piece
          materialDiff += value * pieceCount[piece];
        } else {  // Black piece
          materialDiff -= value * pieceCount[piece];
        }
      }
      
      // Return material advantage from this player's perspective
      return materialDiff * (isWhite ? 1 : -1);
    };
    
    const advantage = calculateAdvantage();
    const hasAdvantage = advantage > 0;
    
    return (
      <Flex 
        alignItems="center" 
        p={3}
        borderRadius="lg"
        bg="chess-hover"
      >
        <Avatar 
          size="md" 
          name={username} 
          bg="chess-dark" 
          color="white" 
          mr={3}
        />
        <Box>
          <Text fontWeight="medium">{username}</Text>
          <Flex align="center">
          <Badge 
            colorScheme={color === 'white'}
          >
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Badge>
            
            {hasAdvantage && (
              <Text 
                ml={1}
                fontWeight="bold" 
                color="green.500"
                fontSize="sm"
              >
                +{advantage}
              </Text>
            )}
          </Flex>
        </Box>
      </Flex>
    );
  };

  // Loading state
  if (initialLoading) {
    return (
      <Flex justify="center" align="center" h="96">
        <Box className="animate-spin" h="12" w="12" border="4px" borderColor="primary" borderTopColor="transparent" rounded="full" />
      </Flex>
    );
  }

  return (
    <Container maxW="100%" px={4} py={4} minH={{ base: "100vh", md: "100vh" }} display="flex" flexDirection="column">
      {/* Confetti animation */}
      {showConfetti && <Confetti 
        width={windowWidth} 
        height={windowHeight} 
        recycle={false} 
        numberOfPieces={200}
        gravity={0.3}
        tweenDuration={3000}
      />}

      {/* Game status banner */}
      {gameStatus && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          <Box
            p={4}
            rounded="lg"
            shadow="xl"
            textAlign="center"
            bg={
              gameStatus.includes('wins') ? 
                (((gameStatus.includes('White wins') && playerColor === 'white') || 
                 (gameStatus.includes('Black wins') && playerColor === 'black')) ? 
                   'green.500' : 'red.500') : 
                gameStatus.includes('draw') ? 
                  'blue.500' : 
                  'yellow.100'
            }
            color={
              gameStatus.includes('draw') || gameStatus.includes('wins') ? 
                'white' : 'yellow.800'
            }
          >
            <Heading as="h2" size="lg">{gameStatus}</Heading>
            {(gameStatus.includes('wins') || gameStatus.includes('draw')) && (
              <HStack mt={3} spacing={3} justify="center">
                <Button
                  onClick={() => navigate('/lobby')}
                  bg="white"
                  color="gray.800"
                  px={4}
                  py={2}
                  rounded="full"
                  _hover={{ bg: 'gray.100' }}
                >
                  Back to Lobby
                </Button>
                <Button
                  onClick={handleStartAnalysis}
                  bg="blue.700"
                  color="white"
                  px={4}
                  py={2}
                  rounded="full"
                  _hover={{ bg: 'blue.800' }}
                >
                  Analyse Game
                </Button>
              </HStack>
            )}
          </Box>
        </motion.div>
      )}

      {/* Disconnection warning - only show if game has not ended */}
      {disconnected && !gameEnded && (
        <Box mb={4} p={3} rounded="md" bg="red.100" color="red.700" border="1px" borderColor="red.300">
          Opponent disconnected. Returning to lobby...
        </Box>
      )}

      {/* Resign confirmation dialog */}
      {showResignConfirm && (
        <Flex position="fixed" inset="0" bg="blackAlpha.500" align="center" justify="center" zIndex="50">
          <Box bg="white" p={6} rounded="lg" shadow="xl" maxW="sm" w="full" mx={4}>
            <Heading as="h3" size="md" mb={4} color="red.600">Confirm Resignation</Heading>
            <Text mb={6}>Are you sure you want to resign this game?</Text>
            <Flex justify="flex-end" gap={4}>
              <Button 
                onClick={cancelResign}
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

      {/* Main game layout */}
      <VStack spacing={2} align="stretch" flex="1" overflow="hidden">
        <Flex direction={{ base: "column", md: "row" }} gap={3} h={{ md: "calc(100vh - 120px)" }} overflow={{ md: "hidden" }}>
          {/* Left side - Chessboard and player info (fixed max width on large screens) */}
          <Box 
            w={{ base: "100%", md: "60%", xl: "750px" }}
            flexShrink={0}
            ref={containerRef}
            h={{ md: "100%" }}
            display="flex"
            flexDirection="column"
          >
            <VStack spacing={1} align="stretch" h="100%">
              {/* Menu button for mobile */}
              <Box display={{ base: "none", md: "none" }} position="fixed" top={4} left={4} zIndex={10}>
                <IconButton
                  aria-label="Menu"
                  icon={<HamburgerIcon />}
                  variant="solid"
                  color="white"
                  bg="chess-dark"
                  _hover={{ bg: "chess-hover" }}
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  size="md"
                />
              </Box>

              {/* Top player (opponent) */}
              <Flex 
                justify="space-between" 
                align="center" 
                px={{ base: 2, md: 4 }}
                py={2}
                bg="chess-light"
                borderRadius="md"
                shadow="sm"
              >
                <Box flex="1" mr={2}>
                  <PlayerProfile color={playerColor === 'white' ? 'black' : 'white'} />
                  <CapturedPieces 
                    fen={position} 
                    color={playerColor === 'white' ? 'black' : 'white'}
                    mt={1}
                  />
                </Box>
                <Flex 
                  bg="chess-dark" 
                  color="white" 
                  p={2} 
                  rounded="md" 
                  align="center" 
                  shadow="md"
                  minW="120px"
                >
                  <FaClock size={16} style={{ marginRight: '8px' }} />
                  <Timer
                    initialTime={playerColor === 'white' ? blackTime : whiteTime}
                    increment={timeIncrement}
                    isRunning={(playerColor === 'white' ? isBlackTimerRunning : isWhiteTimerRunning) && 
                               gameStarted && !gameEnded && 
                               playerIds && playerIds.white && playerIds.black}
                    onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'b' : 'w')}
                    onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'black' : 'white', time)}
                    gameEnded={gameEnded}
                  />
                </Flex>
              </Flex>

              {/* Chessboard with proper aspect ratio */}
              <Box 
                w="100%" 
                mx="auto"
                position="relative"
                flex={{ md: "1" }}
                minH={{ base: "auto", md: "0" }}
                paddingBottom={{ base: "100%", md: 0 }}
              >
                <Box 
                  position={{ base: "absolute", md: "relative" }}
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  h="100%"
                >
                  <ThemedChessboard
                    id="responsive-board"
                    position={position}
                    onPieceDrop={(source, target, piece) => {
                      // Only make actual moves if both players have joined
                      if (playerIds && playerIds.white && playerIds.black) {
                        return onDrop(source, target, piece);
                      } else if (playerColor === 'white' && piece[0] === 'w') {
                        // For white player, store as premove but don't actually move yet
                        toast({
                          title: "Waiting for opponent",
                          description: "Your move will be played when your opponent joins",
                          status: "info",
                          duration: 3000,
                          isClosable: true,
                        });
                        return false; // Don't make the actual move yet
                      }
                      return false;
                    }}
                    onPieceDragBegin={onPieceDragStart}
                    onSquareClick={onSquareClick}
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
                    arePremovesAllowed={true}
                    showBoardNotation={true}
                    customPieces={customPieces}
                    ref={boardRef}
                    allowDrag={({ piece }) => {
                      // Allow white to drag for premoves even if black hasn't joined
                      return !gameEnded && 
                             ((piece[0] === 'w' && playerColor === 'white') || 
                              (piece[0] === 'b' && playerColor === 'black')) &&
                             // Only require the current player's ID to be present
                             playerIds && playerIds[playerColor];
                    }}
                  />
                </Box>
              </Box>

              {/* Bottom player (user) */}
              <Flex 
                justify="space-between" 
                align="center"
                px={{ base: 2, md: 4 }}
                py={2}
                bg="chess-light"
                borderRadius="md"
                shadow="sm"
              >
                <Box flex="1" mr={2}>
                  <PlayerProfile color={playerColor} />
                  <CapturedPieces 
                    fen={position} 
                    color={playerColor}
                    mt={1}
                  />
                </Box>
                <Flex 
                  bg="chess-dark" 
                  color="white" 
                  p={2} 
                  rounded="md" 
                  align="center" 
                  shadow="md"
                  minW="120px"
                >
                  <FaClock size={16} style={{ marginRight: '8px' }} />
                  <Timer
                    initialTime={playerColor === 'white' ? whiteTime : blackTime}
                    increment={timeIncrement}
                    isRunning={(playerColor === 'white' ? isWhiteTimerRunning : isBlackTimerRunning) && 
                               gameStarted && !gameEnded && 
                               playerIds && playerIds.white && playerIds.black}
                    onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'w' : 'b')}
                    onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'white' : 'black', time)}
                    gameEnded={gameEnded}
                  />
                </Flex>
              </Flex>

              {/* Game controls for mobile only */}
              <Box pt={2} display={{ base: "block", md: "none" }}>
                <HStack spacing={4} justify="center" w="100%">
                  <Button
                    onClick={handleResign}
                    bg="red.500"
                    color="white"
                    _hover={{ bg: "red.600" }}
                    size="md"
                    w="50%"
                    isDisabled={!gameStarted || gameStatus?.includes('wins') || gameStatus?.includes('Draw')}
                  >
                    Resign
                  </Button>
                  <Button
                    onClick={handleOfferDraw}
                    bg="primary"
                    color="white"
                    _hover={{ bg: "blue.600" }}
                    size="md"
                    w="50%"
                    isDisabled={offeringDraw || drawOfferReceived || !gameStarted || gameStatus?.includes('wins') || gameStatus?.includes('Draw')}
                  >
                    {offeringDraw ? 'Draw Offered' : 'Offer Draw'}
                  </Button>
                </HStack>
              </Box>
            </VStack>
          </Box>

          {/* Right side - Game info and controls (Desktop only) */}
          <Box 
            w={{ base: "0", md: "40%", xl: "1fr" }}
            flexGrow={1}
            display={{ base: "none", md: "block" }}
            bg="white"
            p={3}
            borderRadius="md"
            shadow="md"
            h="100%"
            overflow="hidden"
            position="relative"
          >
            {/* Game controls and info content */}
            <VStack spacing={3} align="stretch" h="100%">
              {/* Game history */}
              <Box bg="chess-hover" rounded="lg" shadow="md" p={3} h="40%">
                <Flex align="center" mb={2}>
                  <FaHistory style={{ marginRight: '8px' }} />
                  <Heading as="h2" size="lg" color="white">Game History</Heading>
                </Flex>
                <Box 
                  h="calc(100% - 40px)"
                  overflowY="auto" 
                  bg="white"
                  p={2}
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
                  {moveHistory && moveHistory.length > 0 ? (
                    <Grid templateColumns="auto 1fr 1fr" gap={2} fontSize={{ base: "sm", md: "md" }}>
                      {(() => {
                        // Process the move history to remove duplicates
                        const processedMoves = [];
                        
                        // Process moves into white/black pairs
                        moveHistory.forEach(move => {
                          if (!move || !move.notation) return;
                          
                          // Skip if this notation already exists in processed moves
                          const moveExists = processedMoves.some(
                            pm => pm.white?.notation === move.notation || pm.black?.notation === move.notation
                          );
                          
                          if (moveExists) return;
                          
                          const isWhiteMove = move.color === 'w';
                          
                          if (isWhiteMove) {
                            // For white moves, create a new pair
                            processedMoves.push({
                              number: processedMoves.length + 1,
                              white: move,
                              black: null
                            });
                          } else {
                            // For black moves, find the last pair without a black move
                            let lastPair = processedMoves[processedMoves.length - 1];
                            
                            // If no pairs or last pair has black move, create a new pair
                            if (!lastPair || lastPair.black) {
                              processedMoves.push({
                                number: processedMoves.length + 1,
                                white: null,
                                black: move
                              });
                            } else {
                              // Add black move to the last pair
                              lastPair.black = move;
                            }
                          }
                        });
                        
                        // Render the processed moves
                        return processedMoves.map((pair, idx) => (
                          <React.Fragment key={idx}>
                            <Text color="gray.500" fontWeight="medium">{pair.number}.</Text>
                            <Text fontFamily="mono">{pair.white?.notation || ''}</Text>
                            <Text fontFamily="mono" color="gray.800">{pair.black?.notation || ''}</Text>
                          </React.Fragment>
                        ));
                      })()}
                    </Grid>
                  ) : (
                    <Flex align="center" justify="center" h="full" color="gray.500">
                      <Text>No moves yet</Text>
                    </Flex>
                  )}
                </Box>
              </Box>
              
              {/* Chat */}
              <Box bg="chess-hover" rounded="lg" shadow="md" p={3} h="50%" display="flex" flexDirection="column">
                <Flex align="center" mb={2}>
                  <FaComment style={{ marginRight: '8px' }} />
                  <Heading as="h2" size="lg" color="white">Chat</Heading>
                </Flex>
                <Box 
                  bg="white" 
                  p={2} 
                  rounded="md" 
                  display="flex" 
                  flexDirection="column" 
                  h="calc(100% - 40px)"
                >
                  <Box flex="1" overflowY="auto">
                    <ChatWindow
                      messages={chatMessages}
                      currentUser={currentUser}
                    />
                  </Box>
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={false}
                  />
                </Box>
              </Box>

              {/* Game controls for desktop only */}
              <Box pt={2} pb={2} mt="auto">
                <HStack spacing={4} justify="center" w="100%">
                  <Button
                    onClick={handleResign}
                    bg="red.500"
                    color="white"
                    _hover={{ bg: "red.600" }}
                    size="lg"
                    w="50%"
                    isDisabled={!gameStarted || gameStatus?.includes('wins') || gameStatus?.includes('Draw')}
                  >
                    Resign
                  </Button>
                  <Button
                    onClick={handleOfferDraw}
                    bg="primary"
                    color="white"
                    _hover={{ bg: "blue.600" }}
                    size="lg"
                    w="50%"
                    isDisabled={offeringDraw || drawOfferReceived || !gameStarted || gameStatus?.includes('wins') || gameStatus?.includes('Draw')}
                  >
                    {offeringDraw ? 'Draw Offered' : 'Offer Draw'}
                  </Button>
                </HStack>
              </Box>

              {/* Draw offer dialog */}
              {drawOfferReceived && (
                <Box p={4} bg="green.100" color="green.800" rounded="md" border="1px" borderColor="green.300">
                  <Text mb={2}>Your opponent offers a draw</Text>
                  <Flex gap={4}>
                    <Button 
                      onClick={handleAcceptDraw}
                      bg="primary"
                      color="white"
                      _hover={{ bg: "blue.600" }}
                    >
                      Accept
                    </Button>
                    <Button 
                      onClick={handleDeclineDraw}
                      bg="red.500"
                      color="white"
                      _hover={{ bg: "red.600" }}
                    >
                      Decline
                    </Button>
                  </Flex>
                </Box>
              )}
            </VStack>
          </Box>
        </Flex>

        {/* Mobile Game History and Chat (displayed at the bottom) */}
        <Box display={{ base: "block", md: "none" }} mt={4} maxH={{ base: "calc(35vh)", sm: "calc(40vh)" }} overflow="auto">
          <VStack spacing={4} align="stretch">
            {/* Game history for mobile */}
            <Box bg="chess-hover" rounded="lg" shadow="md" p={3}>
              <Flex align="center" mb={2}>
                <FaHistory style={{ marginRight: '8px' }} color="white" />
                <Heading as="h2" size="md" color="white">Game History</Heading>
              </Flex>
              <Box 
                maxH={{ base: "15vh", sm: "20vh" }}
                overflowY="auto" 
                bg="white"
                p={2}
                rounded="md"
                fontSize="sm"
              >
                {moveHistory && moveHistory.length > 0 ? (
                  <Grid templateColumns="auto 1fr 1fr" gap={1}>
                    {(() => {
                      // Process the move history to remove duplicates
                      const processedMoves = [];
                      
                      // Process moves into white/black pairs
                      moveHistory.forEach(move => {
                        if (!move || !move.notation) return;
                        
                        // Skip if this notation already exists in processed moves
                        const moveExists = processedMoves.some(
                          pm => pm.white?.notation === move.notation || pm.black?.notation === move.notation
                        );
                        
                        if (moveExists) return;
                        
                        const isWhiteMove = move.color === 'w';
                        
                        if (isWhiteMove) {
                          // For white moves, create a new pair
                          processedMoves.push({
                            number: processedMoves.length + 1,
                            white: move,
                            black: null
                          });
                        } else {
                          // For black moves, find the last pair without a black move
                          let lastPair = processedMoves[processedMoves.length - 1];
                          
                          // If no pairs or last pair has black move, create a new pair
                          if (!lastPair || lastPair.black) {
                            processedMoves.push({
                              number: processedMoves.length + 1,
                              white: null,
                              black: move
                            });
                          } else {
                            // Add black move to the last pair
                            lastPair.black = move;
                          }
                        }
                      });
                      
                      // Render the processed moves
                      return processedMoves.map((pair, idx) => (
                        <React.Fragment key={idx}>
                          <Text color="gray.500" fontWeight="medium" fontSize="xs">{pair.number}.</Text>
                          <Text fontFamily="mono" fontSize="xs">{pair.white?.notation || ''}</Text>
                          <Text fontFamily="mono" color="gray.800" fontSize="xs">{pair.black?.notation || ''}</Text>
                        </React.Fragment>
                      ));
                    })()}
                  </Grid>
                ) : (
                  <Flex align="center" justify="center" h="50px" color="gray.500">
                    <Text fontSize="sm">No moves yet</Text>
                  </Flex>
                )}
              </Box>
            </Box>
            
            {/* Chat for mobile */}
            <Box bg="chess-hover" rounded="lg" shadow="md" p={3}>
              <Flex align="center" mb={2}>
                <FaComment style={{ marginRight: '8px' }} color="white" />
                <Heading as="h2" size="md" color="white">Chat</Heading>
              </Flex>
              <Box maxH={{ base: "15vh", sm: "20vh" }} bg="white" p={2} rounded="md" display="flex" flexDirection="column">
                <Box flex="1" overflow="auto">
                <ChatWindow
                  messages={chatMessages}
                  currentUser={currentUser}
                  isMobile={true}
                />
                </Box>
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={false}
                  size="sm"
                />
              </Box>
            </Box>
          </VStack>
        </Box>
      </VStack>

      {/* Game analysis modal */}
      {showAnalysis && (
        <GameAnalysis
          gameHistory={moveHistory}
          initialFen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          onClose={() => setShowAnalysis(false)}
        />
      )}
    </Container>
  );
};

export default GamePage; 