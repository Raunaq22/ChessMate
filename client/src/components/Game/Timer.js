import React, { useEffect, useState, useRef } from 'react';

const Timer = ({ initialTime, increment, isRunning, onTimeUp, onTimeChange, className }) => {
  // Use a ref to store the current time value to avoid unnecessary re-renders
  const timeRef = useRef(initialTime);
  // State for display purposes only
  const [displayTime, setDisplayTime] = useState(initialTime);
  // Track when the timer was last started
  const startTimeRef = useRef(null);
  // Track last time we reported a change
  const lastReportTimeRef = useRef(null);
  // Track the animation frame ID
  const animationFrameId = useRef(null);
  // Track previous running state
  const wasRunningRef = useRef(isRunning);
  // Track if an increment was already applied
  const incrementAppliedRef = useRef(false);

  // Sync with initialTime when it changes
  useEffect(() => {
    if (Math.abs(initialTime - timeRef.current) > 0.1) {
      timeRef.current = initialTime;
      setDisplayTime(initialTime);
      console.log('Timer reset to:', initialTime);
    }
  }, [initialTime]);

  // Main timer logic using requestAnimationFrame for smoother updates
  useEffect(() => {
    const updateTimer = () => {
      if (!startTimeRef.current) return;
      
      const now = Date.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      startTimeRef.current = now;
      
      // Update internal time
      const newTime = Math.max(0, timeRef.current - elapsed);
      timeRef.current = newTime;
      
      // Update display time at most 10 times per second
      setDisplayTime(newTime);
      
      // Only report changes every 500ms to reduce network traffic
      if (!lastReportTimeRef.current || now - lastReportTimeRef.current > 500) {
        onTimeChange?.(newTime);
        lastReportTimeRef.current = now;
      }
      
      if (newTime <= 0) {
        onTimeUp?.();
        return;
      }
      
      animationFrameId.current = requestAnimationFrame(updateTimer);
    };
    
    if (isRunning && timeRef.current > 0) {
      // Start the timer
      startTimeRef.current = Date.now();
      incrementAppliedRef.current = false;
      animationFrameId.current = requestAnimationFrame(updateTimer);
    } else {
      // Stop the timer
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      
      // Apply increment when timer stops (if it was running before)
      if (wasRunningRef.current && !isRunning && increment > 0 && !incrementAppliedRef.current) {
        const newTime = timeRef.current + increment;
        timeRef.current = newTime;
        setDisplayTime(newTime);
        onTimeChange?.(newTime);
        incrementAppliedRef.current = true;
      }
    }
    
    wasRunningRef.current = isRunning;
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isRunning, increment, onTimeUp, onTimeChange]);

  // Format time display
  const minutes = Math.floor(displayTime / 60);
  const seconds = Math.floor(displayTime % 60);
  const deciseconds = Math.floor((displayTime % 1) * 10);
  
  const timeDisplay = displayTime < 10
    ? `${minutes}:${seconds.toString().padStart(2, '0')}.${deciseconds}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className={`font-mono text-xl ${className || ''} ${displayTime < 30 ? 'text-red-600' : ''}`}>
      {timeDisplay}
    </div>
  );
};

export default Timer;