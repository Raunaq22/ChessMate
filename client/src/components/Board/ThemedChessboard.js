import React, { forwardRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessTheme } from '../../context/ThemeContext';
import { Box, useBreakpointValue } from '@chakra-ui/react';

// A wrapper component that applies the current theme to any chessboard
const ThemedChessboard = forwardRef((props, ref) => {
  const { currentTheme } = useChessTheme();
  
  // For mobile screens, we need a fixed numeric value to maintain aspect ratio
  const defaultBoardWidth = useBreakpointValue({ 
    base: Math.min(props.boardWidth || 400, window.innerWidth - 32),
    sm: props.boardWidth || 400 
  });
  
  // Default premove styles
  const premoveDarkSquareStyle = { 
    backgroundColor: '#A42323',
    ...props.customPremoveDarkSquareStyle
  };
  
  const premoveLightSquareStyle = { 
    backgroundColor: '#BD2828',
    ...props.customPremoveLightSquareStyle
  };
  
  // Create a handler for promotion that enables full piece selection
  const handleOnPromotionPieceSelect = (piece, fromSquare, toSquare) => {
    // If component has its own handler, use that
    if (props.onPromotionPieceSelect) {
      return props.onPromotionPieceSelect(piece, fromSquare, toSquare);
    }
    
    // Default behavior: always return true to accept the selected piece
    return true;
  };
  
  return (
    <Box 
      width="100%" 
      maxWidth={props.boardWidth || "100%"}
      mx="auto"
      aspectRatio="1/1"
      position="relative"
      pb="32px"
    >
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Chessboard
          {...props}
          ref={ref}
          boardWidth={defaultBoardWidth}
          customDarkSquareStyle={{ 
            backgroundColor: currentTheme.darkSquare,
            ...props.customDarkSquareStyle 
          }}
          customLightSquareStyle={{ 
            backgroundColor: currentTheme.lightSquare,
            ...props.customLightSquareStyle
          }}
          customPremoveDarkSquareStyle={premoveDarkSquareStyle}
          customPremoveLightSquareStyle={premoveLightSquareStyle}
          arePremovesAllowed={props.arePremovesAllowed || false}
          autoPromoteToQueen={false}
          promotionDialogVariant={props.promotionDialogVariant || "default"}
          onPromotionPieceSelect={handleOnPromotionPieceSelect}
          customBoardStyle={{
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            ...props.customBoardStyle
          }}
          customPromotionPieceStyle={{
            borderRadius: "50%",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            cursor: "pointer",
            ...props.customPromotionPieceStyle
          }}
        />
      </Box>
    </Box>
  );
});

export default ThemedChessboard;
