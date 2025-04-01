import React, { useMemo } from 'react';
import { Box, HStack, Text, Flex } from '@chakra-ui/react';
import { Piece } from '@chessire/pieces';

// Piece values for material advantage calculation
const PIECE_VALUES = {
  p: 1,  // pawn
  n: 3,  // knight
  b: 3,  // bishop
  r: 5,  // rook
  q: 9   // queen
};

// Piece mapping for the @chessire/pieces library
const PIECE_MAPPING = {
  wp: { piece: "P", color: "white" },
  wn: { piece: "N", color: "white" },
  wb: { piece: "B", color: "white" },
  wr: { piece: "R", color: "white" },
  wq: { piece: "Q", color: "white" },
  bp: { piece: "P", color: "black" },
  bn: { piece: "N", color: "black" },
  bb: { piece: "B", color: "black" },
  br: { piece: "R", color: "black" },
  bq: { piece: "Q", color: "black" }
};

/**
 * Component to display captured pieces with material advantage
 * 
 * @param {Object} props Component props
 * @param {string} props.fen - Current position FEN string
 * @param {string} props.color - Which side's captured pieces to display ('white' or 'black')
 * @param {string} props.mt - Margin top value
 */
const CapturedPieces = ({ fen, color, mt }) => {
  // Calculate captured pieces and material advantage
  const { capturedPieces, advantage } = useMemo(() => {
    if (!fen) return { capturedPieces: [], advantage: 0 };
    
    // Initial pieces in a chess game
    const initialPieces = {
      p: 8, n: 2, b: 2, r: 2, q: 1,  // lowercase for black
      P: 8, N: 2, B: 2, R: 2, Q: 1   // uppercase for white
    };
    
    // Count pieces in current position
    const currentPieces = {
      p: 0, n: 0, b: 0, r: 0, q: 0,
      P: 0, N: 0, B: 0, R: 0, Q: 0
    };
    
    // Parse FEN and count pieces
    const position = fen.split(' ')[0];
    for (const char of position) {
      if (currentPieces.hasOwnProperty(char)) {
        currentPieces[char]++;
      }
    }
    
    // Calculate captured pieces
    const whiteCaptured = []; // Black pieces captured by white
    const blackCaptured = []; // White pieces captured by black
    
    for (const piece in initialPieces) {
      const diff = initialPieces[piece] - currentPieces[piece];
      
      if (diff > 0) {
        // This piece has been captured
        const pieceType = piece.toLowerCase();
        const pieceColor = piece === piece.toLowerCase() ? 'b' : 'w';
        
        // Add to appropriate captured list
        for (let i = 0; i < diff; i++) {
          if (pieceColor === 'b') {
            whiteCaptured.push(`${pieceColor}${pieceType}`);
          } else {
            blackCaptured.push(`${pieceColor}${pieceType.toLowerCase()}`);
          }
        }
      }
    }
    
    // Calculate material advantage
    let materialDiff = 0;
    
    for (const piece in currentPieces) {
      const pieceType = piece.toLowerCase();
      const value = PIECE_VALUES[pieceType] || 0;
      
      if (piece === piece.toUpperCase()) {  // White piece
        materialDiff += value * currentPieces[piece];
      } else {  // Black piece
        materialDiff -= value * currentPieces[piece];
      }
    }
    
    return {
      capturedPieces: color === 'white' ? whiteCaptured : blackCaptured,
      advantage: materialDiff * (color === 'white' ? 1 : -1)
    };
  }, [fen, color]);
  
  // Sort pieces for better display (queens first, then rooks, etc.)
  const sortedPieces = useMemo(() => {
    return [...capturedPieces].sort((a, b) => {
      const pieceValueA = PIECE_VALUES[a[1]] || 0;
      const pieceValueB = PIECE_VALUES[b[1]] || 0;
      return pieceValueB - pieceValueA; // Descending order
    });
  }, [capturedPieces]);
  
  // Only show positive advantage for the side that has it
  const showAdvantage = advantage > 0;
  
  return (
    <Box mt={mt || 0}>
      <Flex wrap="wrap" gap={1}>
        {sortedPieces.map((piece, index) => {
          const { piece: chessPiece, color: chessColor } = PIECE_MAPPING[piece];
          return (
            <Box 
              key={`${piece}-${index}`} 
              width={{ base: "18px", md: "22px" }} 
              height={{ base: "18px", md: "22px" }}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Piece 
                piece={chessPiece}
                color={chessColor}
                width="100%"
                height="100%"
              />
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
};

export default CapturedPieces; 