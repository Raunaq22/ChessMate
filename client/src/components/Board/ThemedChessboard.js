import React from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessTheme } from '../../context/ThemeContext';

// A wrapper component that applies the current theme to any chessboard
const ThemedChessboard = (props) => {
  const { currentTheme } = useChessTheme();
  
  // Apply theme settings while preserving all other props
  return (
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
      // If the theme specifies a piece style, use it
      pieceTheme={currentTheme.pieces !== 'classic' ? currentTheme.pieces : undefined}
    />
  );
};

export default ThemedChessboard;
