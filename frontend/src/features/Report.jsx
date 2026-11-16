import { useState } from 'react';
import { Pagination, usePages } from '../components/Pagination.jsx';
import { Modal } from '../components/Modal.jsx';
import { Download, ShieldCheck, X } from 'lucide-react';
import { fmt, duration, date } from '../lib/format.js';
import { Badge } from '../components/ui.jsx';
import { WorldMap } from '../components/WorldMap.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';

export function Report({ report, onClose }) {
  const { flight, samples, summary, commands, alerts } = report;
  const [tab, setTab] = useState('overview'),
    [metric, setMetric] = useState('altitude');
  const commandPages = usePages(commands, 4),
    alertPages = usePages(alerts, 3);
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
            <span className="eyebrow">POST-FLIGHT ANALYSIS · {flight.adapter.toUpperCase()}</span>
            <h2>{flight.snapshot.name}</h2>
            <p>
              {date(flight.startedAt)} · {flight.id.slice(0, 8)}
            </p>
          </div>
          <button className="icon-button" aria-label="Close report" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="report-status">
          <Badge tone={flight.state === 'COMPLETED' ? 'green' : 'amber'}>{flight.state}</Badge>
          <span>{flight.reason ?? 'Flight in progress'}</span>
          <button className="text-button" onClick={download}>
            <Download size={14} /> Export JSON
          </button>
        </div>
        <div className="report-metrics">
          {[
            ['Duration', duration(summary.duration)],
            ['Path estimate', `${fmt(summary.distance)} m`],
            ['Max altitude', `${fmt(summary.maxAltitude)} m`],
            ['Battery used', `${fmt(summary.batteryUsed)}%`],
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
                  : 'Flight overview'}
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
        <div className="report-data-note">
          <ShieldCheck size={15} />
          {summary.sampleCount} samples · {summary.gaps} sequence gaps ·{' '}
          {summary.complete ? 'Complete recorded session' : 'Incomplete or active session'} ·
          battery is synthetic
        </div>
        {tab === 'commands' && (
          <div className="report-records">
            <h3>Command timeline</h3>
            <div className="command-timeline">
              {commandPages.items.map((c) => (
                <div key={c.id}>
                  <span>{c.action.replaceAll('_', ' ')}</span>
                  <Badge tone={c.status === 'COMPLETED' ? 'green' : 'amber'}>{c.status}</Badge>
                  <small>{date(c.createdAt)}</small>
                </div>
              ))}
            </div>
            <Pagination pages={commandPages} label="Commands" />
          </div>
        )}
        {tab === 'alerts' && (
          <div className="report-records">
            <h3>Flight incidents</h3>
            {!alerts.length && <p className="incident-line">No incidents recorded.</p>}
            {alertPages.items.map((a) => (
              <p className="incident-line" key={a.id}>
                {a.title} · {a.status} · {a.message}
              </p>
            ))}
            <Pagination pages={alertPages} label="Incidents" />
          </div>
        )}
      </section>
    </Modal>
  );
}
