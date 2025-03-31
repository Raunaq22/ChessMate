import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import gameService from '../services/gameService';
import {
  Box,
  Button,
  Container,
  Divider,
  Flex,
  FormControl,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  VStack,
  HStack,
  useToast,
  useDisclosure,
  Alert,
  AlertIcon,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  useClipboard
} from '@chakra-ui/react';
import { FaUserFriends, FaClipboard, FaClipboardCheck, FaArrowLeft, FaPlus } from 'react-icons/fa';
import CreateGameModal from '../components/Game/CreateGameModal';

const PlayWithFriendPage = () => {
  const { currentUser } = useContext(AuthContext);
  const [joinCode, setJoinCode] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [createdGameId, setCreatedGameId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { hasCopied, onCopy } = useClipboard(gameCode);

  const handleCreateGame = async (timeControl) => {
    try {
      setLoading(true);
      setError('');
      
      // Convert values to proper types and validate
      const payload = {
        timeControl: timeControl.name.toLowerCase(),
        initialTime: timeControl.time !== undefined ? Number(timeControl.time) : 
                    timeControl.time === null ? null : 600,
        increment: Number(timeControl.increment || 0),
        createFriendGame: true // Special flag for friend games
      };
      
      const response = await gameService.createGame(payload);
      
      if (response?.game?.game_id) {
        // Store both the numeric ID and the display code separately
        const gameId = response.game.game_id;
        const shareCode = response.game.invite_code || gameId.toString();
        
        console.log(`Game created with ID: ${gameId}, invite code: ${shareCode}`);
        
        // Store both values in state
        setCreatedGameId(gameId);
        setGameCode(shareCode);
        
        toast({
          title: "Game created successfully",
          description: "Share the code with your friend to start playing",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        setError('Failed to create game');
        toast({
          title: "Error",
          description: "Failed to create game",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
      toast({
        title: "Error",
        description: error.message || "Failed to create game",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode) {
      setError('Please enter a game code');
      toast({
        title: "Missing code",
        description: "Please enter a game code",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log(`Joining game with code: ${joinCode}`);
      const response = await gameService.joinGameByCode(joinCode);
      
      if (response?.game?.game_id) {
        console.log(`Successfully joined game with ID: ${response.game.game_id}`);
        toast({
          title: "Success",
          description: "Joined game successfully. Redirecting...",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        setTimeout(() => {
          navigate(`/game/${response.game.game_id}`);
        }, 500);
      } else {
        setError('Failed to join game');
        toast({
          title: "Error",
          description: "Failed to join game",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      setError(`Error: ${error.message || 'Failed to join game'}`);
      toast({
        title: "Error",
        description: error.message || "Failed to join game",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const joinCreatedGame = async () => {
    // If we have the actual game ID stored, use that directly
    if (createdGameId) {
      try {
        setLoading(true);
        // Check if the game is still active before joining
        const gameDetails = await gameService.getGameById(createdGameId);
        
        if (gameDetails?.status === 'completed') {
          // Redirect to replay if the game is completed
          console.log(`Game ${createdGameId} is already completed. Redirecting to replay...`);
          toast({
            title: "Game completed",
            description: "This game has already ended. Viewing replay...",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
          navigate(`/game-replay/${createdGameId}`);
        } else {
          console.log(`Navigating to game with stored game ID: ${createdGameId}`);
          toast({
            title: "Entering game",
            description: "Loading your game...",
            status: "info",
            duration: 2000,
            isClosable: true,
          });
          navigate(`/game/${createdGameId}`);
        }
      } catch (error) {
        console.error('Error checking game status:', error);
        navigate(`/game/${createdGameId}`);
      } finally {
        setLoading(false);
      }
    } else {
      console.error('No game ID available for direct navigation');
      setError('Could not find the game. Please create a new game or join with the code.');
      toast({
        title: "Error",
        description: "Could not find the game. Please create a new game.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="lg" py={8}>
      <Card borderRadius="lg" boxShadow="md" bg="chess-light">
        <CardHeader pb={2}>
          <Flex align="center" justify="center">
            <Icon as={FaUserFriends} boxSize={6} color="primary" mr={3} />
            <Heading size="lg" color="#ffffff">Play with a Friend</Heading>
          </Flex>
        </CardHeader>
        
        <CardBody pt={3}>
          <VStack spacing={4} align="stretch">
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}
            
            {gameCode ? (
              <Box
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor="green.200"
                bg="green.50"
              >
                <Heading size="sm" mb={2} color="green.700">
                  Game Created Successfully!
                </Heading>
                
                <Text fontSize="sm" mb={3} color="gray.600">
                  Share this code with your friend:
                </Text>
                
                <InputGroup size="md" mb={4}>
                  <Input
                    value={gameCode}
                    isReadOnly
                    bg="white"
                    borderColor="gray.300"
                  />
                  <InputRightElement width="4.5rem">
                    <Button 
                      h="1.75rem" 
                      size="sm" 
                      onClick={onCopy} 
                      bg="primary"
                      color="white"
                      _hover={{ bg: "chess-hover" }}
                      mx={1}
                    >
                      <Icon as={hasCopied ? FaClipboardCheck : FaClipboard} />
                    </Button>
                  </InputRightElement>
                </InputGroup>
                
                {hasCopied && (
                  <Text fontSize="sm" color="green.500" mb={3}>
                    Copied to clipboard!
                  </Text>
                )}
                
                <Flex justify="space-between">
                  <Button
                    leftIcon={<Icon as={FaPlus} />}
                    onClick={() => {
                      setGameCode('');
                      setCreatedGameId(null);
                    }}
                    variant="outline"
                    colorScheme="gray"
                  >
                    Create Another
                  </Button>
                  
                  <Button
                    onClick={joinCreatedGame}
                    isLoading={loading}
                    loadingText="Entering..."
                    bg="primary"
                    color="white"
                    _hover={{ bg: "chess-hover" }}
                  >
                    Enter Game
                  </Button>
                </Flex>
              </Box>
            ) : (
              <>
                <Box>
                  <Heading size="sm" mb={3} color="#dedede">Create a Game</Heading>
                  <Button
                    onClick={onOpen}
                    isLoading={loading && !gameCode}
                    loadingText="Creating..."
                    leftIcon={<Icon as={FaPlus} />}
                    w="100%"
                    bg="primary"
                    color="white"
                    _hover={{ bg: "chess-hover" }}
                    size="lg"
                  >
                    Create New Game
                  </Button>
                </Box>
                
                <Divider my={4} />
                
                <Box>
                  <Heading size="sm" mb={3} color="#dedede">Join with Code</Heading>
                  <HStack>
                    <Input
                      value={joinCode}
                      bg="#ffffff"
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Enter game code"
                      borderColor="gray.300"
                      _focus={{ borderColor: "primary" }}
                    />
                    <Button
                      onClick={handleJoinGame}
                      isLoading={loading && joinCode}
                      loadingText="Joining..."
                      isDisabled={!joinCode}
                      bg="primary"
                      color="white"
                      _hover={{ bg: "chess-hover" }}
                      size="md"
                      px={6}
                    >
                      Join
                    </Button>
                  </HStack>
                </Box>
              </>
            )}
          </VStack>
        </CardBody>
        
        <CardFooter pt={0} justifyContent="center">
          <Button
            leftIcon={<Icon as={FaArrowLeft} />}
            onClick={() => navigate('/lobby')}
            variant="ghost"
            color="#ffffff"
            _hover={{ 
              color: "primary",
              bg: "#FFFFFF" 
            }}
          >
            Back to Game Lobby
          </Button>
        </CardFooter>
      </Card>
      
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

export default PlayWithFriendPage;
