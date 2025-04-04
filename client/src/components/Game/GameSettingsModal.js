import React, { useState, memo, useCallback, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Grid,
  SimpleGrid,
  Box,
  Text,
  Divider,
  Flex,
  Icon,
  useColorModeValue,
  Radio,
  RadioGroup,
  Stack
} from '@chakra-ui/react';
import { FaClock, FaRobot, FaChess, FaUser } from 'react-icons/fa';

// Shared time control options for both regular and computer games
const timeControls = [
  { id: 'bullet1', name: 'Bullet', time: 60, increment: 0, label: '1+0' },
  { id: 'bullet2', name: 'Bullet', time: 120, increment: 1, label: '2+1' },
  { id: 'blitz5', name: 'Blitz', time: 300, increment: 0, label: '5+0' },
  { id: 'blitz3', name: 'Blitz', time: 180, increment: 2, label: '3+2' },
  { id: 'rapid10', name: 'Rapid', time: 600, increment: 0, label: '10+0' },
  { id: 'rapid10inc5', name: 'Rapid', time: 600, increment: 5, label: '10+5' },
  { id: 'rapid15', name: 'Rapid', time: 900, increment: 10, label: '15+10' },
  { id: 'unlimited', name: 'Unlimited', time: "unlimited", increment: 0, label: 'Unlimited' }
];

// Computer difficulty levels
const difficultyLevels = [
  { id: 'very_easy', name: 'Very Easy', description: 'Absolute beginner level' },
  { id: 'easy', name: 'Easy', description: 'For beginners' },
  { id: 'medium', name: 'Medium', description: 'For casual players' },
  { id: 'hard', name: 'Hard', description: 'For advanced players' },
  { id: 'very_hard', name: 'Very Hard', description: 'Experienced player level' }
];

// Memoized option components for better performance
const TimeOption = memo(({ control, isSelected, onClick, bgHover, selectedBg, selectedColor, borderColor }) => (
  <Box
    p={3}
    borderRadius="md"
    cursor="pointer"
    borderWidth="1px"
    borderColor={isSelected ? selectedBg : borderColor}
    bg={isSelected ? selectedBg : 'transparent'}
    color={isSelected ? selectedColor : '#ffffff'}
    onClick={onClick}
    sx={{
      transition: 'background 0.1s ease, transform 0.1s ease',
      willChange: 'transform',
      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      '&:hover': {
        bg: !isSelected ? bgHover : undefined,
        transform: 'scale(1.02)',
        color: 'primary'
      }
    }}
  >
    <Text fontWeight="bold">{control.name}</Text>
    <Text fontSize="xs" opacity={0.8}>{control.label}</Text>
  </Box>
));

const DifficultyOption = memo(({ level, isSelected, onClick, bgHover, selectedBg, selectedColor, borderColor }) => (
  <Box
    p={3}
    borderRadius="md"
    cursor="pointer"
    borderWidth="1px"
    borderColor={isSelected ? selectedBg : borderColor}
    bg={isSelected ? selectedBg : 'transparent'}
    color={isSelected ? selectedColor : '#ffffff'}
    onClick={onClick}
    sx={{
      transition: 'background 0.1s ease, transform 0.1s ease',
      willChange: 'transform',
      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      '&:hover': {
        bg: !isSelected ? bgHover : undefined,
        transform: 'scale(1.02)',
        color: 'primary'
      }
    }}
  >
    <Text fontWeight="bold">{level.name}</Text>
    <Text fontSize="xs" opacity={0.8}>{level.description}</Text>
  </Box>
));

const ColorOption = memo(({ color, label, description, isSelected, onClick, bgHover, selectedBg, selectedColor, borderColor }) => (
  <Box
    p={3}
    borderRadius="md"
    cursor="pointer"
    borderWidth="1px"
    borderColor={isSelected ? selectedBg : borderColor}
    bg={isSelected ? selectedBg : 'transparent'}
    color={isSelected ? selectedColor : '#ffffff'}
    onClick={onClick}
    sx={{
      transition: 'background 0.1s ease, transform 0.1s ease',
      willChange: 'transform',
      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      '&:hover': {
        bg: !isSelected ? bgHover : undefined,
        transform: 'scale(1.02)',
        color: 'primary'
      }
    }}
  >
    <Text fontWeight="bold">{label}</Text>
    <Text fontSize="xs" opacity={0.8}>{description}</Text>
  </Box>
));

