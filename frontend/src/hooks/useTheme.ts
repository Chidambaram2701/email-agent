import { useEffect } from 'react';

export const useTheme = () => {
  const theme = 'dark';

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    localStorage.setItem('theme', 'dark');
  }, []);

  const toggleTheme = () => {
    // Locked to dark mode
  };

  return { theme, toggleTheme, isDark: true };
};

export default useTheme;
