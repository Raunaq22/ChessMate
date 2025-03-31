import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useBeforeUnload } from 'react-router-dom';
import gameService from '../../services/gameService';
import CreateGameModal from './CreateGameModal';
import io from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';
import {
  Box,
  Container,
  Heading,
  Button,
  Flex,
  Text,
  Grid,
  VStack,
  HStack,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  useColorModeValue,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Tag,
  Avatar,
  Icon,
  Tooltip,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { FaPlus, FaClock, FaUser, FaIdCard, FaCalendarAlt, FaUserFriends } from 'react-icons/fa';

const GameLobby = () => {
  const [availableGames, setAvailableGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningGameId, setJoiningGameId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [createdGameId, setCreatedGameId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameJoined, setGameJoined] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const { isAuthenticated, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Helper function to check if a game is expired
  const isGameExpired = (game) => {
    if (!game.created_at) return false;
    const GAME_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
    const createdTime = new Date(game.created_at).getTime();
    return Date.now() - createdTime > GAME_EXPIRY_TIME;
  };

  // Check authentication status before fetching games
  useEffect(() => {
    if (isAuthenticated) {
      setAuthChecked(true);
    }
  }, [isAuthenticated]);

  const fetchGames = useCallback(async () => {
    // Don't fetch games if authentication hasn't been confirmed
    if (!authChecked) return;
    
    try {
      setLoading(true);
      const { availableGames } = await gameService.getAvailableGames();
      console.log("Fetched games:", availableGames);
      
      if (!Array.isArray(availableGames)) {
        console.error("Expected array of games, got:", availableGames);
        setAvailableGames([]);
        return;
      }
      
      // Only filter out expired games (created too long ago)
      const activeGames = availableGames.filter(game => !isGameExpired(game));
      console.log(`Displaying ${activeGames.length} games in lobby`);
      setAvailableGames(activeGames);
    } catch (error) {
      console.error('Failed to fetch games:', error);
      setDebugInfo(`Fetch error: ${error.message || JSON.stringify(error)}`);
      
      toast({
        title: 'Error fetching games',
        description: error.message || 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, authChecked]);

  // Initialize socket connection for real-time updates
  useEffect(() => {
    if (!authChecked) return;
    
    const newSocket = io(process.env.REACT_APP_API_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to lobby socket for real-time game updates');
    });
    
    // Listen for new game creation events
    newSocket.on('newGameAvailable', (gameData) => {
      console.log('New game available notification received:', gameData);
      
      setAvailableGames(prevGames => {
        // Check if game already exists in the list
        if (prevGames.some(g => g.game_id === gameData.game_id)) {
          return prevGames;
        }
        
        // Add the new game to the list
        return [gameData, ...prevGames];
      });
      
      toast({
        title: 'New game available',
        description: 'A new game has been created in the lobby',
        status: 'info',
        duration: 3000,
        isClosable: true,
        position: 'bottom-right'
      });
    });
    
    setSocket(newSocket);
    
    // Cleanup on unmount
    return () => {
      console.log('Disconnecting from lobby socket');
      newSocket.disconnect();
    };
  }, [toast, authChecked]);

  // Fetch games initially and then every 10 seconds as a fallback
  useEffect(() => {
    if (!authChecked) return;
    
    console.log("Initial game fetch");
    fetchGames();
    
    const interval = setInterval(() => {
      console.log("Periodic game fetch");
      fetchGames();
    }, 10000);
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchGames, authChecked]);

const handleCreateGame = async (timeControl) => {
  try {
    setDebugInfo(`Creating game with time control: ${JSON.stringify(timeControl)}`);
    
    // Convert values to proper types and validate
    const payload = {
      timeControl: timeControl.name.toLowerCase(),
      // Ensure initialTime is a number or null, never undefined
      initialTime: timeControl.time !== undefined ? Number(timeControl.time) : 
                  timeControl.time === null ? null : 600,
      increment: Number(timeControl.increment || 0),
      label: timeControl.label
    };
    
    console.log('Creating game with validated params:', payload);
    
    const response = await gameService.createGame(payload);
    
    if (response?.game?.game_id) {
      // Store the created game ID in a state variable
      setCreatedGameId(response.game.game_id);
      
      console.log('Game created successfully with time control:', {
        timeControl: payload.timeControl,
        initialTime: payload.initialTime,
        increment: payload.increment,
        label: payload.label,
        gameId: response.game.game_id
      });
      
      // Mark the game as joined to prevent cleanup
      setGameJoined(true);
      
      toast({
        title: 'Game created',
        description: 'Your game has been created. Redirecting...',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Add a small delay to ensure the game is properly saved in the database
      setTimeout(() => {
        navigate(`/game/${response.game.game_id}`);
      }, 300);
    } else {
      setDebugInfo('Game created but no game_id returned');
      
      toast({
        title: 'Something went wrong',
        description: 'Game was created but no ID was returned',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
  } catch (error) {
    console.error('Failed to create game:', error);
    setDebugInfo(`Create error: ${error.message || JSON.stringify(error)}`);
    
    toast({
      title: 'Failed to create game',
      description: error.message || 'Please try again',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  }
};

  const handleJoinGame = async (gameId) => {
    try {
      setJoinError(null);
      setDebugInfo(`Attempting to join game ${gameId}`);
      setJoiningGameId(gameId);
      
      // Check game status before joining
      try {
        const gameDetails = await gameService.getGameById(gameId);
        if (gameDetails?.status === 'completed') {
          setJoinError('This game has already ended');
          setDebugInfo('Cannot join completed game');
          setJoiningGameId(null);
          
          toast({
            title: 'Game has ended',
            description: 'This game has already been completed. Redirecting to replay...',
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
          
          // Redirect to replay if the game is completed
          navigate(`/game-replay/${gameId}`);
          return;
        }
      } catch (checkError) {
        console.warn('Error checking game status:', checkError);
        // Continue with join attempt if checking fails
      }
      
      const game = availableGames.find(g => g.game_id === gameId);
      if (!game) {
        setJoinError('Game not found in available games');
        setDebugInfo('Game not found in available games list');
        setJoiningGameId(null);
        
        toast({
          title: 'Game not found',
          description: 'This game may have been removed or expired',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        
        return;
      }
      
      if (isGameExpired(game)) {
        setJoinError('Game is expired');
        setDebugInfo('Game is expired');
        setJoiningGameId(null);
        
        toast({
          title: 'Game expired',
          description: 'This game has expired and is no longer available',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        
        return;
      }
      
      setDebugInfo(`Calling gameService.joinGame with ID: ${gameId}`);
      
      const response = await gameService.joinGame(gameId);
      setDebugInfo(`Raw join response: ${JSON.stringify(response)}`);
      
      if (!response) {
        throw new Error('No response received from server');
      }

      // Check if response contains a valid game object and is in playing state
      if (response.game && 
          response.game.game_id && 
          response.game.status === 'playing' &&
          response.game.player2_id) {  // Ensure player 2 is set
        setDebugInfo('Join successful, navigating to game...');
        
        // Mark the game as successfully joined
        if (gameId === createdGameId) {
          setGameJoined(true);
        }
        
        toast({
          title: 'Game joined',
          description: 'Successfully joined the game. Redirecting...',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Add a small delay to allow server state to update
        setTimeout(() => {
          navigate(`/game/${response.game.game_id}`);
        }, 500);
      } else {
        const errorMessage = response.message || 
                           response.error || 
                           'Game is not ready to play';
        setJoinError(errorMessage);
        setDebugInfo(`Join failed: Game state invalid - ${JSON.stringify(response)}`);
        
        toast({
          title: 'Unable to join game',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        
        await fetchGames(); // Refresh game list
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      setJoinError(`Error joining game: ${error.message || 'Unknown error'}`);
      setDebugInfo(`Join exception: ${error.stack || error.message || JSON.stringify(error)}`);
      
      toast({
        title: 'Error joining game',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setJoiningGameId(null);
    }
  };

  const formatTimeControl = (game) => {
    if (!game.initial_time) return 'Unlimited';
    const minutes = Math.floor(game.initial_time / 60);
    const seconds = game.initial_time % 60;
    if (seconds > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}+${game.increment}`;
    }
    return `${minutes}+${game.increment}`;
  };

  const formatGameId = (game) => {
    // If there's an invite code, display it, otherwise use the game ID
    if (game.invite_code) {
      return game.invite_code;
    }
    const idString = String(game.game_id);
    return idString.length > 8 ? `${idString.substring(0, 8)}...` : idString;
  };
  
  const formatCreationTime = (timestamp) => {
    const date = new Date(timestamp || Date.now());
    const now = new Date();
    
    // If it's today, just show the time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show the date and time
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    return () => {
      // Only clean up abandoned games (not games that were properly joined)
      if (createdGameId && !gameJoined) {
        console.log(`Cleaning up abandoned game ${createdGameId}`);
        gameService.cancelGame(createdGameId).catch(error => {
          console.error('Failed to cancel abandoned game:', error);
        });
      } else if (createdGameId && gameJoined) {
        console.log(`Game ${createdGameId} was properly joined, not cleaning up`);
      }
    };
  }, [createdGameId, gameJoined]);

  useBeforeUnload(
    React.useCallback(() => {
      if (createdGameId && !gameJoined) {
        console.log(`Page unloading, cleaning up game ${createdGameId}`);
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', `${process.env.REACT_APP_API_URL}/api/games/${createdGameId}`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
        xhr.send();
      }
    }, [createdGameId, gameJoined])
  );

  return (
    <Container maxW="7xl" py={8}>
      {/* Header Section */}
      <Flex direction={{ base: "column", md: "row" }} justify="space-between" align="center" mb={8}>
        
        <Button
          leftIcon={<Icon as={FaPlus} />}
          onClick={onOpen}
          bg="primary"
          color="white"
          _hover={{ bg: "chess-hover" }}
          disabled={joiningGameId !== null}
          size="lg"
          px={6}
          borderRadius="md"
        >
          Create Game
        </Button>
      </Flex>
      
      {/* Play with friend card */}
      <Card bg="chess-light" mb={8} variant="outline" borderRadius="lg" overflow="hidden">
        <CardBody p={5}>
          <Flex 
            direction={{ base: "column", md: "row" }} 
            align={{ base: "center", md: "center" }} 
            justify="space-between"
          >
            <HStack spacing={3} mb={{ base: 4, md: 0 }}>
              <Icon as={FaUserFriends} boxSize={6} color="primary" />
              <Box>
                <Heading size="md" color="#ffffff" mb={1}>Play with a Friend</Heading>
                <Text color="#dedede">Challenge a specific person using our friend code system</Text>
              </Box>
            </HStack>
            
            <Button
              onClick={() => navigate('/play-friend')}
              bg="primary"
              color="white"
              _hover={{ bg: "chess-hover" }}
              minW="150px"
              size="lg"
            >
              Friend Match
            </Button>
          </Flex>
        </CardBody>
      </Card>
      
      {/* Error messages */}
      {joinError && (
        <Alert status="error" mb={5} borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>Error:</AlertTitle>
          <AlertDescription>{joinError}</AlertDescription>
        </Alert>
      )}
      
      {debugInfo && process.env.NODE_ENV === 'development' && (
        <Alert status="warning" mb={5} borderRadius="md" variant="left-accent">
          <AlertIcon />
          <Box>
            <AlertTitle>Debug Info:</AlertTitle>
            <AlertDescription>
              <Text fontFamily="mono" fontSize="sm" overflowX="auto">
                {debugInfo}
              </Text>
            </AlertDescription>
          </Box>
        </Alert>
      )}
      
      {/* Games Grid */}
      {loading && availableGames.length === 0 ? (
        <Flex direction="column" align="center" justify="center" my={12}>
          <Spinner size="xl" thickness="4px" speed="0.65s" color="primary" mb={4} />
          <Text color="#ffffff" fontSize="lg">Loading games...</Text>
        </Flex>
      ) : (
        <>
          <Heading as="h2" size="md" color="#ffffff" mb={4}>Available Games</Heading>
          
          {availableGames.length > 0 ? (
            <Grid 
              templateColumns={{ 
                base: "1fr", 
                md: "repeat(2, 1fr)", 
                lg: "repeat(3, 1fr)" 
              }}
              gap={6}
            >
              {availableGames.map(game => (
                <Card 
                  key={game.game_id} 
                  borderRadius="lg" 
                  overflow="hidden" 
                  boxShadow="md"
                  _hover={{ boxShadow: "lg", transform: "translateY(-2px)" }}
                  transition="all 0.2s"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <CardHeader bg="chess-hover" py={3} px={4}>
                    <Flex justify="space-between" align="center">
                      <HStack>
                        <Icon as={FaClock} color="white" />
                        <Text fontWeight="bold" color="white">
                          {formatTimeControl(game)}
                        </Text>
                      </HStack>
                      
                      <Tooltip label={`Created ${formatCreationTime(game.created_at)}`}>
                        <Tag size="sm" variant="subtle" colorScheme="gray">
                          <HStack spacing={1}>
                            <Icon as={FaCalendarAlt} size="xs" />
                            <Text fontSize="xs">{formatCreationTime(game.created_at)}</Text>
                          </HStack>
                        </Tag>
                      </Tooltip>
                    </Flex>
                  </CardHeader>
                  
                  <CardBody py={4}>
                    <VStack align="stretch" spacing={3}>
                      <Flex justify="space-between" align="center">
                        <HStack>
                          <Icon as={FaUser} color="gray.500" />
                          <Text fontWeight="medium">
                            Host: {game.player1?.username || 'Unknown'}
                          </Text>
                        </HStack>
                        
                        <Tooltip label="Game ID">
                          <HStack spacing={1}>
                            <Icon as={FaIdCard} size="sm" color="gray.500" />
                            <Text fontSize="sm" color="gray.500">
                              {formatGameId(game)}
                            </Text>
                          </HStack>
                        </Tooltip>
                      </Flex>
                    </VStack>
                  </CardBody>
                  
                  <CardFooter pt={0} pb={4} px={4}>
                    <Button
                      onClick={() => handleJoinGame(game.game_id)}
                      isLoading={joiningGameId === game.game_id}
                      loadingText="Joining..."
                      isDisabled={joiningGameId !== null}
                      w="100%"
                      colorScheme="green"
                      variant="solid"
                      size="lg"
                    >
                      Join Game
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </Grid>
          ) : (
            <Box 
              textAlign="center" 
              py={12} 
              bg="chess-light" 
              borderRadius="lg"
              borderWidth="1px"
              borderColor="gray.200"
              borderStyle="dashed"
            >
              <Heading size="md" color="#ffffff" mb={2}>No games available</Heading>
              <Text color="#dedede" mb={6}>Create a game to start playing!</Text>
              <Button
                onClick={onOpen}
                bg="primary"
                color="white"
                _hover={{ bg: "chess-hover" }}
                size="lg"
              >
                Create New Game
              </Button>
            </Box>
          )}
        </>
      )}
      
      {/* Create Game Modal */}
      {isOpen && (
        <CreateGameModal
          onClose={onClose}
          onCreateGame={(timeControl) => {
            handleCreateGame(timeControl);
            onClose();
          }}
        />
      )}
    </Container>
  );
};

export default GameLobby;