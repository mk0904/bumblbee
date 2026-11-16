import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DesktopOnly } from './components/DesktopOnly.jsx';
import { App } from './features/App.jsx';
import './styles.css';
import './workspace-theme.css';
import './desktop-layout.css';
import './pairing.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DesktopOnly>
      <App />
    </DesktopOnly>
  </StrictMode>,
);
