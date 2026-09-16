import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function ThemeSwitcher() {
  const { theme, setTheme, THEMES } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentThemeObj = THEMES.find((t) => t.id === theme) || THEMES[0];

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTheme = (themeId) => {
    setTheme(themeId);
    setIsOpen(false);
  };

  return (
    <div className="theme-switcher" ref={dropdownRef}>
      <button
        type="button"
        className="theme-switcher__btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Current theme: ${currentThemeObj.name}. Click to change theme.`}
        title="Change theme"
      >
        <span className="theme-switcher__icon" aria-hidden="true">
          {currentThemeObj.icon}
        </span>
        <span className="theme-switcher__name">{currentThemeObj.name}</span>
        <span
          className="theme-switcher__accent-dot"
          style={{ backgroundColor: currentThemeObj.accentColor }}
          aria-hidden="true"
        />
        <span className={`theme-switcher__chevron ${isOpen ? 'theme-switcher__chevron--open' : ''}`}>
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="theme-switcher__dropdown" role="menu" aria-label="Theme selection">
          <div className="theme-switcher__dropdown-header">
            <span className="theme-switcher__dropdown-title">APPEARANCE & THEME</span>
            <span className="theme-switcher__dropdown-count">4 Themes</span>
          </div>

          <div className="theme-switcher__options">
            {THEMES.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitem"
                  className={`theme-option ${isSelected ? 'theme-option--active' : ''}`}
                  onClick={() => handleSelectTheme(t.id)}
                >
                  <div
                    className="theme-option__swatch"
                    style={{
                      backgroundColor: t.previewColor,
                      borderColor: t.accentColor,
                    }}
                  >
                    <span
                      className="theme-option__swatch-accent"
                      style={{ backgroundColor: t.accentColor }}
                    />
                  </div>

                  <div className="theme-option__info">
                    <div className="theme-option__row">
                      <span className="theme-option__icon">{t.icon}</span>
                      <strong className="theme-option__name">{t.name}</strong>
                      {t.id === 'dark' && <span className="theme-option__tag">DEFAULT</span>}
                    </div>
                    <span className="theme-option__desc">{t.desc}</span>
                  </div>

                  {isSelected && (
                    <span className="theme-option__check" aria-label="Selected">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
