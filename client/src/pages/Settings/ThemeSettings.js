import React, { useState, useEffect } from 'react';
import { SketchPicker } from 'react-color';
import { Chessboard } from 'react-chessboard';

// Default theme options
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
  custom: {
    name: 'Custom',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    pieces: 'classic'
  }
};

// Piece style options
const PIECE_STYLES = ['classic', 'modern', 'fantasy', '8-bit'];

const ThemeSettings = () => {
  const [selectedTheme, setSelectedTheme] = useState('classic');
  const [customTheme, setCustomTheme] = useState({
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    pieces: 'classic',
  });
  const [colorPickerOpen, setColorPickerOpen] = useState({ light: false, dark: false });
  const [savedThemes, setSavedThemes] = useState({});
  const [saveThemeName, setSaveThemeName] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load saved themes from localStorage
  useEffect(() => {
    const storedThemes = localStorage.getItem('chessmate_themes');
    if (storedThemes) {
      try {
        setSavedThemes(JSON.parse(storedThemes));
      } catch (error) {
        console.error('Error loading saved themes:', error);
        // Fallback to default themes if there's an error
        setSavedThemes({});
      }
    }

    // Load active theme
    const activeTheme = localStorage.getItem('chessmate_active_theme');
    if (activeTheme) {
      setSelectedTheme(activeTheme);
      
      // If it's a custom theme, load the custom settings
      if (activeTheme === 'custom') {
        const customThemeSettings = localStorage.getItem('chessmate_custom_theme');
        if (customThemeSettings) {
          try {
            setCustomTheme(JSON.parse(customThemeSettings));
          } catch (error) {
            console.error('Error loading custom theme:', error);
          }
        }
      }
    }
  }, []);

  // Apply the theme
  const applyTheme = (themeKey) => {
    setSelectedTheme(themeKey);
    
    // Save the active theme selection to localStorage
    localStorage.setItem('chessmate_active_theme', themeKey);
    
    // If it's a custom saved theme, set the custom colors
    if (themeKey !== 'custom' && savedThemes[themeKey]) {
      setCustomTheme(savedThemes[themeKey]);
    } else if (themeKey !== 'custom') {
      // Set colors based on predefined theme
      setCustomTheme({
        lightSquare: DEFAULT_THEMES[themeKey].lightSquare,
        darkSquare: DEFAULT_THEMES[themeKey].darkSquare,
        pieces: DEFAULT_THEMES[themeKey].pieces
      });
    }
    
    // If it's the custom theme, save the custom settings
    if (themeKey === 'custom') {
      localStorage.setItem('chessmate_custom_theme', JSON.stringify(customTheme));
    }
    
    // Show success message
    setMessage({
      type: 'success',
      text: 'Theme applied successfully!'
    });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3000);
  };

  // Save custom theme
  const saveCustomTheme = () => {
    if (!saveThemeName.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter a name for your custom theme'
      });
      return;
    }

    // Create new saved themes object
    const newSavedThemes = {
      ...savedThemes,
      [saveThemeName]: {
        ...customTheme,
        name: saveThemeName
      }
    };

    // Save to localStorage
    localStorage.setItem('chessmate_themes', JSON.stringify(newSavedThemes));
    setSavedThemes(newSavedThemes);
    setSaveThemeName('');
    
    setMessage({
      type: 'success',
      text: 'Custom theme saved successfully!'
    });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3000);
  };

  // Delete a saved theme
  const deleteTheme = (themeKey) => {
    const newSavedThemes = { ...savedThemes };
    delete newSavedThemes[themeKey];
    
    localStorage.setItem('chessmate_themes', JSON.stringify(newSavedThemes));
    setSavedThemes(newSavedThemes);
    
    // If currently selected theme is deleted, switch to classic
    if (selectedTheme === themeKey) {
      setSelectedTheme('classic');
      localStorage.setItem('chessmate_active_theme', 'classic');
    }
    
    setMessage({
      type: 'success',
      text: 'Theme deleted successfully!'
    });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3000);
  };

  // Current theme to display on the board
  const currentTheme = selectedTheme === 'custom' ? 
    customTheme : 
    (savedThemes[selectedTheme] || DEFAULT_THEMES[selectedTheme]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Theme Settings</h2>
      
      {message.text && (
        <div className={`p-4 mb-4 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 
          message.type === 'error' ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Board Preview */}
        <div className="bg-white p-4 rounded-md shadow-md">
          <h3 className="text-lg font-semibold mb-4">Board Preview</h3>
          <div className="mb-4">
            <Chessboard
              id="theme-preview"
              position="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              boardWidth={350}
              areArrowsAllowed={false}
              customDarkSquareStyle={{ backgroundColor: currentTheme.darkSquare }}
              customLightSquareStyle={{ backgroundColor: currentTheme.lightSquare }}
            />
          </div>
          <button
            onClick={() => applyTheme(selectedTheme)}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Apply Theme
          </button>
        </div>

        {/* Theme Selection */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Theme</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Default themes */}
              {Object.keys(DEFAULT_THEMES).map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedTheme(key)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedTheme === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {DEFAULT_THEMES[key].name}
                </button>
              ))}

              {/* Saved custom themes */}
              {Object.keys(savedThemes).map(key => (
                <button
                  key={key}
                  onClick={() => setSelectedTheme(key)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedTheme === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{savedThemes[key].name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTheme(key);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Theme Options */}
          {selectedTheme === 'custom' && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4">Customize Theme</h3>
              
              {/* Light Square Color */}
              <div className="mb-3">
                <label className="block text-gray-700 font-medium mb-2">
                  Light Square Color
                </label>
                <div className="flex items-center">
                  <div 
                    className="w-10 h-10 rounded border cursor-pointer mr-2"
                    style={{ backgroundColor: customTheme.lightSquare }}
                    onClick={() => setColorPickerOpen({ ...colorPickerOpen, light: !colorPickerOpen.light })}
                  ></div>
                  <span>{customTheme.lightSquare}</span>
                </div>
                {colorPickerOpen.light && (
                  <div className="mt-2">
                    <SketchPicker
                      color={customTheme.lightSquare}
                      onChange={(color) => setCustomTheme({ ...customTheme, lightSquare: color.hex })}
                    />
                  </div>
                )}
              </div>

              {/* Dark Square Color */}
              <div className="mb-3">
                <label className="block text-gray-700 font-medium mb-2">
                  Dark Square Color
                </label>
                <div className="flex items-center">
                  <div 
                    className="w-10 h-10 rounded border cursor-pointer mr-2"
                    style={{ backgroundColor: customTheme.darkSquare }}
                    onClick={() => setColorPickerOpen({ ...colorPickerOpen, dark: !colorPickerOpen.dark })}
                  ></div>
                  <span>{customTheme.darkSquare}</span>
                </div>
                {colorPickerOpen.dark && (
                  <div className="mt-2">
                    <SketchPicker
                      color={customTheme.darkSquare}
                      onChange={(color) => setCustomTheme({ ...customTheme, darkSquare: color.hex })}
                    />
                  </div>
                )}
              </div>

              {/* Piece Style */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Piece Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PIECE_STYLES.map(style => (
                    <button
                      key={style}
                      onClick={() => setCustomTheme({ ...customTheme, pieces: style })}
                      className={`p-2 rounded-lg border transition-all ${
                        customTheme.pieces === style
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Custom Theme */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Save Custom Theme
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={saveThemeName}
                    onChange={(e) => setSaveThemeName(e.target.value)}
                    placeholder="Enter theme name"
                    className="flex-grow px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={saveCustomTheme}
                    disabled={!saveThemeName.trim()}
                    className="px-4 py-2 bg-green-500 text-white rounded-r-md hover:bg-green-600 transition-colors disabled:bg-gray-300"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
