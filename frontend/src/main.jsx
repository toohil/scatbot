import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Short-lived click feedback for buttons: adds `.pressed` class briefly on pointer/keyboard activation
if (!window.__buttonPressInstalled) {
  const addPressed = (el) => el && el.classList && el.classList.add('pressed');
  const removePressed = (el) => el && el.classList && setTimeout(() => el.classList.remove('pressed'), 160);

  function onPointerDown(e) {
    const btn = e.target.closest('button, [role="button"]');
    if (btn) addPressed(btn);
  }
  function onPointerUp(e) {
    const btn = e.target.closest('button, [role="button"]');
    if (btn) removePressed(btn);
  }
  function onKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      const btn = e.target.closest('button, [role="button"]');
      if (btn) addPressed(btn);
    }
  }
  function onKeyUp(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      const btn = e.target.closest('button, [role="button"]');
      if (btn) removePressed(btn);
    }
  }

  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  window.__buttonPressInstalled = true;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
