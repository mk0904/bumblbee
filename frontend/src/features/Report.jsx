import { Modal } from '../components/Modal.jsx';
import { Download, ShieldCheck, X } from 'lucide-react';
import { fmt, duration, date } from '../lib/format.js';
import { Badge } from '../components/ui.jsx';
import { WorldMap } from '../components/WorldMap.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';

export function Report({ report, onClose }) {
  const { flight, samples, summary, commands, alerts } = report;
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
        <div className="report-grid">
          <WorldMap
            waypoints={flight.snapshot.waypoints}
            trail={samples}
            sample={samples.at(-1)}
            compact
          />
          <div>
            <h3>Altitude profile</h3>
            <TelemetryChart samples={samples} height={180} />
            <h3>Battery estimate</h3>
            <TelemetryChart samples={samples} metric="battery" height={150} />
          </div>
        </div>
        <div className="report-data-note">
          <ShieldCheck size={15} />
          {summary.sampleCount} samples · {summary.gaps} sequence gaps ·{' '}
          {summary.complete ? 'Complete recorded session' : 'Incomplete or active session'} ·
          battery is synthetic
        </div>
        <h3>Command timeline</h3>
        <div className="command-timeline">
          {commands.map((c) => (
            <div key={c.id}>
              <span>{c.action.replaceAll('_', ' ')}</span>
              <Badge tone={c.status === 'COMPLETED' ? 'green' : 'amber'}>{c.status}</Badge>
              <small>{date(c.createdAt)}</small>
            </div>
          ))}
        </div>
        {alerts.length > 0 && (
          <>
            <h3>Flight incidents</h3>
            {alerts.map((a) => (
              <p className="incident-line" key={a.id}>
                {a.title} · {a.status} · {a.message}
              </p>
            ))}
          </>
        )}
      </section>
    </Modal>
  );
}
