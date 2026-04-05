import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply initial theme before first render to avoid flash
function applyInitialTheme() {
  let theme: 'light' | 'dark' = 'light';
  try {
    const stored = localStorage.getItem('nwl_theme') as 'light' | 'dark' | null;
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  }
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
  if (theme === 'dark') html.classList.add('dark');
}

applyInitialTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
