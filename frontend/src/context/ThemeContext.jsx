import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ isDayMode: false, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDayMode, setIsDayMode] = useState(() => {
    // Persist last preference
    return localStorage.getItem('dd-theme') === 'day';
  });

  const toggleTheme = () => setIsDayMode((prev) => !prev);

  useEffect(() => {
    const theme = isDayMode ? 'day' : 'night';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dd-theme', theme);
  }, [isDayMode]);

  return (
    <ThemeContext.Provider value={{ isDayMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
