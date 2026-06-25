import { LayoutDashboard, MessageSquare } from 'lucide-react';

export default function DashboardModeToggle({ value, onChange, className = '' }) {
  const mode = value === 'command' ? 'command' : 'classic';

  return (
    <div className={`dashboard-mode-toggle ${className}`} role="group" aria-label="Dashboard interface mode">
      <button
        type="button"
        className={mode === 'classic' ? 'is-active' : ''}
        onClick={() => onChange('classic')}
        aria-pressed={mode === 'classic'}
        title="Classic dashboard"
      >
        <LayoutDashboard size={15} />
        <span>Classic</span>
      </button>
      <button
        type="button"
        className={mode === 'command' ? 'is-active' : ''}
        onClick={() => onChange('command')}
        aria-pressed={mode === 'command'}
        title="Command dashboard"
      >
        <MessageSquare size={15} />
        <span>Command</span>
      </button>
    </div>
  );
}
