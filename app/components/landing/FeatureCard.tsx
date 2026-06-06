'use client';

import { ReactNode } from 'react';
import { AnimatedSection } from '../AnimatedSection';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  features: string[];
  visual?: ReactNode;
  large?: boolean;
  delay?: number;
}

export function FeatureCard({
  icon,
  title,
  description,
  features,
  visual,
  large = false,
  delay = 0,
}: FeatureCardProps) {
  return (
    <AnimatedSection animationType="fade-up" delay={delay}>
      <div className={`feature-card ${large ? 'feature-card-large' : ''}`}>
        {visual && <div className="feature-card-visual">{visual}</div>}
        <div className="feature-card-content">
          <div className="feature-icon-wrapper">
            <span className="feature-icon">{icon}</span>
          </div>
          <h3>{title}</h3>
          <p>{description}</p>
          <ul className="feature-list">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </AnimatedSection>
  );
}
