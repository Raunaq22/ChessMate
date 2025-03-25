import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ThemedChessboard from '../components/Board/ThemedChessboard';
import {
  Box,
  Flex,
  Heading,
  VStack,
  Button,
  Text,
  useBreakpointValue,
  Container,
  Icon,
  Center
} from '@chakra-ui/react';
import { FaChessKnight, FaUserFriends, FaRobot, FaTrophy } from 'react-icons/fa';
import useWindowSize from '../hooks/useWindowSize';

const Home = () => {
  const { isAuthenticated, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const [boardSize, setBoardSize] = useState(480);
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // Responsive board size
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newSize = Math.min(containerWidth, windowHeight * 0.7);
      setBoardSize(newSize);
    }
  }, [windowWidth, windowHeight, containerRef]);
  
  const checkAuth = (path) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(path);
  };

  return (
    <Container maxW="100%" px={4} py={8}>
      <Heading 
        as="h1" 
        size="2xl" 
        mb={8} 
        textAlign="center"
        color="chess-dark"
      >
        Welcome to ChessMate
        {currentUser && (
          <Text fontSize="lg" mt={2} fontWeight="normal">
            {currentUser.username}
          </Text>
        )}
      </Heading>
      
      <Flex 
        direction={{ base: "column", md: "row" }} 
        gap={8} 
        justify="center" 
        align="center"
      >
        {/* Chess board on left */}
        <Center 
          w={{ base: "100%", md: "55%" }} 
          p={4}
        >
          <Box
            ref={containerRef}
            bg="chess-light" 
            p={4} 
            rounded="xl" 
            shadow="xl"
            w="100%"
            maxW="600px"
          >
            <ThemedChessboard
              id="home-board"
              position="start"  // Empty board with pieces in starting position
              boardWidth={boardSize}
              showBoardNotation={true}
              areArrowsAllowed={false}
              boardOrientation="white"
            />
          </Box>
        </Center>
        
        {/* Navigation buttons on right */}
        <VStack 
          spacing={6} 
          align="stretch" 
          w={{ base: "100%", md: "35%" }}
        >
          <Button
            onClick={() => checkAuth('/lobby')}
            bg="primary"
            color="white"
            size="lg"
            height="70px"
            leftIcon={<Icon as={FaTrophy} boxSize={6} />}
            _hover={{ 
              bg: "chess-hover",
              transform: "translateY(-2px)",
              shadow: "lg"
            }}
            transition="all 0.2s"
            fontSize="xl"
            borderRadius="lg"
            shadow="md"
          >
            Play Lobby
          </Button>
          
          <Button
            onClick={() => checkAuth('/play-friend')}
            bg="chess-hover"
            color="white"
            size="lg"
            height="70px"
            leftIcon={<Icon as={FaUserFriends} boxSize={6} />}
            _hover={{ 
              bg: "primary",
              transform: "translateY(-2px)",
              shadow: "lg"
            }}
            transition="all 0.2s"
            fontSize="xl"
            borderRadius="lg"
            shadow="md"
          >
            Play a Friend
          </Button>
          
          <Button
            onClick={() => checkAuth('/play-computer')}
            bg="white"
            color="chess-dark"
            size="lg"
            height="70px"
            leftIcon={<Icon as={FaRobot} boxSize={6} />}
            _hover={{ 
              bg: "gray.100",
              transform: "translateY(-2px)",
              shadow: "lg"
            }}
            transition="all 0.2s"
            fontSize="xl"
            borderRadius="lg"
            shadow="md"
          >
            Play Computer
          </Button>
        </VStack>
      </Flex>
    </Container>
  );
};

export default Home;