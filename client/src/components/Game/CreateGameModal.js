import React, { memo } from 'react';
import GameSettingsModal from './GameSettingsModal';

const CreateGameModal = ({ onClose, onCreateGame }) => {
  return (
    <GameSettingsModal
      isOpen={true}
      onClose={onClose}
      onCreateGame={onCreateGame}
      modalType="create"
      title="Create New Game"
    />
  );
};

export default memo(CreateGameModal);