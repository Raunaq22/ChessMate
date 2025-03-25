import React, { memo } from 'react';
import GameSettingsModal from './GameSettingsModal';

const ComputerGameModal = ({ onClose, onStartGame }) => {
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
