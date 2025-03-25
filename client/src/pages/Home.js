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
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const [boardSize, setBoardSize] = useState(560);
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // Responsive board size that updates on window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newSize = Math.min(containerWidth * 0.95, windowHeight * 0.8);
        setBoardSize(newSize);
      }
    };
    
    handleResize(); // Initial size
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [windowWidth, windowHeight]);
  
  const checkAuth = (path) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(path);
  };

  // Get profile image or first letter for avatar
  const getAvatarInfo = () => {
    if (!currentUser) return { name: 'User' };
    
    return {
      name: currentUser.username || 'User',
      src: formatImageUrl(currentUser.profile_image_url)
    };
  };

  return (
    <Container maxW="100%" p={0}>
      <Flex 
        direction={{ base: "column", md: "row" }} 
        gap={{ base: 8, md: 4 }}
        justify="space-between" 
        align="center"
        pt={{ base: 6, md: 8 }}
        px={{ base: 4, md: 8 }}
      >
        {/* Chess board on left - responsive and centered */}
        <Box 
          w={{ base: "100%", md: "62%" }} 
          mx="auto"
          pl={{ base: 0, md: 2 }}
          pr={{ base: 0, md: 4 }}
          display="flex"
          justifyContent={{ base: "center", md: "flex-start" }}
        >
          <Box
            ref={containerRef}
            bg="chess-light" 
            p={{ base: 2, md: 4 }}
            rounded="xl" 
            shadow="xl"
            w="100%"
            maxW="700px"
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
        <VStack 
          spacing={{ base: 4, md: 6 }} 
          align="stretch" 
          w={{ base: "100%", md: "35%" }}
          pb={{ base: 6, md: 0 }}
        >
          <Button
            onClick={() => checkAuth('/lobby')}
            bg="primary"
            color="white"
            size="lg"
            height={{ base: "60px", md: "70px" }}
            leftIcon={<Icon as={FaTrophy} boxSize={{ base: 5, md: 6 }} />}
            _hover={{ 
              bg: "chess-hover",
              transform: "translateY(-2px)",
              shadow: "lg"
            }}
            transition="all 0.2s"
            fontSize={{ base: "lg", md: "xl" }}
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
            height={{ base: "60px", md: "70px" }}
            leftIcon={<Icon as={FaUserFriends} boxSize={{ base: 5, md: 6 }} />}
            _hover={{ 
              bg: "primary",
              transform: "translateY(-2px)",
              shadow: "lg"
            }}
            transition="all 0.2s"
            fontSize={{ base: "lg", md: "xl" }}
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
            height={{ base: "60px", md: "70px" }}
            leftIcon={<Icon as={FaRobot} boxSize={{ base: 5, md: 6 }} />}
            _hover={{ 
              bg: "gray.100",
              transform: "translateY(-2px)",
              shadow: "lg"
            }}
            transition="all 0.2s"
            fontSize={{ base: "lg", md: "xl" }}
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