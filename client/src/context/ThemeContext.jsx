import { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'dark',
    name: 'Solaris',
    title: 'Solaris (Earth & Sunlit Clay)',
    icon: '🍂',
    previewColor: '#283618',
    accentColor: '#606c38',
    secondaryColor: '#dda15e',
    highlightColor: '#bc6c25',
    skyColor: '#fefae0',
    palette: ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'],
    paletteShades: {
      olive_leaf: { DEFAULT: '#606c38', 100: '#13160b', 200: '#262b16', 300: '#394121', 400: '#4c562c', 500: '#606c38', 600: '#88994f', 700: '#a9b876', 800: '#c5d0a3', 900: '#e2e7d1' },
      black_forest: { DEFAULT: '#283618', 100: '#080b05', 200: '#101509', 300: '#18200e', 400: '#1f2a13', 500: '#283618', 600: '#547133', 700: '#80ac4d', 800: '#aac987', 900: '#d5e4c3' },
      cornsilk: { DEFAULT: '#fefae0', 100: '#5d5103', 200: '#baa206', 300: '#f8dc27', 400: '#fbeb84', 500: '#fefae0', 600: '#fefbe7', 700: '#fefced', 800: '#fffdf3', 900: '#fffef9' },
      sunlit_clay: { DEFAULT: '#dda15e', 100: '#34210b', 200: '#684216', 300: '#9d6321', 400: '#d1842c', 500: '#dda15e', 600: '#e4b57f', 700: '#ebc79f', 800: '#f1dabf', 900: '#f8ecdf' },
      copperwood: { DEFAULT: '#bc6c25', 100: '#251507', 200: '#4b2b0f', 300: '#704016', 400: '#96561e', 500: '#bc6c25', 600: '#d98840', 700: '#e3a570', 800: '#ecc3a0', 900: '#f6e1cf' },
    },
    desc: 'Botanical olive, black forest, cornsilk & sunlit copperwood',
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
