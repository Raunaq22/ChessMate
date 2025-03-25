import React, { useState, useEffect } from 'react';
import { useChessTheme } from '../../context/ThemeContext';
import { Chessboard } from 'react-chessboard';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  useColorModeValue,
  Alert,
  AlertIcon,
  Grid,
  GridItem,
  Flex,
  Radio,
  RadioGroup,
  Stack,
  useToast
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';

// Default theme options
const DEFAULT_THEMES = {
  classic: {
    name: 'Classic',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    pieces: 'classic'
  },
  modern: {
    name: 'Modern',
    lightSquare: '#eeeed2',
    darkSquare: '#769656',
    pieces: 'modern'
  },
  midnight: {
    name: 'Midnight',
    lightSquare: '#dee3e6',
    darkSquare: '#8ca2ad',
    pieces: 'classic'
  },
  blue: {
    name: 'Blue',
    lightSquare: '#cdd7e9',
    darkSquare: '#5a80b0',
    pieces: 'classic'
  },
  wood: {
    name: 'Wood',
    lightSquare: '#E4D2B4',
    darkSquare: '#9E6B55',
    pieces: 'classic'
  },
  emerald: {
    name: 'Emerald',
    lightSquare: '#BDDFD0',
    darkSquare: '#116340',
    pieces: 'classic'
  },
  chessmate: {
    name: 'Chessmate',
    lightSquare: '#FDF0D5',
    darkSquare: '#A77E58',
    pieces: 'classic'
  }
};

// Mapping between our internal piece names and react-chessboard's pieceTheme values
const PIECE_STYLE_MAP = {
  'classic': 'default',
  'modern': 'cburnett',
  'fantasy': 'fantasy',
  '8-bit': 'pixel'
};

// The piece styles we offer in the UI
const PIECE_STYLES = [
  { id: 'default', name: 'Classic' },
  { id: 'cburnett', name: 'Modern' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'pixel', name: '8-bit' }
];

// Convert from react-chessboard style name to our internal name
const mapPieceThemeToInternal = (pieceTheme) => {
  switch(pieceTheme) {
    case 'default': return 'classic';
    case 'cburnett': return 'modern';
    case 'pixel': return '8-bit';
    default: return pieceTheme;
  }
};

// Convert from our internal name to react-chessboard style name
const mapInternalToPieceTheme = (internalStyle) => {
  return PIECE_STYLE_MAP[internalStyle] || 'default';
};

