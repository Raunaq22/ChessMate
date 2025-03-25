import React, { useState, useEffect } from 'react';
import { useChessTheme } from '../../context/ThemeContext';
import { Chessboard } from 'react-chessboard';
import {
  Box,
  Text,
  Button,
  Grid,
  GridItem,
  Flex,
  useToast,
  useMediaQuery
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';

// Default theme options
const DEFAULT_THEMES = {
  classic: {
    name: 'Classic',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863'
  },
  modern: {
    name: 'Modern',
    lightSquare: '#eeeed2',
    darkSquare: '#769656'
  },
  midnight: {
    name: 'Midnight',
    lightSquare: '#dee3e6',
    darkSquare: '#8ca2ad'
  },
  blue: {
    name: 'Blue',
    lightSquare: '#cdd7e9',
    darkSquare: '#5a80b0'
  },
  wood: {
    name: 'Wood',
    lightSquare: '#E4D2B4',
    darkSquare: '#9E6B55'
  },
  emerald: {
    name: 'Emerald',
    lightSquare: '#BDDFD0',
    darkSquare: '#116340'
  },
  chessmate: {
    name: 'Chessmate',
    lightSquare: '#FDF0D5',
    darkSquare: '#A77E58'
  }
};

const ThemeSettings = () => {
  const { themeKey, updateTheme, currentTheme } = useChessTheme();
  const [selectedTheme, setSelectedTheme] = useState(themeKey || 'classic');
  const toast = useToast();
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [boardSize, setBoardSize] = useState(300);

  // Load initial settings from context on mount
  useEffect(() => {
    if (themeKey) {
      setSelectedTheme(themeKey);
    }
    
    // Adjust board size based on screen width
    const handleResize = () => {
      if (window.innerWidth < 480) {
        setBoardSize(240);
      } else if (window.innerWidth < 768) {
        setBoardSize(280);
      } else {
        setBoardSize(300);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [themeKey]);

  // Handle selecting a theme
  const handleSelectTheme = (key) => {
    setSelectedTheme(key);
  };

  // Apply the theme to save it
  const applyTheme = () => {
    try {
      // Get the base theme
      const baseTheme = { ...DEFAULT_THEMES[selectedTheme] };
      
      // Save to localStorage
      localStorage.setItem('chessmate_active_theme', selectedTheme);
      localStorage.setItem('chessmate_theme_settings', JSON.stringify(baseTheme));
      
      // Update the context
      updateTheme(selectedTheme, baseTheme);
      
      toast({
        title: 'Theme Applied',
        description: 'Your selected theme has been applied to all games.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
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
      {/* Page header */}
      <Box p="20px" fontWeight="bold" fontSize="24px">Theme Settings</Box>
      
      {/* Theme selection section */}
      <Box bg="#EBF8FF" p="20px" mb="20px">
        <Text fontSize="18px" fontWeight="medium">Choose a Theme</Text>
      </Box>
      
      <Box px="20px" pb="20px">
        <Grid 
          templateColumns={{ base: "1fr", md: "1fr 1fr" }} 
          gap={{ base: 4, md: 6 }} 
          mb="30px"
        >
          {/* Theme selection */}
          <GridItem order={{ base: 2, md: 1 }}>
            <Text fontWeight="medium" mb="15px">Board Themes</Text>
            <Grid 
              templateColumns={{ 
                base: "repeat(2, 1fr)", 
                sm: "repeat(2, 1fr)", 
                md: "repeat(2, 1fr)" 
              }} 
              gap={3}
            >
              {Object.keys(DEFAULT_THEMES).map(key => (
                <Box 
                  key={key}
                  bg={selectedTheme === key ? "#899E8B" : "white"}
                  color={selectedTheme === key ? "white" : "#706C61"}
                  borderWidth="1px"
                  borderColor={selectedTheme === key ? "#899E8B" : "gray.200"}
                  borderRadius="md"
                  p="10px"
                  onClick={() => handleSelectTheme(key)}
                  cursor="pointer"
                  _hover={{ 
                    borderColor: selectedTheme === key ? "#899E8B" : "#76ABAE",
                    bg: selectedTheme === key ? "#899E8B" : "#F7FAFC"
                  }}
                >
                  <Flex align="center">
                    <Flex mr={3}>
                      <Box w="15px" h="15px" bg={DEFAULT_THEMES[key].lightSquare} borderWidth="1px" borderColor="gray.300" mr="2px" />
                      <Box w="15px" h="15px" bg={DEFAULT_THEMES[key].darkSquare} borderWidth="1px" borderColor="gray.300" />
                    </Flex>
                    <Text fontWeight="medium" fontSize={{ base: "sm", md: "md" }}>{DEFAULT_THEMES[key].name}</Text>
                    {selectedTheme === key && (
                      <CheckIcon ml="auto" color="white" />
                    )}
                  </Flex>
                </Box>
              ))}
            </Grid>
          </GridItem>
          
          {/* Preview section */}
          <GridItem order={{ base: 1, md: 2 }}>
            <Text fontWeight="medium" mb="15px">Theme Preview: {getCurrentThemeName()}</Text>
            <Box 
              borderWidth="1px" 
              borderColor="gray.200" 
              borderRadius="md" 
              p="15px" 
              bg="white"
            >
              <Flex direction="column" align="center">
                <Box 
                  w="100%" 
                  maxW={`${boardSize}px`} 
                  mx="auto" 
                  mb="15px"
                >
                  <Chessboard
                    id="themed-preview-board"
                    position="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    boardWidth={boardSize}
                    customDarkSquareStyle={{ backgroundColor: previewTheme.darkSquare }}
                    customLightSquareStyle={{ backgroundColor: previewTheme.lightSquare }}
                    boardOrientation="white"
                  />
                </Box>
                <Button 
                  bg="#3182CE" 
                  color="white"
                  _hover={{ bg: "#2B6CB0" }}
                  onClick={applyTheme}
                  width="100%"
                  height="40px"
                >
                  Apply This Theme
                </Button>
              </Flex>
            </Box>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
};

export default ThemeSettings;
