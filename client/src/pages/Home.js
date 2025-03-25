import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ThemedChessboard from '../components/Board/ThemedChessboard';
import {
  Box,
  Flex,
  VStack,
  Button,
  Container,
  Icon,
  useBreakpointValue,
  Text,
  Heading,
  HStack,
} from '@chakra-ui/react';
import { FaChessKnight, FaUserFriends, FaRobot, FaTrophy } from 'react-icons/fa';
import useWindowSize from '../hooks/useWindowSize';

// Format image URL helper function
const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return url;
};

const Home = () => {
  const { isAuthenticated, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { width, height } = useWindowSize();
  const [boardSize, setBoardSize] = useState(540);
  
  // Handle authentication
  const goToAuthPage = (path) => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate(path);
    }
  };

  // Button sizing based on screen size
  const buttonSize = useBreakpointValue({ base: 'lg', md: 'lg' });
  const buttonSpacing = useBreakpointValue({ base: 6, md: 6 });
  
  // Responsive board size calculation
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      // Calculate board size based on container width
      const newSize = Math.min(containerWidth * 0.9, height * 0.7);
      setBoardSize(newSize);
    }
  }, [width, height, containerRef]);

  return (
    <Container maxW="container.xl" p={0}>
      <Flex 
        direction={{ base: "column", md: "row" }} 
        gap={{ base: 8, md: 12 }}
        justify="space-between" 
        align="center"
        py={{ base: 8, md: 12 }}
        px={{ base: 4, md: 8 }}
      >
        {/* Chess board on left */}
        <Box 
          w={{ base: "100%", md: "55%" }} 
          mx="auto"
          py={{ base: 4, md: 0 }}
        >
          <Box
            ref={containerRef}
            bg="chess-light" 
            p={{ base: 4, md: 6 }}
            rounded="xl" 
            shadow="xl"
          >
            <ThemedChessboard
              id="home-board"
              position="start"
              boardWidth={boardSize}
              showBoardNotation={true}
              areArrowsAllowed={false}
              boardOrientation="white"
            />
          </Box>
        </Box>
        
        {/* Navigation buttons on right */}
        <Box 
          w={{ base: "100%", md: "40%" }}
          pl={{ base: 0, md: 8 }}
        >
          <VStack
            spacing={buttonSpacing}
            align="stretch"
            w={{ base: "100%", md: "100%" }}
          >
            <Heading 
              as="h1" 
              size={{ base: "2xl", md: "2xl" }} 
              mb={4}
              textAlign={{ base: "center", md: "left" }}
              color="chess-dark"
            >
              ChessMate
            </Heading>
            
            <Text 
              fontSize={{ base: "lg", md: "xl" }}
              mb={4}
              textAlign={{ base: "center", md: "left" }}
              color="chess-dark"
            >
              Choose your game mode:
            </Text>
            
            <Button
              leftIcon={<Icon as={FaChessKnight} boxSize={6} />}
              onClick={() => goToAuthPage('/lobby')}
              size={buttonSize}
              height="70px"
              bg="primary"
              color="white"
              _hover={{ bg: "chess-hover" }}
              mb={3}
              borderRadius="md"
            >
              Play Lobby
            </Button>
            
            <Button
              leftIcon={<Icon as={FaUserFriends} boxSize={6} />}
              onClick={() => goToAuthPage('/play-friend')}
              size={buttonSize}
              height="70px"
              bg="primary"
              color="white"
              _hover={{ bg: "chess-hover" }}
              mb={3}
              borderRadius="md"
            >
              Play a Friend
            </Button>
            
            <Button
              leftIcon={<Icon as={FaRobot} boxSize={6} />}
              onClick={() => goToAuthPage('/play-computer')}
              size={buttonSize}
              height="70px"
              bg="primary"
              color="white"
              _hover={{ bg: "chess-hover" }}
              mb={3}
              borderRadius="md"
            >
              Play Computer
            </Button>
            
            {isAuthenticated && (
              <Button
                leftIcon={<Icon as={FaTrophy} boxSize={6} />}
                onClick={() => navigate('/profile')}
                size={buttonSize}
                height="70px"
                variant="outline"
                borderColor="primary"
                color="primary"
                _hover={{ bg: "gray.100" }}
                borderRadius="md"
              >
                My Profile
              </Button>
            )}
          </VStack>
        </Box>
      </Flex>
    </Container>
  );
};

export default Home;