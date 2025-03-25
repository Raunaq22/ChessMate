import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';

const Timer = ({ initialTime, time, increment, isRunning, onTimeUp, onTimeChange, gameEnded }) => {
  // State for display time
  const [displayTime, setDisplayTime] = useState(time || initialTime || 0);
  
  // Refs to maintain stable values between renders
  const actualTimeRef = useRef(time || initialTime || 0);
  const timerIntervalRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const lastUpdateRef = useRef(Date.now());
  const pendingUpdateRef = useRef(null);
  const justReceivedIncrementRef = useRef(false);
  const lastKnownTimeRef = useRef(time || initialTime || 0);
  const initializedRef = useRef(false);
  
  // Debug mode flag - turn on to see detailed logs
  const DEBUG = false;
  
  // Safe logging function
  const log = (message) => {
    if (DEBUG) {
      console.log(`Timer: ${message}`);
    }
  };

  // Initialize timer when component mounts
  useEffect(() => {
    // Set initialized flag
    initializedRef.current = true;
    
    // Use the provided time prop with fallback to initialTime
    const providedTime = time !== undefined && time !== null ? time : initialTime;
    
    // Only update if we have a valid time
    if (providedTime !== undefined && providedTime !== null && providedTime > 0) {
      log(`Initial timer setup: ${providedTime.toFixed(1)}s`);
      actualTimeRef.current = providedTime;
      setDisplayTime(providedTime);
      lastKnownTimeRef.current = providedTime;
    }
  }, []);  // Only run once on mount

  // Handle time prop changes
  useEffect(() => {
    if (!initializedRef.current) return;
    
    const providedTime = time !== undefined && time !== null ? time : initialTime;
    
    if (providedTime !== undefined && providedTime !== null) {
      const prevTime = actualTimeRef.current;
      const diff = providedTime - prevTime;

      // Store the last known server time to detect future changes
      if (providedTime !== lastKnownTimeRef.current) {
        log(`Time changed from ${lastKnownTimeRef.current.toFixed(1)}s to ${providedTime.toFixed(1)}s`);
        lastKnownTimeRef.current = providedTime;
      }

      // CRITICAL: Handle increments properly
      // If we get a time larger than previous and we're paused (after move), 
      // it's likely an increment
      if (diff > 0 && !isRunning) {
        // More permissive increment check - doesn't have to be exact increment value
        // Sometimes network delays or server rounding can make it slightly off
        const isIncrementPlausible = (diff > 0 && diff <= increment * 1.5) || 
                                    (Math.abs(diff - increment) < 1.5);
        
        if (isIncrementPlausible) {
          log(`✓ Increment detected: +${diff.toFixed(1)}s (${prevTime.toFixed(1)}s → ${providedTime.toFixed(1)}s)`);
          justReceivedIncrementRef.current = true;
          
          // Always accept increments immediately
          actualTimeRef.current = providedTime;
          setDisplayTime(providedTime);
          return; // Exit early - no other checks needed
        }
      }
      
      // Not an increment. Only update time if significant difference exists,
      // or if we're not currently running (to avoid disrupting countdown)
      if (!isRunning || Math.abs(prevTime - providedTime) >= 2) {
        log(`Server time sync: ${prevTime.toFixed(1)}s → ${providedTime.toFixed(1)}s (diff: ${diff.toFixed(1)}s)`);
        actualTimeRef.current = providedTime;
        setDisplayTime(providedTime);
      }
    }
  }, [time, initialTime, increment, isRunning]);

  // Format time as mm:ss
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '0:00';
    
    // Use ceiling for display to avoid jumping from 1:00 to 0:59 too early
    const adjustedSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(adjustedSeconds / 60);
    const remainingSeconds = Math.floor(adjustedSeconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle timer running state
  useEffect(() => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // If game has ended, don't start the timer
    if (gameEnded) {
      log('Game has ended - timer stopped');
      return;
    }
    
    // Don't run timer if time is zero or null
    if (actualTimeRef.current <= 0) {
      log('Timer is zero or negative, not starting');
      return;
    }

    if (isRunning) {
      // Reset tick reference when timer starts
      lastTickRef.current = Date.now();
      log(`Starting timer at ${actualTimeRef.current.toFixed(1)}s`);
      justReceivedIncrementRef.current = false;
      
      // Increase timer update frequency for smoother visuals
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
        
        // Avoid subtracting too much at once (browser throttling protection)
        // Also ignore very small ticks that might be due to timer inaccuracies
        if (elapsedSeconds > 0.01 && elapsedSeconds < 2) {
          // Update time tracking - ensure we don't go below 0
          actualTimeRef.current = Math.max(0, actualTimeRef.current - elapsedSeconds);
          
          // Smoother display update - avoid jumps by using consistent decimal places
          // Use floor for display to make time appear to count down more naturally
          setDisplayTime(Math.ceil(actualTimeRef.current * 10) / 10);
          
          // Notify parent about time changes (but not too frequently)
          if (now - lastUpdateRef.current >= 950) {
            lastUpdateRef.current = now;
            
            // Use floor for consistent whole-second updates
            const roundedTime = Math.floor(actualTimeRef.current);
            log(`Timer tick: ${roundedTime}s`);
            
            if (onTimeChange) {
              // Clear any pending updates to avoid multiple calls
              if (pendingUpdateRef.current) {
                clearTimeout(pendingUpdateRef.current);
              }
              
              // Slightly delayed to batch updates
              pendingUpdateRef.current = setTimeout(() => {
                onTimeChange(roundedTime);
                pendingUpdateRef.current = null;
              }, 50);
            }
          }
          
          // Handle time up
          if (actualTimeRef.current <= 0) {
            log('Timer reached zero!');
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            onTimeUp && onTimeUp();
          }
        }
      }, 50); // 20 updates per second for smoother visuals (was 100ms)
    } else {
      // Timer is paused
      log(`Timer paused at ${actualTimeRef.current.toFixed(1)}s`);
      
      // Mark that increment flag should be reset when next running
      if (justReceivedIncrementRef.current) {
        // Keep this flag on during pause so we know we just had an increment
        log('Increment flag remains active while paused');
      }
    }
    
    // Cleanup on unmount or dependencies change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    };
  }, [isRunning, gameEnded, onTimeUp, onTimeChange]);

  return (
    <Flex align="center" justify="center">
      <Text 
        fontSize="2xl" 
        fontFamily="mono" 
        fontWeight="bold" 
        color={displayTime <= 30 ? "red.500" : "black"}
        px={2}
        py={1}
        position="relative"
      >
        {formatTime(displayTime)}
        {isRunning && (
          <Box 
            as="span" 
            ml={1} 
            display="inline-block"
            animation="pulse 1.5s infinite" 
            color={displayTime < 30 ? "red.300" : "gray.600"}
          >
            •
          </Box>
        )}
        {displayTime < 30 && (
          <Box 
            position="absolute"
            left="0"
            top="0"
            right="0"
            bottom="0"
            borderRadius="md"
            bg="red.500"
            opacity="0.15"
            zIndex="-1"
          />
        )}
      </Text>
    </Flex>
  );
};

export default Timer;