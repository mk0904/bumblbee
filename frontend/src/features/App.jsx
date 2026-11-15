import { useEffect, useState, useCallback } from 'react';
import { Compass } from 'lucide-react';
import { api, setCsrf } from '../lib/api.js';
import { Pairing } from './Pairing.jsx';
import { Workspace } from './Workspace.jsx';

export function App() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  const logout = useCallback(() => {
    setUser(null);
    setCsrf('');
  }, []);
  useEffect(() => {
    api('/auth/me')
      .then((result) => {
        setUser(result.user);
        setCsrf(result.csrf);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="loading-page">
        <Compass size={35} />
        <p>Opening ground station…</p>
      </div>
    );
  return user ? <Workspace user={user} onLogout={logout} /> : <Pairing onLogin={setUser} />;
}
