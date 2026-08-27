import React from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('system');
    } else {
      setTheme('dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] hover:text-white transition-colors flex items-center justify-center relative"
      title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
    >
      {theme === 'dark' ? (
        <Moon className="w-3.5 h-3.5 text-[#58a6ff]" />
      ) : theme === 'light' ? (
        <Sun className="w-3.5 h-3.5 text-[#d29922]" />
      ) : (
        <Laptop className="w-3.5 h-3.5 text-[#3fb950]" />
      )}
    </button>
  );
};
