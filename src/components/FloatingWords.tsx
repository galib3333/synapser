'use client';

import { useEffect, useState } from 'react';

const WORDS = [
  'explore', 'wander', 'discover', 'journey', 'horizon',
  'wonder', 'passage', 'terrain', 'atlas', 'roam',
  'venture', 'quest', 'nomad', 'trail', 'haven',
  'odyssey', 'trek', 'unseen', 'terrain', 'meridian',
];

export default function FloatingWords({ visible }: { visible: boolean }) {
  const [positions, setPositions] = useState<
    Array<{ word: string; x: number; y: number; duration: number; delay: number; size: number }>
  >([]);

  useEffect(() => {
    const generated = WORDS.slice(0, 15).map((word, i) => ({
      word,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 4,
      size: 0.7 + Math.random() * 0.6,
    }));
    setPositions(generated);
  }, []);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-5 pointer-events-none overflow-hidden">
      {positions.map((p, i) => (
        <div
          key={i}
          className="absolute font-display italic text-accent/15 floating-word select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}rem`,
            '--duration': `${p.duration}s`,
            '--delay': `${p.delay}s`,
          } as React.CSSProperties}
        >
          {p.word}
        </div>
      ))}
    </div>
  );
}
