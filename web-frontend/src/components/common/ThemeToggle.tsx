import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ThemeToggleProps {
  variant?: 'button' | 'pill' | 'switch';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  className = '',
  showLabel = false
}) => {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          isDark
            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 shadow-xs'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-xs'
        } ${className}`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        aria-label="Toggle Theme"
      >
        {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
        {showLabel && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
      </button>
    );
  }

  if (variant === 'switch') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
          isDark ? 'bg-blue-600' : 'bg-slate-300'
        } ${className}`}
        role="switch"
        aria-checked={isDark}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      >
        <span className="sr-only">Toggle theme</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isDark ? 'translate-x-6 bg-slate-900 text-amber-300' : 'translate-x-0 bg-white text-slate-600'
          }`}
        >
          {isDark ? <Moon className="w-3.5 h-3.5 text-amber-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700/80'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
      } ${className}`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-180 duration-200" />
      )}
      {showLabel && (
        <span className="hidden sm:inline text-xs font-semibold">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
