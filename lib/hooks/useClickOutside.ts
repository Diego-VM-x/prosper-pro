'use client';

import { useEffect, RefObject } from 'react';

export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const refArray = Array.isArray(refs) ? refs : [refs];
    let justClickedInside = false;

    const handleMouseDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const isInside = refArray.some((ref) => ref.current && ref.current.contains(target));
      if (isInside) {
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
      const isOutside = refArray.every((ref) => !ref.current || !ref.current.contains(target));
      if (isOutside) {
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
  }, [refs, handler, enabled]);
}
