import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [status, setStatus] = useState('Checking backend…');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Backend unavailable');
        return response.json();
      })
      .then(() => setStatus('Backend reachable'))
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('Backend unavailable — start npm run dev:backend');
      });
    return () => controller.abort();
  }, []);
  return <main>
    <h1>Drone Mission Platform</h1>
    <p>Repository foundation</p>
    <p role="status">{status}</p>
    <p>Simulator integration has not been implemented. Next: verify local Webots flight.</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
