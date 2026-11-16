import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Clock3, LoaderCircle, Radio, ShieldCheck } from 'lucide-react';
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
      <header className="pairing-brand">
        <span className="pairing-monogram">b.</span>
        <strong>
          bumbl<span>.bee</span>
        </strong>
      </header>
      <div className="pairing-layout">
        <section className="pairing-scene" aria-label="Mission control introduction">
          <div className="pairing-story">
            <h1>
              Mission control.
              <br />
              <span>Clearly connected.</span>
            </h1>
            <p>
              Your flight plan, live instruments and onboard view.
              <br />
              One workspace, from takeoff to touchdown.
            </p>
          </div>
          <div className="pairing-yard">
            <WorldMap compact />
          </div>
        </section>
        <section className="pairing-card">
          <span className="pairing-icon">
            <Radio size={25} />
          </span>
          <h2>Connect your drone.</h2>
          <p>Start the Webots bridge and enter the code shown in its terminal.</p>
          <form onSubmit={pair}>
            <div className="pair-code-label">
              <label htmlFor="pair-code">Bridge code</label>
              <span>{code.length} / 4</span>
            </div>
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
              aria-describedby="pair-code-hint"
              disabled={busy}
              required
            />
            <span className="pairing-hint" id="pair-code-hint">
              <Clock3 size={12} /> Codes expire in 2 minutes and work once.
            </span>
            <div className="pairing-error-slot">
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <button className="button primary full" disabled={busy || code.length !== 4}>
              {busy ? (
                <>
                  Connecting <LoaderCircle className="pairing-spinner" size={16} />
                </>
              ) : (
                <>
                  Connect to drone <ArrowRight size={16} />
                </>
              )}
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
            <span>No account needed. Your bridge credential stays on its host.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
