import React, { useState, useEffect, useRef } from 'react';

const Timer = ({ initialTime, increment, isRunning, onTimeUp, onTimeChange, gameEnded }) => {
  // Use the initialTime directly from props for display
  const [displayTime, setDisplayTime] = useState(initialTime || 0);
  
  // Reference to track the timer interval
  const timerIntervalRef = useRef(null);
  
  // Debug logging for initialization
  useEffect(() => {
    console.log(`Timer initialized with: ${initialTime}s, increment: ${increment}`);
  }, [initialTime, increment]);
  
  // Format time as mm:ss
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Update display time when initialTime changes (when a move is made)
  useEffect(() => {
    if (initialTime !== undefined && initialTime !== null) {
      console.log(`Server time update: ${displayTime} → ${initialTime}`);
      setDisplayTime(initialTime);
    }
  }, [initialTime]);
  
  // Handle timer running state
  useEffect(() => {
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (isRunning) {
      console.log(`Timer started: ${displayTime}s`);
      
      // Countdown timer that updates once per second
      timerIntervalRef.current = setInterval(() => {
        setDisplayTime(prevTime => {
          // Decrement by exactly 1 second
          const newTime = Math.max(0, prevTime - 1);
          
          // Notify parent of time change
          if (prevTime !== newTime) {
            console.log(`Timer tick: ${newTime}s`);
            onTimeChange && onTimeChange(newTime);
          }
          
          // Check for time up
          if (newTime <= 0 && prevTime > 0) {
            onTimeUp && onTimeUp();
          }
          
          return newTime;
        });
      }, 1000); // Update exactly every second
    } else {
      console.log(`Timer paused: ${displayTime}s`);
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, onTimeUp, onTimeChange]);
  
  // Prevent further updates when game is ended
  useEffect(() => {
    if (gameEnded && timerIntervalRef.current) {
      console.log('Game ended, stopping timer');
      clearInterval(timerIntervalRef.current);
    }
  }, [gameEnded]);
  
  return (
    <div className={`px-4 py-2 rounded-lg ${displayTime < 30 ? 'bg-red-100' : 'bg-gray-100'}`}>
      <div className={`text-2xl font-mono font-bold ${displayTime < 30 ? 'text-red-600' : 'text-gray-800'}`}>
        {formatTime(displayTime)}
        {isRunning && <span className="animate-pulse ml-1">•</span>}
      </div>
    </div>
  );
};

export default Timer;