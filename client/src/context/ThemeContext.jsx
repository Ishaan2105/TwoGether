import { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'dark',
    name: 'Botanica',
    title: 'Botanica (Olive Leaf & Black Forest)',
    icon: '🌿',
    previewColor: '#a9b876',
    accentColor: '#283618',
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
    title: 'Pearl (Rose Sherbet & Velvet Plum)',
    icon: '🌸',
    previewColor: '#a53860',
    accentColor: '#ffa5ab',
    secondaryColor: '#da627d',
    highlightColor: '#450920',
    skyColor: '#f9dbbd',
    palette: ['#f9dbbd', '#ffa5ab', '#da627d', '#a53860', '#450920'],
    paletteShades: {
      pale_apricot: { DEFAULT: '#f9dbbd', 100: '#321903', 200: '#643206', 300: '#964a09', 400: '#c8630c', 500: '#f9dbbd', 600: '#fae2ca', 700: '#fbe9d7', 800: '#fcf0e5', 900: '#fef8f2' },
      rose_sherbet: { DEFAULT: '#ffa5ab', 100: '#330005', 200: '#660009', 300: '#99000e', 400: '#cc0013', 500: '#ffa5ab', 600: '#ffb7bc', 700: '#ffc9cd', 800: '#ffdbdd', 900: '#ffedee' },
      rose_blush: { DEFAULT: '#da627d', 100: '#2b0710', 200: '#560e20', 300: '#811530', 400: '#ac1c40', 500: '#da627d', 600: '#e18197', 700: '#e9a1b1', 800: '#f0c0cb', 900: '#f8e0e5' },
      rosewood: { DEFAULT: '#a53860', 100: '#210713', 200: '#420e26', 300: '#631539', 400: '#841c4d', 500: '#a53860', 600: '#b76080', 700: '#c988a0', 800: '#dbafbf', 900: '#edd7df' },
      midnight_plum: { DEFAULT: '#450920', 100: '#0e0206', 200: '#1b040d', 300: '#290513', 400: '#37071a', 500: '#450920', 600: '#6a3a4d', 700: '#8f6c79', 800: '#b59da6', 900: '#dacfd2' },
    },
    desc: 'Pale apricot, rose sherbet, blush, deep rosewood & midnight plum',
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
