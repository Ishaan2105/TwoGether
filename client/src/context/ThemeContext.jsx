import { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'dark',
    name: 'Solaris',
    title: 'Solaris (Sunset Abyss)',
    icon: '🌅',
    previewColor: '#023047',
    accentColor: '#219ebc',
    secondaryColor: '#ffb703',
    highlightColor: '#fb8500',
    desc: 'Deep oceanic abyss & amber sunset',
  },
  {
    id: 'pearl',
    name: 'Pearl',
    title: 'Pearl (Light)',
    icon: '⚪',
    previewColor: '#f8fafc',
    accentColor: '#0284c7',
    desc: 'Luminous light aesthetic',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    title: 'Jade (Emerald)',
    icon: '🌲',
    previewColor: '#041c14',
    accentColor: '#10b981',
    desc: 'Deep botanical forest',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    title: 'Crimson (Ruby)',
    icon: '💎',
    previewColor: '#18040a',
    accentColor: '#f43f5e',
    desc: 'Velvet fire & ruby',
  },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('twogether_theme') || localStorage.getItem('duohabit_theme');
      if (saved && THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Unable to read localStorage theme', e);
    }
    return 'dark'; // Default is Solaris (Deep Abyss)
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('twogether_theme', theme);
      localStorage.setItem('duohabit_theme', theme);
    } catch (e) {
      console.warn('Unable to persist localStorage theme', e);
    }
  }, [theme]);

  const toggleNextTheme = () => {
    setTheme((prev) => {
      const idx = THEMES.findIndex((t) => t.id === prev);
      const nextIdx = (idx + 1) % THEMES.length;
      return THEMES[nextIdx].id;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleNextTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
