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
// Import Chess.js for chess logic
import { Chess } from 'chess.js';

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
  // Add state for chess position and game
  const [position, setPosition] = useState('start');
  const [game, setGame] = useState(new Chess());
  
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

  // Handle piece movement
  const onDrop = (sourceSquare, targetSquare, pieceParameter) => {
    try {
      // Get the piece at the source square
      const piece = game.get(sourceSquare);
      if (!piece) return false;
      
      // Check if we're trying to capture our own piece
      const targetPiece = game.get(targetSquare);
      if (targetPiece && targetPiece.color === piece.color) {
        return false; // Can't capture own pieces
      }
      
      // Check if this is a pawn promotion move
      const isPawnPromotion = 
        (piece.type === 'p' && piece.color === 'w' && targetSquare[1] === '8') || 
        (piece.type === 'p' && piece.color === 'b' && targetSquare[1] === '1');
      
      // Try to make the move using chess.js built-in validation
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPawnPromotion ? null : undefined, // Let the promotion dialog show when needed
      });
      
      // If the move is invalid, return false
      if (!move) return false;
      
      // Update the board
      setPosition(game.fen());
      return true;
    } catch (error) {
      console.error('Error making move:', error);
      return false;
    }
  };

  // Handle promotion piece selection
  const handlePromotionPieceSelect = (piece, fromSquare, toSquare) => {
    try {
      // Get just the piece type (q, r, n, b) from the full piece name (wQ, bR, etc.)
      const pieceType = piece.charAt(1).toLowerCase();
      
      // Execute the move with the selected promotion piece
      const move = game.move({
        from: fromSquare,
        to: toSquare,
        promotion: pieceType
      });
      
      if (!move) return false;
      
      // Update the board position
      setPosition(game.fen());
      return true;
    } catch (error) {
      console.error('Error during promotion:', error);
      return false;
    }
  };

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
              position={position}
              onPieceDrop={onDrop}
              onPromotionPieceSelect={handlePromotionPieceSelect}
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