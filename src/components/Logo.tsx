import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: 'dark' | 'light';
  subtitle?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  textColor = 'dark',
  subtitle,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 32, text: 'text-base', sub: 'text-[10px]' },
    md: { icon: 42, text: 'text-lg', sub: 'text-xs' },
    lg: { icon: 54, text: 'text-xl', sub: 'text-xs' },
    xl: { icon: 68, text: 'text-2xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Blue and Gold Graduation Cap Logo */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-2 shadow-md ring-1 ring-amber-400/40"
        style={{ width: currentSize.icon + 12, height: currentSize.icon + 12 }}
      >
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          {/* Subtle Golden Crest Ring */}
          <circle cx="32" cy="32" r="30" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="3 3" />
          
          {/* Mortarboard Diamond Top (Deep Royal Blue with Gold Trim) */}
          <polygon
            points="32,10 60,23 32,36 4,23"
            fill="url(#blueGrad)"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Under cap skull skullcap (Navy Blue) */}
          <path
            d="M17 29.5V40C17 46 23.7 51 32 51C40.3 51 47 46 47 40V29.5"
            fill="#0f2952"
            stroke="#fbbf24"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />

          {/* Golden Cap Ribbon Rim */}
          <path
            d="M17 38C20.5 42 26 44 32 44C38 44 43.5 42 47 38"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Center Button on Cap */}
          <circle cx="32" cy="23" r="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

          {/* Golden Tassel Ribbon hanging to side */}
          <path
            d="M32 23 C22 25, 14 30, 14 38 L14 43"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Tassel Fringe (Golden Brush) */}
          <path
            d="M12 43 C12 43, 11 49, 14 50 C17 49, 16 43, 16 43 Z"
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth="1"
          />

          {/* Laurel Accent Leaf Left */}
          <path
            d="M8 35 C6 30, 8 26, 11 25"
            stroke="#f59e0b"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          {/* Laurel Accent Leaf Right */}
          <path
            d="M56 35 C58 30, 56 26, 53 25"
            stroke="#f59e0b"
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="blueGrad" x1="4" y1="10" x2="60" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e3a8a" />
              <stop offset="0.5" stopColor="#172554" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-institutional tracking-wider font-bold ${currentSize.text} ${
              textColor === 'light' ? 'text-white' : 'text-slate-900'
            }`}
          >
            ARCHNA ACADEMY
          </span>
          <span
            className={`font-medium tracking-wide uppercase ${currentSize.sub} ${
              textColor === 'light' ? 'text-amber-300' : 'text-blue-900 font-semibold'
            }`}
          >
            {subtitle || 'Coaching Management Portal'}
          </span>
        </div>
      )}
    </div>
  );
};
