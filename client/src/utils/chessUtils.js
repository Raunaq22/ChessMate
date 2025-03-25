/**
 * Utility functions for chess operations
 */

/**
 * Converts a chess move to standard algebraic notation
 * @param {Object} move - A move object from chess.js
 * @returns {string} The move in standard algebraic notation
 */
export const convertToStandardNotation = (move) => {
  if (!move) return '';
  return move.san || '';
};

/**
 * Formats a time value in seconds to a displayable format
 * @param {number} timeInSeconds - Time in seconds
 * @returns {string} Formatted time string (mm:ss)
 */
export const formatTime = (timeInSeconds) => {
  if (timeInSeconds === null || timeInSeconds === undefined) return '--:--';
  
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Returns a description of a chess position result
 * @param {Object} chess - A chess.js instance
 * @returns {string|null} Description of the game result or null if game is ongoing
 */
export const getGameResultDescription = (chess) => {
  if (!chess) return null;
  
  if (chess.isCheckmate()) {
    return `${chess.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`;
  }
  
  if (chess.isDraw()) {
    if (chess.isStalemate()) {
      return 'Draw by stalemate';
    }
    if (chess.isInsufficientMaterial()) {
      return 'Draw by insufficient material';
    }
    if (chess.isThreefoldRepetition()) {
      return 'Draw by threefold repetition';
    }
    return 'Draw by fifty-move rule';
  }
  
  return null;
};

/**
 * Convert FEN string to a more readable position description
 * @param {string} fen - FEN position string
 * @returns {string} Human-readable position description
 */
export const fenToPositionDescription = (fen) => {
  if (!fen) return 'Invalid position';
  
  // Basic implementation, could be expanded
  const fenParts = fen.split(' ');
  const turn = fenParts[1] === 'w' ? 'White' : 'Black';
  
  return `${turn} to move`;
};

export default {
  convertToStandardNotation,
  formatTime,
  getGameResultDescription,
  fenToPositionDescription
}; 