'use client';

import React from 'react';

interface ChartDataset {
  label: string;
  color: string;
  data: number[];
}

interface LineChartProps {
  datasets: ChartDataset[];
  labels: string[];
  height?: number;
  showArea?: boolean;
  strokeWidth?: number;
}

// Convertir datos a path SVG con curvas Bezier suaves
function createSmoothPath(data: number[], width: number, height: number, minY: number, maxY: number): string {
  if (data.length < 2) return '';
  const range = maxY - minY || 1;
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((v - minY) / range) * chartHeight,
  }));

  // Curva Bezier cúbica suave
  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return path;
}

function createAreaPath(data: number[], width: number, height: number, minY: number, maxY: number): string {
  const linePath = createSmoothPath(data, width, height, minY, maxY);
  if (!linePath) return '';
  const padding = 10;
  const chartWidth = width - padding * 2;
  return `${linePath} L ${padding + chartWidth},${height} L ${padding},${height} Z`;
}

export function LineChart({ datasets, labels, height = 300, showArea = true, strokeWidth = 3 }: LineChartProps) {
  const allValues = datasets.flatMap(d => d.data);
  const minY = Math.min(...allValues, 0);
  const maxY = Math.max(...allValues, 1);
  const range = maxY - minY || 1;

  // Grid lines Y
  const yTicks = 5;
  const yGridLines = Array.from({ length: yTicks }, (_, i) => {
    const pct = i / (yTicks - 1);
    const val = minY + range * pct;
    const padding = 10;
    const chartHeight = height - padding * 2;
    const y = padding + chartHeight - pct * chartHeight;
    return { y, label: val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0) };
  });

  return (
    <div className="emerald-chart">
      <svg className="emerald-chart-svg" viewBox={`0 0 800 ${height}`} preserveAspectRatio="none">
        <defs>
          {datasets.map((ds, i) => (
            <linearGradient key={`grad-${i}`} id={`chart-grad-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={ds.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={ds.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Vertical grid bands alternadas */}
        {labels.map((_, i) => {
          const padding = 10;
          const chartWidth = 800 - padding * 2;
          const xStart = padding + (i / Math.max(labels.length - 1, 1)) * chartWidth;
          const xEnd = padding + ((i + 0.5) / Math.max(labels.length - 1, 1)) * chartWidth;
          if (i % 2 === 0 && labels.length > 1) {
            return <rect key={`band-${i}`} x={xStart} y="5" width={xEnd - xStart} height={height - 10} fill="var(--bg-input, #1a211d)" opacity="0.4" rx="0" />;
          }
          return null;
        })}

        {/* Horizontal grid lines */}
        {yGridLines.map((line, i) => (
          <line key={i} x1="50" y1={line.y} x2="790" y2={line.y} stroke="var(--border-default, #3c4a42)" strokeWidth="0.5" strokeDasharray="4,4" />
        ))}

        {/* Y-axis labels */}
        {yGridLines.map((line, i) => (
          <text key={`yl-${i}`} x="45" y={line.y + 4} textAnchor="end" fill="var(--text-tertiary, #86948a)" fontSize="11" fontWeight="600">
            {line.label}
          </text>
        ))}

        {/* Area fills */}
        {showArea && datasets.map((ds, i) => (
          <path key={`area-${i}`} d={createAreaPath(ds.data, 800, height, minY, maxY)} fill={`url(#chart-grad-${i})`} />
        ))}

        {/* Lines */}
        {datasets.map((ds, i) => (
          <path key={`line-${i}`} d={createSmoothPath(ds.data, 800, height, minY, maxY)} fill="none" stroke={ds.color} strokeWidth={strokeWidth} strokeLinecap="round" />
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="emerald-chart-xaxis">
        {labels.map((label, i) => (
          <span key={i} className="emerald-chart-xlabel">{label}</span>
        ))}
      </div>

      {/* Legend */}
      <div className="emerald-chart-legend">
        {datasets.map((ds, i) => (
          <span key={i} className="emerald-chart-legend-item">
            <span className="emerald-chart-legend-dot" style={{ background: ds.color }}></span>
            {ds.label}
          </span>
        ))}
      </div>

      <style>{`
        .emerald-chart { position: relative; }
        .emerald-chart-svg { width: 100%; height: ${height}px; display: block; }
        .emerald-chart-xaxis { display: flex; justify-content: space-between; margin-top: 8px; padding: 0 10px; }
        .emerald-chart-xlabel { font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary, #86948a); text-transform: uppercase; letter-spacing: 0.5px; }
        .emerald-chart-legend { display: flex; gap: 20px; margin-top: 12px; flex-wrap: wrap; }
        .emerald-chart-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary, #86948a); }
        .emerald-chart-legend-dot { width: 10px; height: 10px; border-radius: 50%; }
      `}</style>
    </div>
  );
}
