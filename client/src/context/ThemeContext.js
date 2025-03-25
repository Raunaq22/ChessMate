import React, { createContext, useState, useContext, useEffect } from 'react';

// Default themes from ThemeSettings - keeping consistent
const DEFAULT_THEMES = {
  classic: {
    name: 'Classic',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    pieces: 'classic'
  },
  modern: {
    name: 'Modern',
    lightSquare: '#eeeed2',
    darkSquare: '#769656',
    pieces: 'modern'
  },
  midnight: {
    name: 'Midnight',
    lightSquare: '#dee3e6',
    darkSquare: '#8ca2ad',
    pieces: 'classic'
  },
  // Add our custom theme
  chessmate: {
    name: 'Chessmate',
    lightSquare: '#FDF0D5', // chess-light
    darkSquare: '#A77E58', // chess-hover
    pieces: 'classic'
  },
  // Add the new themes
  blue: {
    name: 'Blue',
    lightSquare: '#cdd7e9',
    darkSquare: '#5a80b0',
    pieces: 'classic'
  },
  wood: {
    name: 'Wood',
    lightSquare: '#E4D2B4',
    darkSquare: '#9E6B55',
    pieces: 'classic'
  },
  emerald: {
    name: 'Emerald',
    lightSquare: '#BDDFD0',
    darkSquare: '#116340',
    pieces: 'classic'
  }
};

// Create the context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEMES.chessmate);
  const [themeKey, setThemeKey] = useState('chessmate');

  // Load theme from localStorage on initial render
  useEffect(() => {
    const loadTheme = () => {
      try {
        // Get active theme key
        const activeThemeKey = localStorage.getItem('chessmate_active_theme') || 'chessmate';
        setThemeKey(activeThemeKey);
        
        // Check for custom theme settings
        const themeSettings = localStorage.getItem('chessmate_theme_settings');
        if (themeSettings) {
          try {
            const parsedSettings = JSON.parse(themeSettings);
            // If we have settings that match the active theme, use those
            if (parsedSettings && typeof parsedSettings === 'object') {
              setCurrentTheme(parsedSettings);
              return; // Exit early since we've loaded settings
            }
          } catch (err) {
            console.error("Error parsing theme settings:", err);
          }
        }
        
        // Get theme data based on key
        if (activeThemeKey === 'custom') {
          // Handle custom theme
          const customThemeData = localStorage.getItem('chessmate_custom_theme');
          if (customThemeData) {
            setCurrentTheme(JSON.parse(customThemeData));
          } else {
            setCurrentTheme(DEFAULT_THEMES.chessmate);
          }
        } else if (DEFAULT_THEMES[activeThemeKey]) {
          // Handle default theme
          setCurrentTheme(DEFAULT_THEMES[activeThemeKey]);
        } else {
          // Handle saved custom theme
          const savedThemes = localStorage.getItem('chessmate_themes');
          if (savedThemes) {
            const themes = JSON.parse(savedThemes);
            if (themes[activeThemeKey]) {
              setCurrentTheme(themes[activeThemeKey]);
            } else {
              setCurrentTheme(DEFAULT_THEMES.chessmate);
            }
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setCurrentTheme(DEFAULT_THEMES.chessmate);
      }
    };

    loadTheme();

    // Add event listener for storage changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === 'chessmate_active_theme' || 
          e.key === 'chessmate_custom_theme' ||
          e.key === 'chessmate_themes' ||
          e.key === 'chessmate_theme_settings') {
        loadTheme();
      }
    });

    return () => {
      window.removeEventListener('storage', loadTheme);
    };
  }, []);

  // Update the theme settings
  const updateTheme = (newThemeKey) => {
    try {
      setThemeKey(newThemeKey);
      
      // Save the active theme key to localStorage
      localStorage.setItem('chessmate_active_theme', newThemeKey);
      
      // First check if we have theme settings saved
      const themeSettings = localStorage.getItem('chessmate_theme_settings');
      if (themeSettings) {
        try {
          const parsedSettings = JSON.parse(themeSettings);
          if (parsedSettings && typeof parsedSettings === 'object') {
            setCurrentTheme(parsedSettings);
            return; // Exit early since we've applied settings
          }
        } catch (err) {
          console.error("Error parsing theme settings:", err);
        }
      }
      
      if (newThemeKey === 'custom') {
        try {
          const customThemeData = localStorage.getItem('chessmate_custom_theme');
          if (customThemeData) {
            setCurrentTheme(JSON.parse(customThemeData));
          }
        } catch (error) {
          console.error('Error updating to custom theme:', error);
        }
      } else if (DEFAULT_THEMES[newThemeKey]) {
        setCurrentTheme(DEFAULT_THEMES[newThemeKey]);
      } else {
        try {
          const savedThemes = localStorage.getItem('chessmate_themes');
          if (savedThemes) {
            const themes = JSON.parse(savedThemes);
            if (themes[newThemeKey]) {
              setCurrentTheme(themes[newThemeKey]);
            }
          }
        } catch (error) {
          console.error('Error updating to saved theme:', error);
        }
      }
    } catch (error) {
      console.error('Error in updateTheme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, themeKey, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useChessTheme = () => {
  return useContext(ThemeContext);
};
