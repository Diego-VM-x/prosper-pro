'use client';

import { useEffect, RefObject } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    let justClickedInside = false;

    const handleMouseDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (ref.current && ref.current.contains(target)) {
        justClickedInside = true;
        return;
      }
      justClickedInside = false;
    };

    const handleClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (justClickedInside) {
        justClickedInside = false;
        return;
      }
      if (ref.current && !ref.current.contains(target)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('mouseup', handleClick);
    document.addEventListener('touchend', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('touchstart', handleMouseDown);
      document.removeEventListener('mouseup', handleClick);
      document.removeEventListener('touchend', handleClick);
    };
  }, [ref, handler, enabled]);
}
