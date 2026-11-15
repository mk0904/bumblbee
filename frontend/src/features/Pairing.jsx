import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Clock3, Compass, Radio, ShieldCheck } from 'lucide-react';
import { api, setCsrf } from '../lib/api.js';
import { WorldMap } from '../components/WorldMap.jsx';

export function Pairing({ onLogin }) {
  const [code, setCode] = useState(''),
    [demo, setDemo] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/auth/config')
      .then((c) => setDemo(c.demo))
      .catch(() => setError('Backend unavailable. Start npm run dev:backend.'));
  }, []);
  const pair = async (event, local = false) => {
    event?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api(local ? '/pairing/demo' : '/pairing/claim', {
        method: 'POST',
        body: local ? {} : { code },
      });
      setCsrf(result.csrf);
      onLogin(result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pairing-page">
      <div className="pairing-brand">
        <Compass size={22} />
        <strong>
          bumbl<span>.bee</span>
        </strong>
        <span>GROUND STATION</span>
      </div>
      <div className="pairing-layout">
        <div className="pairing-visual">
          <div className="pairing-visual-label">
            <span className="pulse-dot" /> MISSION OPERATIONS / LOCAL WORLD
          </div>
          <WorldMap
            waypoints={[
              { x: 24, y: 25 },
              { x: -20, y: 25 },
              { x: -20, y: -15 },
            ]}
            compact
          />
          <div className="pairing-copy">
            <span className="eyebrow">CONNECTED BY DESIGN</span>
            <h1>
              Your drone.
              <br />
              One clear connection.
            </h1>
            <p>
              Plan missions, follow telemetry and review every flight.
              <br />
              One ground station, from start to touchdown.
            </p>
          </div>
          <span className="pairing-caption">ILLUSTRATIVE ROUTE · NO LIVE DRONE CONNECTED</span>
        </div>
        <section className="pairing-card">
          <span className="pairing-icon">
            <Radio size={25} />
          </span>
          <span className="eyebrow">PAIR YOUR BRIDGE</span>
          <h2>Ready when you are.</h2>
          <p>Run the Python bridge, then enter its four-character code. No account required.</p>
          <form onSubmit={pair}>
            <label htmlFor="pair-code">BRIDGE CODE</label>
            <input
              id="pair-code"
              className="pair-code-input"
              maxLength={4}
              minLength={4}
              pattern="[A-Za-z0-9]{4}"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="A7K2"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 4),
                )
              }
              required
            />
            <span className="pairing-hint">
              <Clock3 size={12} /> Codes expire in 2 minutes and work once.
            </span>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy || code.length !== 4}>
              Connect to drone <ArrowRight size={15} />
            </button>
          </form>
          {demo && (
            <div className="pairing-demo">
              <span>JUST EXPLORING?</span>
              <button
                className="button secondary full"
                disabled={busy}
                onClick={(e) => pair(e, true)}
              >
                Open demo workspace <ArrowUpRight size={14} />
              </button>
              <p>Synthetic data. No Webots connection required.</p>
            </div>
          )}
          <div className="pairing-security">
            <ShieldCheck size={14} />
            <span>
              The short code establishes a protected control session. Your bridge credential stays
              on its host.
            </span>
          </div>
        </section>
      </div>
      <footer className="pairing-footer">
        <span>BUMBL.BEE / DRONE MISSION CONTROL</span>
        <span>PLAN. CONNECT. UNDERSTAND.</span>
      </footer>
    </div>
  );
}
