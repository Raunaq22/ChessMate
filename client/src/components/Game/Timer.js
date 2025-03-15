import React, { useEffect, useState } from 'react';

const Timer = ({ 
  initialTime, 
  increment, 
  isRunning, 
  onTimeUp, 
  onTimeChange,
  className 
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  // Reset timer when initialTime changes
  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  // Main timer logic
  useEffect(() => {
    let intervalId;
    
    if (isRunning && timeLeft > 0) {
      // Update every 1000ms (1 second) for proper second-by-second countdown
      intervalId = setInterval(() => {
        const newTime = Math.max(0, timeLeft - 1);
        setTimeLeft(newTime);
        onTimeChange?.(newTime);
        
        // Check if time is up
        if (newTime === 0) {
          onTimeUp?.();
          clearInterval(intervalId);
        }
      }, 1000);
    } else if (!isRunning && intervalId) {
      // Add increment when timer stops
      if (increment > 0) {
        const newTime = timeLeft + increment;
        setTimeLeft(newTime);
        onTimeChange?.(newTime);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, timeLeft, increment, onTimeUp, onTimeChange]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`text-2xl font-mono font-bold ${
      timeLeft < 30 ? 'text-red-600' : 'text-gray-800'
    } ${className}`}>
      {formatTime(timeLeft)}
    </div>
  );
};

export default Timer;