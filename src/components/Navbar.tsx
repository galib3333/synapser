'use client';

export default function Navbar({ isZoomed, onBack }: { isZoomed: boolean; onBack: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <nav className="flex w-full px-6 sm:px-10 py-5 items-center justify-between">
        <div className="pointer-events-auto">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); if (isZoomed) onBack(); }}
            className="flex items-center gap-3 text-accent hover:opacity-80 transition-opacity"
          >
            <svg
              viewBox="0 0 48 48"
              className="w-8 h-8 md:w-9 md:h-9"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="24" cy="24" r="20" />
              <ellipse cx="24" cy="24" rx="10" ry="20" />
              <line x1="4" y1="24" x2="44" y2="24" />
              <line x1="24" y1="4" x2="24" y2="44" />
              <path d="M8 14 Q24 12 40 14" />
              <path d="M8 34 Q24 36 40 34" />
            </svg>
            <div className="flex items-baseline gap-2 text-[1rem] md:text-[1.2rem] font-bold uppercase tracking-tight leading-[1] font-sans">
              <span>Terra</span>
            </div>
          </a>
        </div>

        <div className="flex items-center gap-6 pointer-events-auto">
          {isZoomed && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 border border-accent/30 px-4 sm:px-5 py-2.5 text-sm uppercase tracking-[0.2em] font-mono text-accent hover:bg-accent hover:text-bg-primary transition-all duration-300"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Globe
            </button>
          )}
            <div className="hidden sm:flex border border-accent/20 px-4 py-2">
            <span className="text-xs uppercase tracking-[0.3em] font-mono text-accent/60">
              001 / Explore
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}
