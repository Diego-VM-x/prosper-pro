'use client';

import { useEffect, useRef, useState } from 'react';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  label: string;
  icon: string;
}

export function AnimatedCounter({ end, suffix = '', prefix = '', duration = 2000, label, icon }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsVisible(true);
          hasAnimated.current = true;
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isVisible, end, duration]);

  return (
    <div ref={ref} className="counter-card">
      <span className="counter-icon"><InlineIcon icon={icon} size={20} /></span>
      <div className="counter-value">
        {prefix}{count.toLocaleString('es-VE')}{suffix}
      </div>
      <span className="counter-label">{label}</span>
    </div>
  );
}
