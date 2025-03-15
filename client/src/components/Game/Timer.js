import React, { useState, useEffect, useCallback, useRef } from 'react';

const Timer = ({ initialTime, increment, isRunning, onTimeUp, onTimeChange, gameEnded }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime || 600); 
  const incrementApplied = useRef(false);
  const lastRunningState = useRef(isRunning);
  const lastUpdateTime = useRef(Date.now());
  const previousTime = useRef(initialTime);
  
  // Format time as mm:ss
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Better sync with server time values
  useEffect(() => {
    if (initialTime !== undefined && Math.abs(initialTime - previousTime.current) > 1) {
      console.log(`Timer reset: ${timeLeft} -> ${initialTime}`);
      setTimeLeft(initialTime);
      previousTime.current = initialTime;
    }
  }, [initialTime, timeLeft]);

  // More accurate timer with millisecond precision
  const updateTimer = useCallback(() => {
    if (timeLeft <= 0 || gameEnded) {
      if (timeLeft <= 0 && onTimeUp) onTimeUp();
      return;
    }
    
    const now = Date.now();
    const elapsed = (now - lastUpdateTime.current) / 1000;
    
    // More reliable update logic
    if (elapsed > 0 && elapsed < 1.1) {
      lastUpdateTime.current = now;
      
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - elapsed);
        // Only send time updates at reasonable intervals to reduce network traffic
        if (onTimeChange && Math.abs(prev - newTime) >= 0.2) {
          onTimeChange(newTime);
        }
        return newTime;
      });
    } else {
      // Reset if elapsed time is unreasonable
      lastUpdateTime.current = now;
    }
  }, [timeLeft, onTimeUp, onTimeChange, gameEnded]);

  // Improved increment handling
  useEffect(() => {
    if (lastRunningState.current !== isRunning) {
      lastUpdateTime.current = Date.now();
      console.log(`Timer running state changed: ${lastRunningState.current} -> ${isRunning}`);
      
      // Apply increment when timer stops running (after making a move)
      if (!isRunning && lastRunningState.current && increment > 0 && !gameEnded && !incrementApplied.current) {
        console.log(`Applying increment: ${increment}`);
        setTimeLeft(prev => {
          const newTime = prev + increment;
          if (onTimeChange) onTimeChange(newTime); // Notify parent of increment
          return newTime;
        });
        incrementApplied.current = true;
      } else if (isRunning) {
        // Reset the flag when timer starts again
        incrementApplied.current = false;
      }
      
      lastRunningState.current = isRunning;
    }
  }, [isRunning, increment, onTimeChange, gameEnded]);

  // Run timer with higher frequency for smoother countdown
  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0 && !gameEnded) {
      lastUpdateTime.current = Date.now();
      interval = setInterval(updateTimer, 50); // Update more frequently for smoother display
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, updateTimer, gameEnded]);

  // Stop timer when game ends
  useEffect(() => {
    if (gameEnded) {
      incrementApplied.current = false;
    }
  }, [gameEnded]);

  return (
    <div className={`px-4 py-2 rounded-lg ${timeLeft < 30 ? 'bg-red-100' : 'bg-gray-100'}`}>
      <div className={`text-2xl font-mono font-bold ${timeLeft < 30 ? 'text-red-600' : 'text-gray-800'}`}>
        {formatTime(timeLeft)}
      </div>
    </div>
  );
};

export default Timer;