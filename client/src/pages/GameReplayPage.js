import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import GameAnalysis from '../components/Game/GameAnalysis';
import useWindowSize from '../hooks/useWindowSize';
import ThemedChessboard from '../components/Board/ThemedChessboard';
import {
  Box,
  Container,
  Flex,
  Grid,
  GridItem,
  Button,
  IconButton,
  Heading,
  Text,
  Badge,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tooltip,
  useColorModeValue,
  Icon
} from '@chakra-ui/react';
import {
  FaChess,
  FaChessKing,
  FaChessQueen,
  FaStepBackward,
  FaStepForward,
  FaArrowLeft,
  FaArrowRight,
  FaUserFriends,
  FaClock,
  FaSearch,
  FaTrophy,
  FaHome
} from 'react-icons/fa';

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

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('chess-hover', '#ffffff');
  const cardBg = useColorModeValue('chess-light', 'gray.700');
  const textColor = useColorModeValue('#ffffff', 'white');
  const primaryColor = useColorModeValue('primary', 'primary');
  const buttonHoverBg = useColorModeValue('chess-hover', '#ffffff');
  // Get API URL with fallback
  const getApiUrl = () => {
    return process.env.REACT_APP_API_URL || 
           window.REACT_APP_API_URL || 
           'http://localhost:3001'; // Fallback URL
  };

  // Prevent any piece movement in replay mode
  const onDrop = (sourceSquare, targetSquare) => {
    // In replay mode, always return false to prevent any piece movements
    return false;
  };

  // Responsive board size
  useEffect(() => {
    const calculateBoardSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newSize = Math.min(containerWidth - 32, 640);
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
  }, [windowWidth]);

  // Fetch a user by ID to get username
  const fetchUsername = async (userId, playerColor) => {
    if (!userId || isNaN(parseInt(userId))) {
      console.log(`Invalid user ID format: ${userId}, skipping fetch`);
      setPlayers(prev => ({
        ...prev,
        [playerColor]: { 
          username: playerColor === 'white' ? 'White' : 'Black',
          loading: false, 
          error: true 
        }
      }));
      return;
    }
    
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
          username: playerColor === 'white' ? 'White' : 'Black', // Provide default name
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
  
  // Update the formatGameResult function or similar to handle abandonment results
  const formatGameResult = () => {
    if (!game || !game.result) return 'Unknown result';
    
    if (game.result === 'draw') {
      return 'Game ended in a draw';
    } else if (game.result.includes('_win_by_')) {
      const color = game.result.startsWith('white') ? 'White' : 'Black';
      const reason = game.result.split('_win_by_')[1];
      
      // Format different win reasons appropriately
      switch(reason) {
        case 'checkmate':
          return `${color} won by checkmate`;
        case 'resignation':
          return `${color} won by resignation`;
        case 'timeout':
          return `${color} won on time`;
        case 'abandonment':
          return `${color} won by forfeit (opponent disconnected)`;
        default:
          return `${color} won (${reason})`;
      }
    }
    
    return game.result;
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
      <Flex justify="center" align="center" minH="80vh" direction="column">
        <Spinner size="xl" thickness="4px" speed="0.8s" color="primary" mb={4} />
        <Text color="chess-dark" fontSize="lg">Loading game data...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Container maxW="container.lg" py={8}>
        <Alert status="error" variant="left-accent" borderRadius="md" mb={4}>
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="lg" mb={2}>Error Loading Game</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            {debugInfo && (
              <Box mt={4} fontSize="sm">
                <details>
                  <summary style={{ cursor: 'pointer' }}>Debug Information</summary>
                  <Box as="pre" mt={2} p={2} bg="gray.100" borderRadius="md" overflowX="auto" fontSize="xs">
                    {JSON.stringify(debugInfo, null, 2)}
                  </Box>
                </details>
              </Box>
            )}
          </Box>
        </Alert>
        <Button
          onClick={() => navigate('/profile')}
          leftIcon={<FaHome />}
          bg="primary"
          color="white"
          _hover={{ bg: "chess-hover" }}
          size="md"
        >
          Return to Profile
        </Button>
      </Container>
    );
  }

  // Handle case when game is loaded but has no move history
  if (game && (!moveHistory || moveHistory.length === 0)) {
    return (
      <Container maxW="container.lg" py={8}>
        <Alert status="warning" variant="left-accent" borderRadius="md" mb={4}>
          <AlertIcon />
          <Box>
            <AlertTitle fontSize="lg" mb={2}>Game Found But No Moves Available</AlertTitle>
            <AlertDescription>
              This game exists but has no recorded moves to replay.
            </AlertDescription>
            {game && (
              <Box mt={4} fontSize="sm">
                <details>
                  <summary style={{ cursor: 'pointer' }}>Game Details</summary>
                  <Box as="pre" mt={2} p={2} bg="gray.100" borderRadius="md" overflowX="auto" fontSize="xs">
                    {JSON.stringify({
                      game_id: game.game_id,
                      status: game.status,
                      result: game.result,
                      player1: game.player1?.username,
                      player2: game.player2?.username,
                      move_history_length: game.move_history?.length
                    }, null, 2)}
                  </Box>
                </details>
              </Box>
            )}
          </Box>
        </Alert>
        <Button
          onClick={() => navigate('/profile')}
          leftIcon={<FaHome />}
          bg="primary"
          color="white"
          _hover={{ bg: "chess-hover" }}
          size="md"
        >
          Return to Profile
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} px={{ base: 4, md: 6 }}>
      <Card mb={6} bg={bgColor} boxShadow="md" borderRadius="lg" overflow="hidden">
        <CardHeader bg={headerBg} color="white" py={4}>
          <Flex justifyContent="space-between" alignItems="center">
            <Flex align="center">
              <Icon as={FaChess} mr={3} boxSize={6} />
              <Box>
                <Heading size="lg" mb={1}>Game Replay</Heading>
                <HStack spacing={1} fontSize="sm">
                  <Badge colorScheme="yellow" py={1} px={2} borderRadius="md">
                    {formatPlayerName('white')}
                  </Badge>
                  <Text>vs</Text>
                  <Badge colorScheme="gray" py={1} px={2} borderRadius="md">
                    {formatPlayerName('black')}
                  </Badge>
                </HStack>
              </Box>
            </Flex>
            <Button
              onClick={() => navigate('/profile')}
              leftIcon={<FaHome />}
              variant="outline"
              colorScheme="whiteAlpha"
              size="sm"
              _hover={{ bg: "whiteAlpha.200" }}
            >
              Back to Profile
            </Button>
          </Flex>
        </CardHeader>
        
        <CardBody p={0}>
          {/* Game result banner */}
          <Box bg="chess-light" py={3} px={4} borderBottom="1px" borderColor="gray.200">
            <Flex align="center" justify="center">
              <Icon as={FaTrophy} mr={2} color="#ffffff" />
              <Text fontSize="lg" fontWeight="bold" color="#ffffff">
                {formatGameResult()}
              </Text>
              <Text ml={4} fontSize="sm" color="gray.600">
                {new Date(game?.end_time || game?.updated_at).toLocaleString()}
              </Text>
            </Flex>
          </Box>
          
          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6} p={6}>
            <GridItem>
              <VStack spacing={6} align="stretch">
                {/* Chessboard */}
                <Card bg={cardBg} boxShadow="md" borderRadius="md" overflow="hidden" ref={containerRef}>
                  <Box p={4} display="flex" justifyContent="center">
                    <ThemedChessboard
                      id="replay-board"
                      position={position}
                      boardOrientation={boardOrientation}
                      boardWidth={boardSize}
                      areArrowsAllowed={false}
                      showBoardNotation={true}
                      onPieceDrop={onDrop}
                      allowDrag={({ piece }) => false}
                      customBoardStyle={{
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                  </Box>
                </Card>
                
                {/* Controls */}
                <Card bg={cardBg} boxShadow="md" borderRadius="md" overflow="hidden">
                  <CardBody p={4}>
                    <HStack justify="center" spacing={4}>
                      <Tooltip label="First Move">
                        <IconButton
                          icon={<FaStepBackward />}
                          onClick={handleFirstMove}
                          isDisabled={currentMoveIndex === -1}
                          colorScheme="gray"
                          aria-label="First move"
                        />
                      </Tooltip>
                      <Tooltip label="Previous Move">
                        <IconButton
                          icon={<FaArrowLeft />}
                          onClick={handlePreviousMove}
                          isDisabled={currentMoveIndex === -1}
                          colorScheme="gray"
                          aria-label="Previous move"
                        />
                      </Tooltip>
                      <Tooltip label="Next Move">
                        <IconButton
                          icon={<FaArrowRight />}
                          onClick={handleNextMove}
                          isDisabled={currentMoveIndex === moveHistory.length - 1}
                          colorScheme="gray"
                          aria-label="Next move"
                        />
                      </Tooltip>
                      <Tooltip label="Last Move">
                        <IconButton
                          icon={<FaStepForward />}
                          onClick={handleLastMove}
                          isDisabled={currentMoveIndex === moveHistory.length - 1}
                          colorScheme="gray"
                          aria-label="Last move"
                        />
                      </Tooltip>
                    </HStack>
                    
                    <Flex justify="center" mt={4}>
                      <Button
                        onClick={handleStartAnalysis}
                        bg="primary"
                        color="white"
                        _hover={{ bg: "chess-hover" }}
                        leftIcon={<FaSearch />}
                        size="md"
                      >
                        Detailed Analysis
                      </Button>
                    </Flex>
                  </CardBody>
                </Card>
              </VStack>
            </GridItem>
            
            <GridItem>
              <VStack spacing={6} align="stretch">
                {/* Move history */}
                <Card bg={cardBg} boxShadow="md" borderRadius="md" overflow="hidden">
                  <CardHeader bg={headerBg} py={3} px={4}>
                    <Flex align="center">
                      <Icon as={FaChessQueen} color="white" mr={2} />
                      <Heading size="md" color="white">Move History</Heading>
                    </Flex>
                  </CardHeader>
                  <CardBody p={4}>
                    <Box h="350px" overflowY="auto" px={2}>
                      {moveHistory.length > 0 ? (
                        <Grid templateColumns="max-content 1fr 1fr" gap={2} fontSize="sm">
                          {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                            const moveIdx = idx * 2;
                            const whiteMove = moveHistory[moveIdx];
                            const blackMove = moveHistory[moveIdx + 1];
                            const isCurrentWhiteMove = currentMoveIndex === moveIdx;
                            const isCurrentBlackMove = currentMoveIndex === moveIdx + 1;
                            
                            return (
                              <React.Fragment key={idx}>
                                <Text color="gray.500" fontWeight="medium">{idx + 1}.</Text>
                                <Button
                                  variant={isCurrentWhiteMove ? "solid" : "ghost"}
                                  size="xs"
                                  bg={isCurrentWhiteMove ? "primary" : "transparent"}
                                  color={isCurrentWhiteMove ? "white" : "#ffffff"}
                                  _hover={{ bg: isCurrentWhiteMove ? "primary" : "gray.100" }}
                                  onClick={() => {
                                    if (whiteMove) {
                                      setCurrentMoveIndex(moveIdx);
                                      const newChess = new Chess();
                                      newChess.load(whiteMove.fen);
                                      setChess(newChess);
                                      setPosition(whiteMove.fen);
                                    }
                                  }}
                                  fontFamily="mono"
                                  h="auto"
                                  py={1}
                                  justifyContent="flex-start"
                                >
                                  {whiteMove?.notation || ''}
                                </Button>
                                <Button
                                  variant={isCurrentBlackMove ? "solid" : "ghost"}
                                  size="xs"
                                  bg={isCurrentBlackMove ? "primary" : "transparent"}
                                  color={isCurrentBlackMove ? "white" : "#ffffff"}
                                  _hover={{ bg: isCurrentBlackMove ? "primary" : "gray.100" }}
                                  onClick={() => {
                                    if (blackMove) {
                                      setCurrentMoveIndex(moveIdx + 1);
                                      const newChess = new Chess();
                                      newChess.load(blackMove.fen);
                                      setChess(newChess);
                                      setPosition(blackMove.fen);
                                    }
                                  }}
                                  fontFamily="mono"
                                  h="auto"
                                  py={1}
                                  justifyContent="flex-start"
                                >
                                  {blackMove?.notation || ''}
                                </Button>
                              </React.Fragment>
                            );
                          })}
                        </Grid>
                      ) : (
                        <Flex align="center" justify="center" h="100%">
                          <Text color="gray.500">No moves available</Text>
                        </Flex>
                      )}
                    </Box>
                  </CardBody>
                </Card>
                
                {/* Game info */}
                <Card bg={cardBg} boxShadow="md" borderRadius="md" overflow="hidden">
                  <CardHeader bg={headerBg} py={3} px={4}>
                    <Flex align="center">
                      <Icon as={FaChessKing} color="white" mr={2} />
                      <Heading size="md" color="white">Game Info</Heading>
                    </Flex>
                  </CardHeader>
                  <CardBody p={4}>
                    <VStack spacing={3} align="stretch">
                      <Flex justify="space-between">
                        <HStack>
                          <Icon as={FaClock} color="#ffffff" />
                          <Text fontWeight="semibold" color="#ffffff">Time Control:</Text>
                        </HStack>
                        <Badge colorScheme="blue" px={2} py={1}>
                          {formatTimeControl()}
                        </Badge>
                      </Flex>
                      
                      <Divider />
                      
                      <Flex justify="space-between">
                        <HStack>
                          <Icon as={FaUserFriends} color="#ffffff" />
                          <Text fontWeight="semibold" color="#ffffff">Players:</Text>
                        </HStack>
                      </Flex>
                      
                      <Flex justify="space-between" pl={6}>
                        <Text color="#ffffff">White:</Text>
                        <Text fontWeight="medium" color="#ffffff">{formatPlayerName('white')}</Text>
                      </Flex>
                      
                      <Flex justify="space-between" pl={6}>
                        <Text color="#ffffff">Black:</Text>
                        <Text fontWeight="medium" color="#ffffff">{formatPlayerName('black')}</Text>
                      </Flex>
                      
                      <Divider />
                      
                      <Flex justify="space-between">
                        <HStack>
                          <Icon as={FaTrophy} color="#ffffff" />
                          <Text fontWeight="semibold" color="#ffffff">Result:</Text>
                        </HStack>
                        <Text color="#ffffff" fontStyle="italic">{formatGameResult()}</Text>
                      </Flex>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </GridItem>
          </Grid>
        </CardBody>
      </Card>
      
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

export default GameReplayPage;
