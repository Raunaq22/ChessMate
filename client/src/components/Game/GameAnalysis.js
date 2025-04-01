import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ThemedChessboard from '../Board/ThemedChessboard';
import CapturedPieces from './CapturedPieces';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Grid,
  GridItem,
  Badge,
  Divider,
  Progress,
  HStack,
  VStack,
  useColorModeValue,
  Tooltip,
  Spinner
} from '@chakra-ui/react';
import { FaChessBoard, FaArrowLeft, FaArrowRight, FaStepBackward, FaStepForward, FaBrain, FaChess } from 'react-icons/fa';

const GameAnalysis = ({ gameHistory, initialFen, onClose }) => {
  const [game, setGame] = useState(new Chess(initialFen || 'start'));
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [position, setPosition] = useState(initialFen || 'start');
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bestMove, setBestMove] = useState(null);
  const [arrows, setArrows] = useState([]);
  const [boardSize, setBoardSize] = useState(560);
  const [engineReady, setEngineReady] = useState(false);
  const [isOffBook, setIsOffBook] = useState(false); // Track if we're viewing a position not in the game
  const [customPosition, setCustomPosition] = useState(null); // Store custom position FEN
  const engineRef = useRef(null);
  const containerRef = useRef(null);
  
  // Colors from theme
  const bgColor = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('chess-hover', 'chess-dark');
  const textColor = useColorModeValue('chess-dark', 'white');
  const btnBgColor = useColorModeValue('primary', 'primary');
  const btnHoverColor = useColorModeValue('chess-hover', 'chess-dark');
  const evaluationBarBg = useColorModeValue('gray.200', 'gray.700');
  
  // Initialize Stockfish
  useEffect(() => {
    // Create Web Worker for Stockfish
    try {
      // The issue is with this path - we need to use the correct path to the stockfish file
      // The file is directly in the public folder, not in a subfolder
      const stockfishPath = `/stockfish/stockfish-nnue-16-single.js`;
      console.log(`Loading Stockfish from: ${stockfishPath}`);
      
      const stockfish = new Worker(stockfishPath);
      engineRef.current = stockfish;
      
      stockfish.addEventListener('message', (e) => {
        const message = e.data;
        console.log("Stockfish message:", message);
        
        if (message.includes('readyok')) {
          console.log('Stockfish engine ready');
          setEngineReady(true);
        } else if (message.includes('bestmove')) {
          const bestMove = message.split(' ')[1];
          setBestMove(bestMove);
          
          if (bestMove && bestMove.length >= 4) {
            // Create arrow for best move
            const from = bestMove.substring(0, 2);
            const to = bestMove.substring(2, 4);
            setArrows([[from, to, 'green']]);
          }
          
          setLoading(false);
        } else if (message.includes('cp ')) {
          // Parse evaluation score
          try {
            const cpMatch = message.match(/cp (-?\d+)/);
            if (cpMatch) {
              const cp = parseInt(cpMatch[1]) / 100;
              setEvaluation({ 
                score: cp, 
                mate: false,
                formatted: cp > 0 ? `+${cp.toFixed(2)}` : cp.toFixed(2) 
              });
            }
          } catch (error) {
            console.error('Error parsing evaluation:', error);
          }
        } else if (message.includes('mate ')) {
          // Parse mate score
          try {
            const mateMatch = message.match(/mate (-?\d+)/);
            if (mateMatch) {
              const mate = parseInt(mateMatch[1]);
              setEvaluation({ 
                score: mate > 0 ? 100 : -100, // Use extreme value for charting
                mate: true,
                mateIn: Math.abs(mate),
                formatted: mate > 0 ? `Mate in ${mate}` : `Mated in ${Math.abs(mate)}`
              });
            }
          } catch (error) {
            console.error('Error parsing mate score:', error);
          }
        }
      });
      
      // Initialize Stockfish
      stockfish.postMessage('uci');
      stockfish.postMessage('isready');
      stockfish.postMessage('setoption name Use NNUE value true');
      stockfish.postMessage('setoption name UCI_AnalyseMode value true');
      
      // Clean up
      return () => {
        if (engineRef.current) {
          engineRef.current.postMessage('quit');
          engineRef.current.terminate();
        }
      };
    } catch (error) {
      console.error("Error initializing Stockfish:", error);
      setEngineReady(false);
    }
  }, []);
  
  // Handle responsive board sizing
  useEffect(() => {
    const calculateBoardSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Set a bit smaller than container to leave room for controls
        setBoardSize(Math.min(containerWidth - 32, 560));
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
    
    // Legacy resize handler (as a backup)
    const handleResize = () => {
      calculateBoardSize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);
  
  // Set position when current move index changes or when exploring off-book moves
  useEffect(() => {
    let newGame;
    
    if (isOffBook && customPosition) {
      // Use the custom position if we're off-book
      newGame = new Chess(customPosition);
      setGame(newGame);
      setPosition(customPosition);
    } else {
      // Otherwise, use the game history
      newGame = new Chess(initialFen || 'start');
      
      if (currentMoveIndex >= 0 && gameHistory && gameHistory.length > 0) {
        // Apply moves up to the current index
        for (let i = 0; i <= currentMoveIndex && i < gameHistory.length; i++) {
          try {
            if (gameHistory[i]?.notation) {
              newGame.move(gameHistory[i].notation);
            }
          } catch (error) {
            console.error('Invalid move:', gameHistory[i], error);
          }
        }
      }
      
      setGame(newGame);
      setPosition(newGame.fen());
    }
    
    // Analyze position with Stockfish (regardless of whether it's from game or custom)
    if (engineReady && engineRef.current) {
      setLoading(true);
      engineRef.current.postMessage('stop'); // Stop any previous analysis
      engineRef.current.postMessage(`position fen ${newGame.fen()}`);
      engineRef.current.postMessage('go depth 18'); // Adjust depth based on performance needs
    }
  }, [currentMoveIndex, gameHistory, initialFen, engineReady, isOffBook, customPosition]);
  
  // Handle making a move on the board
  const onDrop = (sourceSquare, targetSquare) => {
    try {
      const tempGame = new Chess(position);
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Default to queen promotion
      });
      
      if (move) {
        // If move is legal, set to off-book mode and update custom position
        setIsOffBook(true);
        setCustomPosition(tempGame.fen());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Invalid move attempt:', error);
      return false;
    }
  };
  
  // Return to game mode from off-book mode
  const returnToGamePosition = (moveIdx) => {
    setIsOffBook(false);
    setCustomPosition(null);
    setCurrentMoveIndex(moveIdx);
  };
  
  const handlePreviousMove = () => {
    if (isOffBook) {
      // If we're off-book, return to the last position from the game
      returnToGamePosition(currentMoveIndex);
    } else if (currentMoveIndex > -1) {
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };
  
  const handleNextMove = () => {
    if (isOffBook) {
      // If we're off-book, do nothing (or could implement a move history for exploration)
      return;
    }
    
    if (gameHistory && currentMoveIndex < gameHistory.length - 1) {
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };
  
  const handleFirstMove = () => {
    setIsOffBook(false);
    setCustomPosition(null);
    setCurrentMoveIndex(-1);
  };
  
  const handleLastMove = () => {
    if (gameHistory) {
      setIsOffBook(false);
      setCustomPosition(null);
      setCurrentMoveIndex(gameHistory.length - 1);
    }
  };
  
  // Format evaluation bar height
  const getEvaluationBarHeight = () => {
    if (!evaluation) return '50%'; // Neutral
    
    const scoreValue = evaluation.score;
    // Clamp between -5 and 5 for display purposes
    const clampedScore = Math.max(-5, Math.min(5, scoreValue));
    // Convert to percentage (0-100%), with 50% being neutral
    const percentage = 50 - (clampedScore * 10); // Each pawn worth is 10%
    return `${percentage}%`;
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="6xl" isCentered>
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent 
        bg={bgColor} 
        borderRadius="lg" 
        shadow="xl" 
        maxH={{ base: "85vh", md: "90vh" }} 
        h={{ base: "auto", md: "90vh" }} 
        my={2} 
        mx={2}
        display="flex"
        flexDirection="column"
      >
        <ModalHeader 
          bg={headerBg} 
          color="white" 
          borderTopRadius="lg" 
          display="flex" 
          alignItems="center"
          py={{ base: 2, md: 4 }}
          px={{ base: 3, md: 6 }}
        >
          <Box mr={2}><FaChess /></Box>
          <Heading size={{ base: "md", md: "lg" }}>Game Analysis</Heading>
          {isOffBook && (
            <Badge ml={3} colorScheme="yellow" fontSize="sm">Exploring Variations</Badge>
          )}
        </ModalHeader>
        <ModalCloseButton color="white" />
        
        <ModalBody 
          p={{ base: 2, md: 4 }} 
          overflow="auto" 
          flex="1"
          display="flex"
          flexDirection="column"
        >
          <Grid 
            templateColumns={{ base: "1fr", md: "80px 1fr 300px" }} 
            templateRows={{ base: "60px 1fr auto", md: "1fr" }} 
            gap={{ base: 2, md: 4 }} 
            h="100%"
          >
            {/* Evaluation bar */}
            <GridItem display="block" order={{ base: 1, md: 1 }} width={{ base: "100%", md: "auto" }} height={{ base: "50px", md: "100%" }}>
              <Box 
                position="relative" 
                h={{ base: "40px", md: "100%" }} 
                w={{ base: "100%", md: "40px" }} 
                mx="auto" 
                bg={evaluationBarBg} 
                borderRadius="md" 
                overflow="hidden"
              >
                <Box 
                  position="absolute" 
                  bottom={{ base: 0, md: 0 }}
                  left={0}
                  right={{ base: "auto", md: 0 }}
                  top={{ base: 0, md: "auto" }}
                  bg="black" 
                  transition="all 0.3s"
                  height={{ md: getEvaluationBarHeight() }}
                  width={{ base: `${100 - (parseFloat(getEvaluationBarHeight()) || 50)}%`, md: "100%" }}
                />
                <Flex position="absolute" inset="0" align="center" justify="center">
                  <Badge 
                    fontSize="sm" 
                    variant="solid" 
                    colorScheme={evaluation?.score > 0 ? "green" : evaluation?.score < 0 ? "red" : "gray"}
                    py={1}
                    px={2}
                    fontFamily="mono"
                  >
                    {evaluation?.formatted || '0.00'}
                  </Badge>
                </Flex>
              </Box>
            </GridItem>
            
            {/* Chessboard with analysis */}
            <GridItem ref={containerRef} order={{ base: 2, md: 2 }} minH={0}>
              <Box 
                bg={isOffBook ? "yellow.50" : "transparent"} 
                p={{ base: 1, md: 3 }}
                borderRadius="md"
                borderWidth={isOffBook ? "1px" : "0"}
                borderColor="yellow.300"
                display="flex"
                flexDir="column"
                justifyContent="center"
                alignItems="center"
                maxHeight={{ base: "calc(50vh - 70px)", md: "none" }}
              >
                <ThemedChessboard
                  position={position}
                  boardWidth={boardSize}
                  customArrows={arrows}
                  areArrowsAllowed={false}
                  showBoardNotation={true}
                  onPieceDrop={onDrop}
                  customBoardStyle={{
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    borderRadius: "4px",
                    opacity: isOffBook ? '0.95' : '1',
                  }}
                />
                
                <Flex justifyContent="space-between" mt={3} width="100%">
                  <CapturedPieces 
                    fen={position} 
                    color="white" 
                    mt={1}
                  />
                  <CapturedPieces 
                    fen={position} 
                    color="black" 
                    mt={1}
                  />
                </Flex>
                
                {isOffBook && (
                  <Button
                    onClick={() => returnToGamePosition(currentMoveIndex)}
                    mt={4}
                    colorScheme="blue"
                    leftIcon={<FaChessBoard />}
                    size={{ base: "sm", md: "md" }}
                  >
                    Return to Game Position
                  </Button>
                )}
                
                {loading && (
                  <Flex 
                    position="absolute" 
                    top="50%" 
                    left="50%" 
                    transform="translate(-50%, -50%)" 
                    bg="blackAlpha.700" 
                    color="white" 
                    p={3} 
                    borderRadius="md"
                    alignItems="center"
                  >
                    <Spinner size="sm" mr={2} />
                    <Text>Analyzing position...</Text>
                  </Flex>
                )}
              </Box>
            </GridItem>
            
            {/* Move history */}
            <GridItem 
              order={{ base: 3, md: 3 }} 
              maxH={{ base: "150px", md: "none" }}
              overflow="auto"
              display="flex"
              flexDirection="column"
            >
              <Box 
                bg="chess-light" 
                p={{ base: 2, md: 4 }} 
                borderRadius="md" 
                boxShadow="sm" 
                h="100%" 
                display="flex"
                flexDirection="column"
              >
                <Heading size="md" mb={{ base: 1, md: 3 }} color="#ffffff">Move History</Heading>
                <Divider mb={{ base: 1, md: 3 }} />
                
                <Box overflowY="auto" flex="1" mb={2} px={1}>
                  <Grid templateColumns="max-content 1fr 1fr" gap={1} fontSize="sm">
                    {gameHistory.map((move, idx) => {
                      const moveNumber = Math.floor(idx / 2) + 1;
                      const isWhiteMove = idx % 2 === 0;
                      const isCurrentMove = !isOffBook && currentMoveIndex === idx;
                      
                      return (
                        <React.Fragment key={idx}>
                          {isWhiteMove && (
                            <Text color="gray.500" fontWeight="medium">{moveNumber}.</Text>
                          )}
                          <Button
                            variant={isCurrentMove ? "solid" : "ghost"}
                            size="xs"
                            bg={isCurrentMove ? "primary" : "transparent"}
                            color={isCurrentMove ? "white" : "#ffffff"}
                            _hover={{ bg: isCurrentMove ? "primary" : "gray.100" }}
                            onClick={() => returnToGamePosition(idx)}
                            h="auto"
                            py={1}
                            fontFamily="mono"
                            justifyContent="flex-start"
                          >
                            {move.notation}
                          </Button>
                          {!isWhiteMove && idx === gameHistory.length - 1 && <Box />}
                        </React.Fragment>
                      );
                    })}
                  </Grid>
                </Box>
                
                {bestMove && (
                  <Box mt="auto" p={2} bg="blue.50" borderRadius="md">
                    <Flex alignItems="center" mb={1}>
                      <Box as={FaBrain} color="blue.500" mr={2} />
                      <Text fontWeight="medium" color="blue.700" fontSize={{ base: "xs", md: "sm" }}>Engine Suggestion</Text>
                    </Flex>
                    <Text fontSize={{ base: "xs", md: "sm" }} color="gray.700">
                      Best move: <Badge colorScheme="green">{bestMove}</Badge>
                      {evaluation && (
                        <Text as="span" ml={2}>
                          ({evaluation.formatted})
                        </Text>
                      )}
                    </Text>
                    {evaluation && (
                      <Flex mt={1} alignItems="center">
                        <Badge 
                          colorScheme={
                            evaluation.score > 0.2 ? "yellow" : 
                            evaluation.score < -0.2 ? "blackAlpha" : 
                            "gray"
                          }
                          mr={2}
                          fontSize="2xs"
                        >
                          {evaluation.score > 0.2 ? "White" : 
                           evaluation.score < -0.2 ? "Black" : 
                           "Equal"}
                        </Badge>
                        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.700">
                          {evaluation.score > 0.2 ? "has advantage" : 
                           evaluation.score < -0.2 ? "has advantage" : 
                           "position"}
                          {evaluation.mate && ` - ${evaluation.formatted}`}
                        </Text>
                      </Flex>
                    )}
                  </Box>
                )}
              </Box>
            </GridItem>
          </Grid>
        </ModalBody>
        
        <ModalFooter 
          bg="gray.100" 
          borderBottomRadius="lg"
          py={{ base: 2, md: 3 }}
          px={{ base: 2, md: 4 }}
          position="sticky"
          bottom={0}
          minH={{ base: "60px", md: "auto" }}
          mt="auto"
        >
          <HStack spacing={{ base: 1, md: 3 }} justify="center" width="100%">
            <Tooltip label="First Move">
              <IconButton
                icon={<FaStepBackward />}
                onClick={handleFirstMove}
                colorScheme="gray"
                isDisabled={!isOffBook && currentMoveIndex === -1}
                aria-label="First move"
                size={{ base: "sm", md: "md" }}
              />
            </Tooltip>
            <Tooltip label="Previous Move">
              <IconButton
                icon={<FaArrowLeft />}
                onClick={handlePreviousMove}
                colorScheme="gray" 
                isDisabled={!isOffBook && currentMoveIndex === -1}
                aria-label="Previous move"
                size={{ base: "sm", md: "md" }}
              />
            </Tooltip>
            <Tooltip label="Next Move">
              <IconButton
                icon={<FaArrowRight />}
                onClick={handleNextMove}
                colorScheme="gray"
                isDisabled={isOffBook || currentMoveIndex === gameHistory.length - 1}
                aria-label="Next move"
                size={{ base: "sm", md: "md" }}
              />
            </Tooltip>
            <Tooltip label="Last Move">
              <IconButton
                icon={<FaStepForward />}
                onClick={handleLastMove}
                colorScheme="gray"
                isDisabled={isOffBook || currentMoveIndex === gameHistory.length - 1}
                aria-label="Last move"
                size={{ base: "sm", md: "md" }}
              />
            </Tooltip>
          </HStack>
          
          {!engineReady && (
            <Box mt={3} textAlign="center" w="100%">
              <Badge colorScheme="red" p={2}>
                Stockfish engine failed to load. Please check console for errors.
              </Badge>
            </Box>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GameAnalysis;