import React, { useRef, useEffect } from 'react';
import { animate, utils } from 'animejs';
import { useTheme } from './ThemeProvider';
import MoonIcon from '../icons/MoonIcon';
import SunIcon from '../icons/SunIcon';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const moonRef = useRef<SVGSVGElement>(null!);
  const sunRef = useRef<SVGSVGElement>(null!);

  // play animation whenever theme changes
  useEffect(() => {
    if (!moonRef.current || !sunRef.current) return;

    const isDark = theme === 'dark';

    // Set initial state instantly using utils.set (v4)
    utils.set(moonRef.current, { opacity: isDark ? 0 : 1, rotate: isDark ? -180 : 0 });
    utils.set(sunRef.current, { opacity: isDark ? 1 : 0, rotate: isDark ? 0 : 180 });

    animate(moonRef.current, {
      opacity: isDark ? [1, 0] : [0, 1],
      rotate: isDark ? [-180, -360] : [-360, 0],
      duration: 400,
      easing: 'easeInOutQuad'
    });

    animate(sunRef.current, {
      opacity: isDark ? [0, 1] : [1, 0],
      rotate: isDark ? [0, 180] : [180, 360],
      duration: 400,
      easing: 'easeInOutQuad'
    });
  }, [theme]);

  return (
    <button
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-full bg-[var(--control-bg)] hover:opacity-80 transition-colors overflow-hidden cursor-pointer"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Moon (shown in light mode) */}
      <MoonIcon ref={moonRef} className="h-5 w-5 text-[var(--control-icon)] absolute inset-0 m-auto" />

      {/* Sun (shown in dark mode) */}
      <SunIcon ref={sunRef} className="h-5 w-5 text-yellow-400 absolute inset-0 m-auto" />
    </button>
  );
}; 