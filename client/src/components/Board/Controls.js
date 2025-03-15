import React, { useState } from 'react';
import Button from './Button';

const Controls = ({ 
  onResign, 
  onOfferDraw, 
  onAcceptDraw,
  onDeclineDraw,
  drawOfferReceived,
  gameOver,
  isPlayerTurn,
  gameStarted
}) => {
  const [confirmResign, setConfirmResign] = useState(false);
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-3">Game Controls</h3>
      
      <div className="flex flex-col gap-3">
        {/* Resign controls */}
        {!gameOver && gameStarted && (
          !confirmResign ? (
            <Button 
              variant="danger" 
              onClick={() => setConfirmResign(true)}
              className="w-full"
            >
              Resign Game
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-700">Are you sure you want to resign?</p>
              <div className="flex gap-2">
                <Button 
                  variant="danger" 
                  onClick={onResign}
                  className="flex-1"
                >
                  Yes, Resign
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => setConfirmResign(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )
        )}
        
        {/* Draw offer controls */}
        {!gameOver && gameStarted && !drawOfferReceived && (
          <Button 
            variant="secondary"
            onClick={onOfferDraw}
            disabled={!isPlayerTurn}
            className="w-full"
          >
            Offer Draw
          </Button>
        )}
        
        {/* Draw offer response */}
        {!gameOver && drawOfferReceived && (
          <div className="border-t border-gray-200 pt-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Your opponent offers a draw</p>
            <div className="flex gap-2">
              <Button 
                variant="success" 
                onClick={onAcceptDraw}
                className="flex-1"
              >
                Accept
              </Button>
              <Button 
                variant="secondary"
                onClick={onDeclineDraw}
                className="flex-1"
              >
                Decline
              </Button>
            </div>
          </div>
        )}
        
        {gameOver && (
          <Button
            variant="primary"
            onClick={() => window.location.href = '/lobby'}
            className="w-full"
          >
            Back to Lobby
          </Button>
        )}
      </div>
    </div>
  );
};

export default Controls;