const GameSettingsModal = ({
  isOpen,
  onClose,
  onCreateGame,
  onStartGame,
  modalType = 'create', // 'create' or 'computer'
  title = modalType === 'create' ? 'Create New Game' : 'Play Against Computer'
}) => {
  // Find the 10+0 option as default for computer games, 10+5 for regular games
  const defaultTimeIndex = modalType === 'computer' 
    ? timeControls.findIndex(control => control.id === 'rapid10')
    : timeControls.findIndex(control => control.id === 'rapid10inc5');
  const [selectedTime, setSelectedTime] = useState(
    timeControls[defaultTimeIndex !== -1 ? defaultTimeIndex : 0]
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficultyLevels[2]); // Default to medium
  const [playerColor, setPlayerColor] = useState('white');

  const bgHover = useColorModeValue('gray.100', 'gray.700');
  const selectedBg = useColorModeValue('chess-hover', 'blue.700');
  const selectedColor = useColorModeValue('white', 'white');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Filter time controls based on modal type
  const availableTimeControls = useMemo(() => {
    if (modalType === 'computer') {
      // For computer games, only show options without increment
      return timeControls.filter(control => control.increment === 0);
    }
    return timeControls;
  }, [modalType]);

  // Memoized handlers for better performance
  const handleSelectTime = useCallback((timeControl) => {
    setSelectedTime(timeControl);
  }, []);

  const handleSelectDifficulty = useCallback((difficulty) => {
    setSelectedDifficulty(difficulty);
  }, []);

  const handleSelectColor = useCallback((color) => {
    setPlayerColor(color);
  }, []);

  const handleAction = useCallback(() => {
    if (modalType === 'create') {
      onCreateGame(selectedTime);
    } else {
      onStartGame({
        timeControl: selectedTime,
        difficulty: selectedDifficulty.id,
        playerColor: playerColor
      });
    }
    onClose();
  }, [modalType, onCreateGame, onStartGame, selectedTime, selectedDifficulty, playerColor, onClose]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="xl" 
      isCentered
      motionPreset="scale" // Change to a simpler animation
    >
      <ModalOverlay 
        bg="blackAlpha.700"
        backdropFilter="blur(2px)" // Reduced blur for better performance
      />
      <ModalContent 
        bg="chess-light" 
        borderRadius="lg"
        sx={{
          willChange: 'transform',
          transform: 'translateZ(0)', // Force GPU acceleration
          transition: 'all 150ms ease-in-out' // Faster transition
        }}
      >
        <ModalHeader color="#ffffff">{title}</ModalHeader>
        <ModalCloseButton color="chess-dark" />
        <ModalBody pb={6}>
          {/* Computer game specific settings */}
          {modalType === 'computer' && (
            <>
              <Box mb={6}>
                <Flex align="center" mb={3}>
                  <Icon as={FaRobot} mr={2} color="primary" />
                  <Text fontWeight="bold" color="#ffffff">Difficulty</Text>
                </Flex>
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                  {difficultyLevels.map(level => (
                    <DifficultyOption
                      key={level.id}
                      level={level}
                      isSelected={selectedDifficulty.id === level.id}
                      onClick={() => handleSelectDifficulty(level)}
                      bgHover={bgHover}
                      selectedBg={selectedBg}
                      selectedColor={selectedColor}
                      borderColor={borderColor}
                    />
                  ))}
                </SimpleGrid>
              </Box>

              <Box mb={6}>
                <Flex align="center" mb={3}>
                  <Icon as={FaChess} mr={2} color="primary" />
                  <Text fontWeight="bold" color="#ffffff">Your Color</Text>
                </Flex>
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <ColorOption
                    color="white"
                    label="White"
                    description="Play first"
                    isSelected={playerColor === 'white'}
                    onClick={() => handleSelectColor('white')}
                    bgHover={bgHover}
                    selectedBg={selectedBg}
                    selectedColor={selectedColor}
                    borderColor={borderColor}
                  />
                  <ColorOption
                    color="black"
                    label="Black"
                    description="Computer plays first"
                    isSelected={playerColor === 'black'}
                    onClick={() => handleSelectColor('black')}
                    bgHover={bgHover}
                    selectedBg={selectedBg}
                    selectedColor={selectedColor}
                    borderColor={borderColor}
                  />
                </Grid>
              </Box>
              <Divider my={4} />
            </>
          )}

          {/* Time control settings for both modes */}
          <Box>
            <Flex align="center" mb={3}>
              <Icon as={FaClock} mr={2} color="primary" />
              <Text fontWeight="bold" color="#ffffff">Time Control</Text>
            </Flex>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
              {availableTimeControls.map(control => (
                <TimeOption
                  key={control.id}
                  control={control}
                  isSelected={selectedTime.id === control.id}
                  onClick={() => handleSelectTime(control)}
                  bgHover={bgHover}
                  selectedBg={selectedBg}
                  selectedColor={selectedColor}
                  borderColor={borderColor}
                />
              ))}
            </SimpleGrid>
          </Box>
        </ModalBody>

        <ModalFooter bg="gray.50" borderBottomRadius="lg">
          <Button 
            variant="ghost" 
            mr={3} 
            onClick={onClose} 
            color="chess-dark"
          >
            Cancel
          </Button>
          <Button
            bg="primary"
            color="white"
            _hover={{ bg: "chess-hover" }}
            onClick={handleAction}
          >
            {modalType === 'create' ? 'Create Game' : 'Start Game'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default memo(GameSettingsModal); 