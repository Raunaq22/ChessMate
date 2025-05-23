import React, { useMemo } from 'react';
import { Box, HStack, Text, Flex } from '@chakra-ui/react';

// Piece values for material advantage calculation
const PIECE_VALUES = {
  p: 1,  // pawn
  n: 3,  // knight
  b: 3,  // bishop
  r: 5,  // rook
  q: 9   // queen
};

// SVG pieces for rendering
const ChessPieces = {
  wp: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <path d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  wn: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/>
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/>
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000"/>
      </g>
    </svg>
  ),
  wb: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#fff" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" strokeLinejoin="miter"/>
      </g>
    </svg>
  ),
  wr: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt"/>
        <path d="M34 14l-3 3H14l-3-3"/>
        <path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter"/>
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
        <path d="M11 14h23" fill="none" strokeLinejoin="miter"/>
      </g>
    </svg>
  ),
  wq: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12a2 2 0 1 1 4 0 2 2 0 1 1-4 0zm16.5-4.5a2 2 0 1 1 4 0 2 2 0 1 1-4 0zM41 12a2 2 0 1 1 4 0 2 2 0 1 1-4 0zM16 8.5a2 2 0 1 1 4 0 2 2 0 1 1-4 0zM33 9a2 2 0 1 1 4 0 2 2 0 1 1-4 0z"/>
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" strokeLinecap="butt"/>
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt"/>
        <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/>
      </g>
    </svg>
  ),
  bp: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <path d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  bn: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000"/>
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#000"/>
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#fff" stroke="#fff"/>
        <path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#fff" stroke="none"/>
      </g>
    </svg>
  ),
  bb: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#000" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" strokeLinejoin="miter" stroke="#fff"/>
      </g>
    </svg>
  ),
  br: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <g fill="#000" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z" strokeLinecap="butt"/>
        <path d="M14 29.5v-13h17v13H14z" strokeLinecap="butt" strokeLinejoin="miter"/>
        <path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" strokeLinecap="butt"/>
        <path d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23" fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="miter"/>
      </g>
    </svg>
  ),
  bq: ({ width, height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 45 45">
      <g fill="#000" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill="#000" stroke="none">
          <circle cx="6" cy="12" r="2.75"/>
          <circle cx="14" cy="9" r="2.75"/>
          <circle cx="22.5" cy="8" r="2.75"/>
          <circle cx="31" cy="9" r="2.75"/>
          <circle cx="39" cy="12" r="2.75"/>
        </g>
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" strokeLinecap="butt"/>
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt"/>
        <path d="M11 38.5a35 35 1 0 0 23 0" fill="none" strokeLinecap="butt"/>
        <path d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0" fill="none" stroke="#fff"/>
      </g>
    </svg>
  )
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
          const PieceComponent = ChessPieces[piece];
          return (
            <Box 
              key={`${piece}-${index}`} 
              width={{ base: "18px", md: "22px" }} 
              height={{ base: "18px", md: "22px" }}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {PieceComponent && <PieceComponent width="100%" height="100%" />}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
};

export default CapturedPieces; 