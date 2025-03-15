import React, { useState } from 'react';

const timeControls = [
  { id: 'bullet1', name: 'Bullet', time: 60, increment: 0, label: '1+0' },
  { id: 'bullet2', name: 'Bullet', time: 120, increment: 1, label: '2+1' },
  { id: 'blitz5', name: 'Blitz', time: 300, increment: 0, label: '5+0' },
  { id: 'blitz3', name: 'Blitz', time: 180, increment: 2, label: '3+2' },
  { id: 'rapid10', name: 'Rapid', time: 600, increment: 0, label: '10+0' },
  { id: 'rapid15', name: 'Rapid', time: 900, increment: 10, label: '15+10' },
  { id: 'unlimited', name: 'Unlimited', time: null, increment: 0, label: 'Unlimited' }
];

const CreateGameModal = ({ onClose, onCreateGame }) => {
  const [selectedTime, setSelectedTime] = useState(timeControls[0]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {timeControls.map(control => (
            <button
              key={control.id}
              onClick={() => setSelectedTime(control)}
              className={`p-4 rounded-lg border ${
                selectedTime.id === control.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-bold">{control.name}</div>
              <div className="text-sm text-gray-600">{control.label}</div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreateGame(selectedTime)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGameModal;