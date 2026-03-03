import { useState, useEffect, useRef } from 'react';

const useStepCounter = (isActive = true) => {
  const [steps, setSteps] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // References for sensor data
  const lastStepTimestamp = useRef(0);
  const stepBuffer = useRef([]);
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0, magnitude: 0 });
  
  // Constants for step detection
  const STEP_THRESHOLD = 12;
  const STEP_TIMEOUT = 300;
  const BUFFER_SIZE = 10;
  
  // Step detection algorithm based on accelerometer peak detection
  const detectStep = (acceleration) => {
    const magnitude = Math.sqrt(
      acceleration.x ** 2 + 
      acceleration.y ** 2 + 
      acceleration.z ** 2
    );
    
    // Add to buffer for smoothing
    stepBuffer.current.push(magnitude);
    if (stepBuffer.current.length > BUFFER_SIZE) {
      stepBuffer.current.shift();
    }
    
    // Calculate smoothed value (running average)
    const smoothedMagnitude = stepBuffer.current.reduce((a, b) => a + b, 0) / 
                             stepBuffer.current.length;
    
    // Detect peak by comparing with last value
    const lastMagnitude = lastAcceleration.current.magnitude || 0;
    const difference = Math.abs(smoothedMagnitude - lastMagnitude);
    
    lastAcceleration.current = { 
      ...acceleration, 
      magnitude: smoothedMagnitude 
    };
    
    const now = Date.now();
    
    // Check if this is a step (peak detection)
    if (difference > STEP_THRESHOLD && 
        smoothedMagnitude > lastMagnitude &&
        now - lastStepTimestamp.current > STEP_TIMEOUT) {
      lastStepTimestamp.current = now;
      return true;
    }
    
    return false;
  };

  // Handle motion events
  const handleMotion = (event) => {
    const acceleration = event.acceleration || event.accelerationIncludingGravity;
    
    if (!acceleration || 
        acceleration.x === null || 
        acceleration.y === null || 
        acceleration.z === null) {
      return;
    }

    // Update walking status based on movement
    const magnitude = Math.sqrt(
      acceleration.x ** 2 + 
      acceleration.y ** 2 + 
      acceleration.z ** 2
    );
    
    setIsWalking(magnitude > 1.5);

    // Detect step
    if (detectStep(acceleration)) {
      setSteps(prev => prev + 1);
    }
  };

  // Request permission and start listening to accelerometer
  useEffect(() => {
    if (!isActive) return;

    // Check if DeviceMotionEvent is supported
    if (!window.DeviceMotionEvent) {
      setError('Device motion sensors are not supported on this device');
      return;
    }

    // Request permission for iOS 13+ devices
    const requestPermission = async () => {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceMotionEvent.requestPermission();
          if (permission === 'granted') {
            setPermissionGranted(true);
            window.addEventListener('devicemotion', handleMotion);
          } else {
            setError('Permission to access motion sensors was denied');
          }
        } catch (err) {
          setError('Error requesting sensor permission');
        }
      } else {
        // Android and older iOS - permission not required
        setPermissionGranted(true);
        window.addEventListener('devicemotion', handleMotion);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isActive]);

  // Reset steps
  const resetSteps = () => {
    setSteps(0);
    lastStepTimestamp.current = 0;
    stepBuffer.current = [];
  };

  return {
    steps,
    isWalking,
    error,
    permissionGranted,
    resetSteps
  };
};

export default useStepCounter;