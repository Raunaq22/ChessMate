import React from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessTheme } from '../../context/ThemeContext';
import { Box } from '@chakra-ui/react';

// A wrapper component that applies the current theme to any chessboard
const ThemedChessboard = (props) => {
  const { currentTheme } = useChessTheme();
  
  return (
    <Box>
      <Chessboard
        {...props}
        customDarkSquareStyle={{ 
          backgroundColor: currentTheme.darkSquare,
          ...props.customDarkSquareStyle 
        }}
        customLightSquareStyle={{ 
          backgroundColor: currentTheme.lightSquare,
          ...props.customLightSquareStyle
        }}
      />
    </Box>
  );
};

export default ThemedChessboard;
