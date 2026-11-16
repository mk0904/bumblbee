import { useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { Download, X } from 'lucide-react';
import { fmt, duration, date } from '../lib/format.js';
import { Badge } from '../components/ui.jsx';
import { WorldMap } from '../components/WorldMap.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';

export function Report({ report, onClose }) {
  const { flight, samples, summary, commands, alerts } = report;
  const [tab, setTab] = useState('overview'),
    [metric, setMetric] = useState('altitude');
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight-${flight.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Modal title="Flight report" onClose={onClose}>
      <section className="report-modal">
        <div className="report-top">
          <div>
            {flight.adapter === 'demo' && <span className="report-demo-tag">Demo flight</span>}
            <h2>{flight.snapshot.name}</h2>
            <p>
              {date(flight.startedAt)}
            </p>
          </div>
          <button className="icon-button" aria-label="Close report" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="report-status">
          <Badge tone={flight.state === 'COMPLETED' ? 'green' : 'amber'}>{flight.state}</Badge>
          <span>{flight.reason ?? (summary.complete ? 'Flight ended' : 'Recording incomplete or in progress')}</span>
          <button className="text-button" onClick={download}>
            <Download size={14} /> Download report
          </button>
        </div>
        <div className="report-metrics">
          {[
            ['Duration', duration(summary.duration)],
            ['Distance', `${fmt(summary.distance)} m`],
            ['Max altitude', `${fmt(summary.maxAltitude)} m`],
            ['Battery used (estimated)', `${fmt(summary.batteryUsed)}%`],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="report-tabs" role="group" aria-label="Report sections">
          {['overview', 'commands', 'alerts'].map((section) => (
            <button
              key={section}
              className={tab === section ? 'selected' : ''}
              onClick={() => setTab(section)}
              aria-pressed={tab === section}
            >
              {section === 'alerts'
                ? `Incidents (${alerts.length})`
                : section === 'commands'
                  ? `Commands (${commands.length})`
                  : 'Overview'}
            </button>
          ))}
        </div>
        {tab === 'overview' && (
          <div className="report-grid">
            <WorldMap
              waypoints={flight.snapshot.waypoints}
              trail={samples}
              sample={samples.at(-1)}
              compact
            />
            <div>
              <div className="report-chart-tabs">
                <button
                  className={metric === 'altitude' ? 'selected' : ''}
                  onClick={() => setMetric('altitude')}
                >
                  Altitude
                </button>
                <button
                  className={metric === 'battery' ? 'selected' : ''}
                  onClick={() => setMetric('battery')}
                >
                  Battery
                </button>
              </div>
              <TelemetryChart samples={samples} metric={metric} height={180} />
            </div>
          </div>
        )}
        {(!summary.complete || summary.gaps > 0) && <div className="report-integrity-warning" role="status">{!summary.complete ? 'This recording is incomplete.' : ''} {summary.gaps > 0 ? `${summary.gaps} telemetry gaps detected.` : ''}</div>}
        {tab === 'commands' && (
          <div className="report-records">
            <h3>Command timeline</h3>
            <div className="command-timeline">
              {commands.map((c) => (
                <div key={c.id}>
                  <span>{c.action.replaceAll('_', ' ')}</span>
                  <Badge tone={c.status === 'COMPLETED' ? 'green' : 'amber'}>{c.status}</Badge>
                  <small>{date(c.createdAt)}</small>
                  {c.error && <p className="command-error">{c.error}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'alerts' && (
          <div className="report-records">
            <h3>Flight incidents</h3>
            {!alerts.length && <p className="incident-line">No incidents recorded.</p>}
            {alerts.map((a) => (
              <p className="incident-line" key={a.id}>
                {a.title} · {a.status} · {a.message}
              </p>
            ))}
          </div>
        )}
      </section>
    </Modal>
  );
}
