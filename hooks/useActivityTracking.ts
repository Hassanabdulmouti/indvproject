// hooks/useActivityTracking.ts

import { useEffect, useCallback, useRef } from 'react';
import { auth } from '@/firebase/clientApp';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/clientApp';

export const useActivityTracking = () => {
  const lastUpdateRef = useRef<number>(Date.now());
  const updateInProgressRef = useRef(false);

  const updateLastActivity = useCallback(async () => {
    // Don't update if there's already an update in progress
    if (updateInProgressRef.current) {
      return;
    }

    const now = Date.now();
    // Only update if it's been more than 30 seconds since the last update
    if (now - lastUpdateRef.current < 30000) {
      return;
    }

    if (auth.currentUser) {
      try {
        updateInProgressRef.current = true;
        const updateUserLastActivity = httpsCallable(functions, 'updateUserLastActivity');
        await updateUserLastActivity();
        lastUpdateRef.current = now;
      } catch (error) {
        console.error('Error updating last activity:', error);
      } finally {
        updateInProgressRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }

    // Update last activity when component mounts
    updateLastActivity();

    // Set up event listeners for user activity
    const events = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'mousemove',
      'click',
      'focus'
    ];

    let debounceTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(updateLastActivity, 1000);
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Set up interval to update activity periodically while user is on the page
    const intervalId = setInterval(updateLastActivity, 60000); // Update every minute

    // Cleanup function
    return () => {
      // Remove event listeners
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      // Clear timers
      clearTimeout(debounceTimeout);
      clearInterval(intervalId);
    };
  }, [updateLastActivity]);
};
