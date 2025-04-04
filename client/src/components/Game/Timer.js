import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, Flex, Icon } from '@chakra-ui/react';
import { FaInfinity } from 'react-icons/fa';

const Timer = ({ initialTime, time, increment, isRunning, onTimeUp, onTimeChange, gameEnded }) => {
  // Check if this is an unlimited time game - more specific condition
  const isUnlimited = initialTime === "unlimited" || time === "unlimited";
  
  // State for display time - if unlimited, set to "unlimited" string instead of a number
  const [displayTime, setDisplayTime] = useState(isUnlimited ? "unlimited" : (time || initialTime || 0));
  
  // Refs to maintain stable values between renders
  const actualTimeRef = useRef(isUnlimited ? "unlimited" : (time || initialTime || 0));
  const timerIntervalRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const lastUpdateRef = useRef(Date.now());
  const pendingUpdateRef = useRef(null);
  const justReceivedIncrementRef = useRef(false);
  const lastKnownTimeRef = useRef(isUnlimited ? "unlimited" : (time || initialTime || 0));
  const initializedRef = useRef(false);
  const isUnlimitedRef = useRef(isUnlimited);
  
  // Debug mode flag - turn on to see detailed logs
  const DEBUG = true;
  
  // Safe logging function
  const log = (message) => {
    if (DEBUG) {
      console.log(`Timer: ${message}`);
    }
  };
  
  // Log on component mount to help debug
  useEffect(() => {
    log(`Component mounted with initialTime=${initialTime}, time=${time}`);
    log(`isUnlimited evaluation: ${isUnlimited}`);
    isUnlimitedRef.current = isUnlimited;
  }, [initialTime, time, isUnlimited]);

  // Initialize timer when component mounts
  useEffect(() => {
    // Set initialized flag
    initializedRef.current = true;
    
    // For unlimited time, don't set any timer values
    if (isUnlimited) {
      log('Unlimited time game detected');
      actualTimeRef.current = "unlimited";
      setDisplayTime("unlimited");
      lastKnownTimeRef.current = "unlimited";
      isUnlimitedRef.current = true;
      return;
    }
    
    // Use the provided time prop with fallback to initialTime
    const providedTime = time !== undefined && time !== null ? time : initialTime;
    
    // Only update if we have a valid time
    if (providedTime !== undefined && providedTime !== null && providedTime > 0) {
      log(`Initial timer setup: ${typeof providedTime === 'number' ? providedTime.toFixed(1) : providedTime}s`);
      actualTimeRef.current = providedTime;
      setDisplayTime(providedTime);
      lastKnownTimeRef.current = providedTime;
    }
  }, [isUnlimited, initialTime, time]);  // Run on mount and when these values change

  // Handle time prop changes
  useEffect(() => {
    if (!initializedRef.current) return;
    
    // Check if unlimited status has changed
    if (initialTime === "unlimited" || time === "unlimited") {
      if (!isUnlimitedRef.current) {
        log('Switching to unlimited time mode');
        actualTimeRef.current = "unlimited";
        setDisplayTime("unlimited");
        lastKnownTimeRef.current = "unlimited";
        isUnlimitedRef.current = true;
      }
      return;
    }
    
    // If we were in unlimited mode but now we're not, reinitialize timer
    if (isUnlimitedRef.current && initialTime !== "unlimited" && time !== "unlimited") {
      log('Switching from unlimited to timed mode');
      isUnlimitedRef.current = false;
    }
    
    const providedTime = time !== undefined && time !== null ? time : initialTime;
    
    if (providedTime !== undefined && providedTime !== null) {
      const prevTime = actualTimeRef.current;
      
      // Skip if we're in unlimited mode or comparing with unlimited mode
      if (prevTime === "unlimited" || providedTime === "unlimited") {
        return;
      }
      
      const diff = providedTime - prevTime;

      // Store the last known server time to detect future changes
      if (providedTime !== lastKnownTimeRef.current) {
        log(`Time changed from ${typeof lastKnownTimeRef.current === 'number' ? lastKnownTimeRef.current.toFixed(1) : lastKnownTimeRef.current}s to ${typeof providedTime === 'number' ? providedTime.toFixed(1) : providedTime}s (diff: ${typeof diff === 'number' ? diff.toFixed(1) : diff}s)`);
        lastKnownTimeRef.current = providedTime;
      }

      // Always accept server time values immediately
      if (Math.abs(diff) > 0.1) { // Only update if difference is significant (> 0.1s)
        log(`Accepting server time update: ${typeof prevTime === 'number' ? prevTime.toFixed(1) : prevTime}s → ${typeof providedTime === 'number' ? providedTime.toFixed(1) : providedTime}s`);
        
        // If time increased, mark as increment for UI feedback
        if (diff > 0) {
          justReceivedIncrementRef.current = true;
          log(`✓ Increment detected via server: +${typeof diff === 'number' ? diff.toFixed(1) : diff}s`);
        }
        
        // Always update the time
        actualTimeRef.current = providedTime;
        setDisplayTime(providedTime);
      }
    }
  }, [time, initialTime, increment, isRunning]);

  // Format time as mm:ss
  const formatTime = (seconds) => {
    // Special case for unlimited time
    if (seconds === "unlimited") return "∞";
    
    if (seconds === null || seconds === undefined) return '0:00';
    
    // Use ceiling for display to avoid jumping from 1:00 to 0:59 too early
    const adjustedSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(adjustedSeconds / 60);
    const remainingSeconds = Math.floor(adjustedSeconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle timer running state
  useEffect(() => {
    // For unlimited time games, don't run any timer logic
    if (isUnlimitedRef.current || actualTimeRef.current === "unlimited") {
      log('Unlimited time game - no timer needed');
      return;
    }
    
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
      log(`Starting timer at ${typeof actualTimeRef.current === 'number' ? actualTimeRef.current.toFixed(1) : actualTimeRef.current}s`);
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
      log(`Timer paused at ${typeof actualTimeRef.current === 'number' ? actualTimeRef.current.toFixed(1) : actualTimeRef.current}s`);
      
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
      {isUnlimitedRef.current || actualTimeRef.current === "unlimited" ? (
        // Render infinity symbol for unlimited time
        <Flex align="center" justify="center">
          <Text 
            fontSize="2xl" 
            fontFamily="mono" 
            fontWeight="bold" 
            color="white"
            px={2}
            py={1}
          >
            <Icon as={FaInfinity} boxSize="1.5em" color="white" verticalAlign="middle" />
          </Text>
        </Flex>
      ) : (
        // Regular time display
        <Text 
          fontSize="2xl" 
          fontFamily="mono" 
          fontWeight="bold" 
          color={displayTime <= 30 ? "red.500" : "white"}
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
              color={displayTime < 30 ? "red.300" : "gray.200"}
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
      )}
    </Flex>
  );
};

export default Timer;