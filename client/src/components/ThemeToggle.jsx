import React from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb">{isDark ? <Moon size={13} /> : <Sun size={13} />}</span>
      </span>
    </button>
  )
}
