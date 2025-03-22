import React, { useState } from 'react';

// Reuse the same time control options as the CreateGameModal
const timeControls = [
  { id: 'bullet1', name: 'Bullet', time: 60, increment: 0, label: '1+0' },
  { id: 'bullet2', name: 'Bullet', time: 120, increment: 1, label: '2+1' },
  { id: 'blitz5', name: 'Blitz', time: 300, increment: 0, label: '5+0' },
  { id: 'blitz3', name: 'Blitz', time: 180, increment: 2, label: '3+2' },
  { id: 'rapid10', name: 'Rapid', time: 600, increment: 0, label: '10+0' },
  { id: 'rapid10inc5', name: 'Rapid', time: 600, increment: 5, label: '10+5' },
  { id: 'rapid15', name: 'Rapid', time: 900, increment: 10, label: '15+10' },
  { id: 'unlimited', name: 'Unlimited', time: null, increment: 0, label: 'Unlimited' }
];

// Updated difficulty levels to match js-chess-engine capabilities
const difficultyLevels = [
  { id: 'very_easy', name: 'Very Easy', description: 'Absolute beginner level' },
  { id: 'easy', name: 'Easy', description: 'For beginners' },
  { id: 'medium', name: 'Medium', description: 'For casual players' },
  { id: 'hard', name: 'Hard', description: 'For advanced players' },
  { id: 'very_hard', name: 'Very Hard', description: 'Experienced player level' }
];

const ComputerGameModal = ({ onClose, onStartGame }) => {
  // Find the 10+5 option as default
  const defaultTimeIndex = timeControls.findIndex(control => control.id === 'rapid10inc5');
  const [selectedTime, setSelectedTime] = useState(
    timeControls[defaultTimeIndex !== -1 ? defaultTimeIndex : 0]
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficultyLevels[2]); // Default to medium
  const [playerColor, setPlayerColor] = useState('white');

  const handleStartGame = () => {
    onStartGame({
      timeControl: selectedTime,
      difficulty: selectedDifficulty.id,
      playerColor: playerColor
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Play Against Computer</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Select Difficulty</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {difficultyLevels.map(level => (
              <button
                key={level.id}
                onClick={() => setSelectedDifficulty(level)}
                className={`p-3 rounded-lg border ${
                  selectedDifficulty.id === level.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="font-bold">{level.name}</div>
                <div className="text-xs text-gray-600">{level.description}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Select Your Color</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPlayerColor('white')}
              className={`p-3 rounded-lg border ${
                playerColor === 'white'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-bold">White</div>
              <div className="text-xs text-gray-600">Play first</div>
            </button>
            <button
              onClick={() => setPlayerColor('black')}
              className={`p-3 rounded-lg border ${
                playerColor === 'black'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-bold">Black</div>
              <div className="text-xs text-gray-600">Computer plays first</div>
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Time Control</h3>
          <div className="grid grid-cols-2 gap-3">
            {timeControls.map(control => (
              <button
                key={control.id}
                onClick={() => setSelectedTime(control)}
                className={`p-3 rounded-lg border ${
                  selectedTime.id === control.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="font-bold">{control.name}</div>
                <div className="text-xs text-gray-600">{control.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleStartGame}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComputerGameModal;
