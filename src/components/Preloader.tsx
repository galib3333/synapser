'use client';

import { useEffect, useState } from 'react';

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setVisible(false);
            onComplete();
          }, 400);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] bg-bg-primary flex flex-col items-center justify-center transition-opacity duration-700 ${
        progress >= 100 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="noise-overlay" />

      <div className="flex flex-col items-center gap-8">
        <svg
          viewBox="0 0 48 48"
          className="w-14 h-14 text-accent"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <circle cx="24" cy="24" r="20" />
          <ellipse cx="24" cy="24" rx="10" ry="20" />
          <line x1="4" y1="24" x2="44" y2="24" />
          <line x1="24" y1="4" x2="24" y2="44" />
          <path d="M8 14 Q24 12 40 14" />
          <path d="M8 34 Q24 36 40 34" />
        </svg>

        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-[1px] bg-accent/10 overflow-hidden">
            <div
              className="h-full bg-accent/80 transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-accent/40 tracking-[0.3em] uppercase">
            {Math.min(Math.round(progress), 100)}%
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 mt-4">
          <p className="text-xs text-accent/30 font-mono tracking-wider">
            Mapping every corner of the Earth
          </p>
        </div>
      </div>
    </div>
  );
}
