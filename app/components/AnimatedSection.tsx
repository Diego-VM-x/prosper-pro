'use client';

import { useEffect, useRef, useState } from 'react';

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        obs.unobserve(el);
      }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  animationType?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'pulse' | 'float';
}

export function AnimatedSection({ 
  children, 
  className = '', 
  delay = 0, 
  threshold = 0.1,
  animationType = 'fade-up'
 }: AnimatedSectionProps) {
  const { ref, isInView } = useInView(threshold);
  
  // Map animation type to CSS class
  const animationClassMap: Record<string, string> = {
    'fade-up': 'animate-fade-in-up',
    'fade-down': 'animate-fade-in-down',
    'fade-left': 'animate-fade-in-left',
    'fade-right': 'animate-fade-in-right',
    'scale': 'animate-scale-in',
    'pulse': 'animate-pulse-soft',
    'float': 'animate-float'
  };

  const animationClass = animationClassMap[animationType] || 'animate-fade-in-up';

  return (
    <div
      ref={ref}
      className={`animated-section ${animationClass} ${isInView ? 'animate-visible' : ''} ${className} delay-${delay}`}>
      {children}
    </div>
  );
}