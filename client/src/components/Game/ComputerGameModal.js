import React, { memo, useRef } from 'react';
import GameSettingsModal from './GameSettingsModal';

const ComputerGameModal = ({ onClose, onStartGame }) => {
  const possibleMoves = useRef([]); // Now an array instead of an object

  return (
    <GameSettingsModal
      isOpen={true}
      onClose={onClose}
      onStartGame={onStartGame}
      modalType="computer"
      title="Play Against Computer"
    />
  );
};

export default memo(ComputerGameModal);