const ThemeSettings = () => {
  const { themeKey, updateTheme, currentTheme } = useChessTheme();
  const [selectedTheme, setSelectedTheme] = useState(themeKey || 'classic');
  const [selectedPieceStyle, setSelectedPieceStyle] = useState('default');
  const [message, setMessage] = useState({ type: '', text: '' });
  const toast = useToast();

  // Chakra UI theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardHeaderBg = useColorModeValue('blue.50', 'blue.900');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const labelColor = useColorModeValue('gray.700', 'white');
  const themeCardBg = useColorModeValue('gray.50', 'gray.700');
  const activeThemeBg = useColorModeValue('blue.50', 'blue.800');
  const activeThemeBorder = useColorModeValue('blue.500', 'blue.300');

  // Load initial settings from context on mount
  useEffect(() => {
    if (themeKey) {
      setSelectedTheme(themeKey);

      // Set the appropriate piece style based on current theme
      const theme = DEFAULT_THEMES[themeKey];
      if (theme && theme.pieces) {
        const pieceTheme = mapInternalToPieceTheme(theme.pieces);
        setSelectedPieceStyle(pieceTheme);
      }
    }
  }, [themeKey, currentTheme]);

  // Handle selecting a theme
  const handleSelectTheme = (key) => {
    setSelectedTheme(key);
    
    // Update piece style based on the selected theme
    const theme = DEFAULT_THEMES[key];
    if (theme && theme.pieces) {
      const pieceTheme = mapInternalToPieceTheme(theme.pieces);
      setSelectedPieceStyle(pieceTheme);
    }
  };

  // Handle changing piece style
  const handlePieceStyleChange = (pieceTheme) => {
    setSelectedPieceStyle(pieceTheme);
  };

  // Apply the theme to save it
  const applyTheme = () => {
    try {
      // Get the base theme
      const baseTheme = { ...DEFAULT_THEMES[selectedTheme] };
      
      // Update the piece style with internal name
      const internalPieceStyle = mapPieceThemeToInternal(selectedPieceStyle);
      baseTheme.pieces = internalPieceStyle;
      
      // Save to localStorage for the context to pick up
      localStorage.setItem('chessmate_active_theme', selectedTheme);
      localStorage.setItem('chessmate_theme_settings', JSON.stringify(baseTheme));
      
      // Update the context
      updateTheme(selectedTheme);
      
      toast({
        title: 'Theme Applied',
        description: 'Your selected theme has been applied to all games.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setMessage({
        type: 'success',
        text: 'Theme applied successfully!'
      });
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error("Error applying theme:", error);
      toast({
        title: 'Error',
        description: 'Could not apply theme. See console for details.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Get the current preview theme
  const getCurrentPreviewTheme = () => {
    const baseTheme = DEFAULT_THEMES[selectedTheme] || DEFAULT_THEMES.classic;
    return baseTheme;
  };

  // Get the current theme's name
  const getCurrentThemeName = () => {
    return DEFAULT_THEMES[selectedTheme]?.name || 'Classic';
  };

  // Current theme for the preview
  const previewTheme = getCurrentPreviewTheme();

  return (
    <Box>
      <Heading size="lg" mb={6}>Theme Settings</Heading>
      
      {message.text && (
        <Alert status={message.type} mb={4} borderRadius="md">
          <AlertIcon />
          {message.text}
        </Alert>
      )}
      
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
        {/* Preview section */}
        <GridItem>
          <Card bg={bgColor} boxShadow="md" mb={6} variant="outline">
            <CardHeader bg={cardHeaderBg} py={4}>
              <Heading size="md">Theme Preview: {getCurrentThemeName()}</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Box w="100%" maxW="350px" mx="auto">
                  <Chessboard
                    id="themed-preview-board"
                    position="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    boardWidth={350}
                    customDarkSquareStyle={{ backgroundColor: previewTheme.darkSquare }}
                    customLightSquareStyle={{ backgroundColor: previewTheme.lightSquare }}
                    pieceTheme={selectedPieceStyle}
                    boardOrientation="white"
                  />
                </Box>
                <Button 
                  colorScheme="blue" 
                  w="full" 
                  onClick={applyTheme}
                  mt={4}
                >
                  Apply This Theme
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
        
        {/* Theme selection section */}
        <GridItem>
          <Card bg={bgColor} boxShadow="md" mb={6} variant="outline">
            <CardHeader bg={cardHeaderBg} py={4}>
              <Heading size="md">Choose a Theme</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Text fontWeight="medium" mb={1}>Board Themes</Text>
                <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={3}>
                  {Object.keys(DEFAULT_THEMES).map(key => (
                    <Card 
                      key={key}
                      bg={selectedTheme === key ? activeThemeBg : themeCardBg}
                      borderWidth={1}
                      borderColor={selectedTheme === key ? activeThemeBorder : 'gray.200'}
                      onClick={() => handleSelectTheme(key)}
                      cursor="pointer"
                      overflow="hidden"
                      _hover={{ borderColor: 'blue.300' }}
                    >
                      <CardBody p={3}>
                        <HStack>
                          <Flex gap={1}>
                            <Box w="15px" h="15px" bg={DEFAULT_THEMES[key].lightSquare} borderWidth={1} borderColor="gray.300" />
                            <Box w="15px" h="15px" bg={DEFAULT_THEMES[key].darkSquare} borderWidth={1} borderColor="gray.300" />
                          </Flex>
                          <Text fontWeight="medium">{DEFAULT_THEMES[key].name}</Text>
                          {selectedTheme === key && (
                            <CheckIcon ml="auto" color="blue.500" />
                          )}
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </Grid>
                
                <Divider my={3} />
                
                {/* Piece style selector */}
                <Text fontWeight="medium" mb={1}>Piece Style</Text>
                <RadioGroup 
                  value={selectedPieceStyle} 
                  onChange={handlePieceStyleChange}
                  mb={4}
                >
                  <Stack direction="row" wrap="wrap" spacing={4}>
                    {PIECE_STYLES.map(style => (
                      <Radio key={style.id} value={style.id} colorScheme="blue">
                        {style.name}
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default ThemeSettings;
