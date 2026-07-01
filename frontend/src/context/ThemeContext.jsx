import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  isDayMode: false,
  themeMode: 'dark',
  setThemeMode: () => {},
  toggleTheme: () => {}
});

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('dd-theme-mode') || 'dark';
  });

  const [isDayMode, setIsDayMode] = useState(false);

  useEffect(() => {
    const handleThemeChange = () => {
      let activeTheme = themeMode;
      if (themeMode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        activeTheme = prefersDark ? 'dark' : 'light';
      }

      const dayMode = activeTheme === 'light';
      setIsDayMode(dayMode);

      document.documentElement.setAttribute('data-theme', dayMode ? 'day' : 'night');
    };

    handleThemeChange();

    localStorage.setItem('dd-theme-mode', themeMode);

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => {
        setIsDayMode(!e.matches);
        document.documentElement.setAttribute('data-theme', e.matches ? 'night' : 'day');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  return (
    <ThemeContext.Provider value={{ isDayMode, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
