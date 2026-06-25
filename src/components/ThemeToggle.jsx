import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export default function ThemeToggle({ variant = 'compact', className = '' }) {
  const { cycleTheme, resolvedTheme, setTheme, theme } = useTheme();
  const activeOption = THEME_OPTIONS.find(option => option.value === theme) || THEME_OPTIONS[0];
  const ActiveIcon = activeOption.Icon;

  if (variant === 'segmented') {
    return (
      <div className={`theme-toggle theme-toggle-segmented ${className}`} role="group" aria-label="Theme preference">
        {THEME_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            className={theme === option.value ? 'is-active' : ''}
            onClick={() => setTheme(option.value)}
            aria-pressed={theme === option.value}
            title={`${option.label} theme`}
          >
            <option.Icon size={15} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`theme-toggle theme-toggle-compact ${className}`}
      onClick={cycleTheme}
      aria-label={`Theme: ${activeOption.label}. Current display is ${resolvedTheme}.`}
      title={`Theme: ${activeOption.label} (${resolvedTheme})`}
    >
      <ActiveIcon size={16} />
    </button>
  );
}
