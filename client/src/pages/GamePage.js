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

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const [boardSize, setBoardSize] = useState(600);
  const toast = useToast();

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
      // Calculate board size based on container width
      const newSize = Math.min(containerWidth, windowHeight * 0.8);
      setBoardSize(newSize);
    }
  }, [windowWidth, windowHeight, containerRef]);

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

  // PlayerProfile component with Chakra UI
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
      <Flex 
        alignItems="center" 
        p={3}
        borderRadius="lg"
        cursor="pointer"
        bg="chess-hover"
        _hover={{ opacity: 0.9 }}
        onClick={() => playerId && navigate(`/profile/${playerId}`)}
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
          <Badge 
            colorScheme={color === 'white'}
          >
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Badge>
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
    <Container maxW="100%" px={4} py={4}>
      {/* Confetti animation */}
      {showConfetti && <Confetti width={windowWidth} height={windowHeight} recycle={false} numberOfPieces={500} />}

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
      <Flex direction={{ base: "column", md: "row" }} gap={4}>
        {/* Left side - Chessboard and player info (60% width) */}
        <Box w={{ base: "100%", md: "60%" }} ref={containerRef}>
          <VStack spacing={4} align="stretch">
            {/* Top player (opponent) */}
            <Flex justify="space-between" align="center">
              <Box flex="1" mr={2}>
                <PlayerProfile color={playerColor === 'white' ? 'black' : 'white'} />
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
                  isRunning={(playerColor === 'white' ? isBlackTimerRunning : isWhiteTimerRunning) && gameStarted && !gameEnded}
                  onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'b' : 'w')}
                  onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'black' : 'white', time)}
                  gameEnded={gameEnded}
                />
              </Flex>
            </Flex>

            {/* Chessboard */}
            <Box w="100%" mx="auto">
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
            </Box>

            {/* Bottom player (user) */}
            <Flex justify="space-between" align="center">
              <Box flex="1" mr={2}>
                <PlayerProfile color={playerColor} />
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
                  isRunning={(playerColor === 'white' ? isWhiteTimerRunning : isBlackTimerRunning) && gameStarted && !gameEnded}
                  onTimeUp={() => handleTimeUp(playerColor === 'white' ? 'w' : 'b')}
                  onTimeChange={(time) => handleTimeUpdate(playerColor === 'white' ? 'white' : 'black', time)}
                  gameEnded={gameEnded}
                />
              </Flex>
            </Flex>

            {/* Game controls */}
            <HStack spacing={4} justify="center" my={4}>
              <Button
                onClick={handleResign}
                bg="red.500"
                color="white"
                _hover={{ bg: "red.600" }}
                size="lg"
                w="full"
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
                w="full"
                isDisabled={offeringDraw || drawOfferReceived || !gameStarted || gameStatus?.includes('wins') || gameStatus?.includes('Draw')}
              >
                {offeringDraw ? 'Draw Offered' : 'Offer Draw'}
              </Button>
            </HStack>

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

        {/* Right side - Game history and chat (40% width) */}
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
                {moveHistory && moveHistory.length > 0 ? (
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
            
            {/* Chat */}
            <Box bg="chess-hover" rounded="lg" shadow="md" p={4} flex="1">
              <Flex align="center" mb={4}>
                <FaComment style={{ marginRight: '8px' }} />
                <Heading as="h2" size="lg" color="white">Chat</Heading>
              </Flex>
              <ChatWindow
                messages={chatMessages}
                currentUser={currentUser}
              />
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={false}
              />
            </Box>
          </VStack>
        </Box>
      </Flex>

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
        <Box 
          position="fixed" 
          top="4" 
          left="50%" 
          transform="translateX(-50%)" 
          p={4} 
          rounded="lg" 
          bg="green.100" 
          border="1px" 
          borderColor="green.400" 
          color="green.800" 
          textAlign="center"
          zIndex="banner"
        >
          <Flex align="center" justify="center">
            <Box 
              mr={3} 
              className="animate-spin" 
              h={5} 
              w={5} 
              borderTop="2px" 
              borderColor="green.500" 
              rounded="full"
            />
            <Heading as="h2" size="md">
              Waiting for opponent to reconnect ({reconnectionCountdown}s)
            </Heading>
          </Flex>
        </Box>
      )}
    </Container>
  );
};

export default GamePage; 