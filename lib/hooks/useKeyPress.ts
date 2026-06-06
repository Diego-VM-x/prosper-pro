'use client';

import { useEffect } from 'react';

export function useKeyPress(
  targetKey: string,
  handler: (e: KeyboardEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetKey, handler, enabled]);
}

export function useEscape(handler: () => void, enabled: boolean = true) {
  return useKeyPress('Escape', handler, enabled);
}
