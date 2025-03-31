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
  const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' });
  const buttonSpacing = useBreakpointValue({ base: 3, md: 4 });
  const buttonHeight = useBreakpointValue({ base: "50px", md: "60px", lg: "70px" });
  
  // Responsive board size calculation
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      // Set a size that ensures the board remains square
      const newSize = Math.min(containerWidth - 32, width * 0.85);
      setBoardSize(newSize);
    }
  }, [width, height, containerRef]);

  return (
    <Container maxW="container.xl" p={0} mt={{ base: 0, md: 0 }}>
      <Flex 
        direction={{ base: "column", md: "row" }} 
        gap={{ base: 4, md: 12 }}
        justify="space-between" 
        align={{ base: "center", md: "flex-start" }}
        py={{ base: 2, md: 6 }}
        px={{ base: 3, md: 8 }}
      >
        {/* Chess board on left */}
        <Box 
          w={{ base: "100%", md: "55%" }} 
          mx="auto"
          pb={{ base: 2, md: 0 }}
        >
          <Box
            ref={containerRef}
            bg="chess-light" 
            p={{ base: 3, md: 6 }}
            rounded="xl" 
            shadow="xl"
            width="100%"
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
          alignSelf="stretch"
          display="flex"
          flexDirection="column"
          justifyContent="center"
        >

          <VStack
            spacing={buttonSpacing}
            align="stretch"
            w="100%"
          >
            <Button
              leftIcon={<Icon as={FaChessKnight} boxSize={{ base: 4, md: 5 }} />}
              onClick={() => goToAuthPage('/lobby')}
              size={buttonSize}
              height={buttonHeight}
              bg="primary"
              color="white"
              _hover={{ bg: "chess-hover" }}
              mb={{ base: 1, md: 2 }}
              borderRadius="md"
              fontSize={{ base: "sm", md: "md" }}
            >
              Play Lobby
            </Button>
            
            <Button
              leftIcon={<Icon as={FaUserFriends} boxSize={{ base: 4, md: 5 }} />}
              onClick={() => goToAuthPage('/play-friend')}
              size={buttonSize}
              height={buttonHeight}
              bg="primary"
              color="white"
              _hover={{ bg: "chess-hover" }}
              mb={{ base: 1, md: 2 }}
              borderRadius="md"
              fontSize={{ base: "sm", md: "md" }}
            >
              Play a Friend
            </Button>
            
            <Button
              leftIcon={<Icon as={FaRobot} boxSize={{ base: 4, md: 5 }} />}
              onClick={() => goToAuthPage('/play-computer')}
              size={buttonSize}
              height={buttonHeight}
              bg="primary"
              color="white"
              _hover={{ bg: "chess-hover" }}
              mb={{ base: 1, md: 2 }}
              borderRadius="md"
              fontSize={{ base: "sm", md: "md" }}
            >
              Play Computer
            </Button>
            
            {isAuthenticated && (
              <Button
                leftIcon={<Icon as={FaTrophy} boxSize={{ base: 4, md: 5 }} />}
                onClick={() => navigate('/profile')}
                size={buttonSize}
                height={buttonHeight}
                variant="outline"
                borderColor="primary"
                color="#ffffff"
                _hover={{ bg: "gray.100", color: "primary" }}
                borderRadius="md"
                fontSize={{ base: "sm", md: "md" }}
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