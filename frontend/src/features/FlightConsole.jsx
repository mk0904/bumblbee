import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChartNoAxesCombined,
  Camera,
  ChevronRight,
  Crosshair,
  Map,
  Pause,
  Play,
  Plus,
  Radio,
  Route,
  Signal,
} from 'lucide-react';
import { CameraFeed } from '../components/CameraFeed.jsx';
import { WorldMap } from '../components/WorldMap.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import { fmt, duration } from '../lib/format.js';
import './flight-console.css';

function DroneDrawing() {
  return (
    <svg
      className="console-drone"
      viewBox="0 0 100 70"
      fill="none"
      aria-label="Quadcopter illustration"
    >
      <g stroke="currentColor" strokeWidth="1.4">
        <path d="M43 29L20 13M57 29L80 13M43 40L20 56M57 40L80 56" />
        <ellipse cx="19" cy="12" rx="16" ry="5" />
        <ellipse cx="81" cy="12" rx="16" ry="5" />
        <ellipse cx="19" cy="57" rx="16" ry="5" />
        <ellipse cx="81" cy="57" rx="16" ry="5" />
        <path d="M42 24L50 19L58 24L61 43L50 50L39 43Z" fill="#323536" />
        <path d="M45 27H55L57 37H43Z" fill="#8f949b" stroke="none" />
        <circle cx="50" cy="43" r="3" />
        <path d="M44 50L42 55M56 50L58 55" />
      </g>
      <path d="M8 11H27M72 57H92" stroke="#b69acb" strokeWidth="2" />
    </svg>
  );
}
function HeadingDial({ sample }) {
  const angle = sample ? ((((sample.yaw * 180) / Math.PI) % 360) + 360) % 360 : null;
  return (
    <section className="console-panel heading-instrument" aria-label="Local heading instrument">
      <div className="instrument-title">
        <span>HEADING</span>
        <span>LOCAL FRAME</span>
      </div>
      <div className="heading-value">{angle === null ? '—' : `${Math.round(angle)}°`}</div>
      <svg
        viewBox="0 0 240 240"
        aria-label={
          angle === null
            ? 'No heading telemetry'
            : `Yaw ${Math.round(angle)} degrees from positive X`
        }
      >
        <circle cx="120" cy="120" r="97" fill="#101112" stroke="#353839" />
        <circle cx="120" cy="120" r="88" fill="none" stroke="#242829" />
        {Array.from({ length: 60 }, (_, i) => (
          <line
            key={i}
            x1="120"
            y1="29"
            x2="120"
            y2={i % 5 === 0 ? 39 : 34}
            transform={`rotate(${i * 6} 120 120)`}
            stroke={i % 5 === 0 ? '#a9aeac' : '#515757'}
            strokeWidth={i % 5 === 0 ? 1.5 : 1}
          />
        ))}
        <g fill="#9da5a2" fontSize="11" textAnchor="middle" fontFamily="DM Sans, sans-serif">
          <text x="120" y="58">
            +Y
          </text>
          <text x="183" y="124">
            +X
          </text>
          <text x="120" y="190">
            −Y
          </text>
          <text x="57" y="124">
            −X
          </text>
        </g>
        <path d="M120 72V168M72 120H168" stroke="#424848" />
        <circle cx="120" cy="120" r="4" fill="#adb1b6" />
        {sample && (
          <g transform={`rotate(${90 - angle} 120 120)`}>
            <path d="M120 66L128 130L120 123L112 130Z" fill="#f6ece4" />
            <path d="M120 174L124 129L120 123L116 129Z" fill="#636c69" />
          </g>
        )}
        <path d="M120 17L116 23H124Z" fill="#b69acb" />
      </svg>
      <div className="heading-coordinates">
        <span>
          X <strong>{fmt(sample?.x)} m</strong>
        </span>
        <span>
          Y <strong>{fmt(sample?.y)} m</strong>
        </span>
      </div>
    </section>
  );
}

/** Presentation only. Commands and all flight/telemetry state are provided by application services. */
export function FlightConsole({
  data,
  active,
  sample,
  stale,
  busy,
  pending,
  commands,
  onCommand,
  onMissions,
  onNewMission,
  onReconcile,
  onHistory,
}) {
  const [view, setView] = useState('map'),
    [overlay, setOverlay] = useState(true);
  const route = active?.snapshot.waypoints ?? data.missions[0]?.waypoints ?? [];
  const command = commands.at(-1);
  const landPending = commands.some(
    (c) => ['PENDING', 'ACCEPTED', 'UNKNOWN'].includes(c.status) && c.action !== 'START_MISSION',
  );
  const state = active?.state ?? (data.drone.connected ? 'STANDBY' : 'OFFLINE');
  const current = Math.min((sample?.waypoint ?? 0) + 1, route.length);
  return (
    <div className="flight-console">
      <div className="console-toolbar">
        <div>
          <span className="console-section-name">Flight deck</span>
          <span className="console-divider" />
          <span className="console-device-label">ATLAS 01</span>
        </div>
        <div>
          <span className={`console-link ${data.drone.connected ? 'connected' : ''}`}>
            <i />
            {data.drone.connected ? 'Link established' : 'No agent connected'}
          </span>
          <span className="console-source">
            {data.mode === 'demo' ? 'DEMO ADAPTER' : 'WEBOTS AGENT'}
          </span>
        </div>
      </div>
      <div className="console-layout">
        <section
          className={`console-viewport ${view === 'altitude' ? 'chart-view' : ''}`}
          aria-label="Mission viewport"
        >
          {view === 'map' ? (
            <WorldMap
              waypoints={overlay ? route : []}
              sample={sample}
              trail={overlay ? data.telemetry : []}
            />
          ) : view === 'camera' ? (
            <CameraFeed enabled={data.mode === 'webots'} />
          ) : (
            <div className="console-large-chart">
              <TelemetryChart samples={data.telemetry} height={380} />
            </div>
          )}
          <div className="viewport-top">
            <span className="viewport-source">
              <span className={`record-dot ${active && !stale ? 'active' : ''}`} />
              {active ? (stale ? 'TELEMETRY STALE' : 'MISSION ACTIVE') : 'MISSION PREVIEW'}
            </span>
            <div className="viewport-counters">
              <span>
                <ClockGlyph />
                {active ? duration(sample?.simulationTime ?? 0) : '00:00'}
              </span>
              <span className="viewport-world">LOCAL XY</span>
            </div>
          </div>
          <div className="viewport-side">
            <span className="hud-label">ALTITUDE</span>
            <strong>
              {fmt(sample?.altitude)}
              <small>m</small>
            </strong>
            <div className="hud-scale">
              {Array.from({ length: 13 }, (_, i) => (
                <i key={i} className={i % 3 === 0 ? 'major' : ''} />
              ))}
            </div>
            <span className="hud-label">GROUND SPEED</span>
            <strong>
              {fmt(sample?.speed)}
              <small>m/s</small>
            </strong>
            <span className="hud-label hud-third">ROUTE</span>
            <span className="hud-route">
              {active
                ? `${String(current).padStart(2, '0')} / ${String(route.length).padStart(2, '0')}`
                : route.length
                  ? `${route.length} POINTS`
                  : 'NOT ASSIGNED'}
            </span>
          </div>
          {view === 'map' && (
            <div className="viewport-reticle" aria-hidden="true">
              <i />
              <span />
              <i />
            </div>
          )}
          <div className="viewport-bottom">
            <div>
              <span className="viewport-mission-label">
                {active ? 'EXECUTING MISSION' : 'ROUTE PREVIEW'}
              </span>
              <h1>
                {active?.snapshot.name ?? data.missions[0]?.name ?? 'Ready for your next mission'}
              </h1>
              <span>
                {active
                  ? `SESSION ${active.id.slice(0, 8).toUpperCase()}`
                  : route.length
                    ? `${route.length} waypoints · local training world`
                    : 'Add a route in the mission editor.'}
              </span>
            </div>
            <button
              className="viewport-route-button"
              aria-label={overlay ? 'Hide route overlay' : 'Show route overlay'}
              title={overlay ? 'Hide route overlay' : 'Show route overlay'}
              disabled={view !== 'map'}
              onClick={() => setOverlay((v) => !v)}
              aria-pressed={overlay}
            >
              <Route size={17} />
            </button>
          </div>
          <div className="viewport-grid" aria-hidden="true" />
        </section>
        <aside className="console-panel drone-status-panel">
          <div className="drone-status-title">
            <div>
              <h2>Atlas 01</h2>
              <p>Quadcopter · training configuration</p>
            </div>
            <DroneDrawing />
          </div>
          <div className="console-state">
            <span>Flight state</span>
            <strong>
              <i className={active ? 'active' : ''} />
              {state.replaceAll('_', ' ')}
            </strong>
          </div>
          <div className="console-battery">
            <div>
              <span>Battery estimate</span>
              <strong className={sample?.battery <= 20 ? 'battery-low' : ''}>
                {fmt(sample?.battery, 0)}
                <small>%</small>
              </strong>
            </div>
            <div className="console-meter">
              <i style={{ width: `${sample?.battery ?? 0}%` }} />
            </div>
            <span>
              {sample ? `${sample.batterySource ?? 'synthetic'} source` : 'Waiting for telemetry'}
            </span>
          </div>
          <div className="console-altitude">
            <div>
              <span>Altitude</span>
              <strong>
                {fmt(sample?.altitude)} <small>m</small>
              </strong>
            </div>
            <div className="altitude-track">
              <span
                style={{
                  left: `${Math.min(100, ((sample?.altitude ?? 0) / (data.world.maxAltitude ?? 15)) * 100)}%`,
                }}
              />
            </div>
            <div className="altitude-limits">
              <span>0 m</span>
              <span>LIMIT {data.world.maxAltitude ?? 15} m</span>
            </div>
          </div>
          <div className="console-attitude">
            <div>
              <span>ROLL</span>
              <strong>{sample ? fmt((sample.roll * 180) / Math.PI, 0) : '—'}°</strong>
            </div>
            <div>
              <span>PITCH</span>
              <strong>{sample ? fmt((sample.pitch * 180) / Math.PI, 0) : '—'}°</strong>
            </div>
            <div>
              <span>YAW</span>
              <strong>{sample ? fmt((sample.yaw * 180) / Math.PI, 0) : '—'}°</strong>
            </div>
          </div>
          <div className="console-signal">
            <Signal size={15} />
            <span>
              {stale ? 'Stale readings' : sample ? 'Telemetry received' : 'Awaiting flight data'}
            </span>
            <span>{data.storage === 'postgresql' ? 'PG' : 'LOCAL'}</span>
          </div>
        </aside>
        <section className="console-panel console-control-desk">
          <div className="desk-top">
            <div className="console-view-tabs" role="group" aria-label="Mission viewport display">
              <button
                className={view === 'map' ? 'selected' : ''}
                onClick={() => setView('map')}
                aria-pressed={view === 'map'}
              >
                <Map size={13} /> Mission view
              </button>
              <button
                className={view === 'camera' ? 'selected' : ''}
                onClick={() => setView('camera')}
                aria-pressed={view === 'camera'}
              >
                <Camera size={13} /> Camera
              </button>
              <button
                className={view === 'altitude' ? 'selected' : ''}
                onClick={() => setView('altitude')}
                aria-pressed={view === 'altitude'}
              >
                <ChartNoAxesCombined size={13} /> Altitude
              </button>
            </div>
            <button className="console-plan-button" onClick={onNewMission}>
              <Plus size={13} /> Plan mission
            </button>
          </div>
          <div className="desk-body">
            <button
              className="console-minimap"
              onClick={onMissions}
              aria-label="Open mission planner"
            >
              <WorldMap waypoints={route} sample={sample} compact />
              <span>
                MISSION PLANNER <ArrowUpRight size={11} />
              </span>
            </button>
            <div className="desk-readouts">
              <div>
                <span>SPEED</span>
                <strong>
                  {fmt(sample?.speed)} <small>m/s</small>
                </strong>
              </div>
              <div>
                <span>ALTITUDE</span>
                <strong>
                  {fmt(sample?.altitude)} <small>m</small>
                </strong>
              </div>
              <div>
                <span>FLIGHT TIME</span>
                <strong>{active ? duration(sample?.simulationTime ?? 0) : '—'}</strong>
              </div>
              <div>
                <span>WAYPOINT</span>
                <strong>{active ? `${current} / ${route.length}` : '—'}</strong>
              </div>
              <button className="desk-history" onClick={onHistory}>
                Flight records <ChevronRight size={12} />
              </button>
            </div>
            <div className="desk-controls">
              <span className="desk-control-caption">MISSION COMMANDS</span>
              {active ? (
                <>
                  <div className="console-command-buttons">
                    <button
                      className="console-round-button"
                      disabled={
                        busy ||
                        pending ||
                        stale ||
                        !data.drone.connected ||
                        !['EXECUTING', 'PAUSED'].includes(active.state)
                      }
                      onClick={() => onCommand(active.state === 'PAUSED' ? 'RESUME' : 'PAUSE')}
                      aria-label={active.state === 'PAUSED' ? 'Resume' : 'Pause'}
                    >
                      {active.state === 'PAUSED' ? <Play size={21} /> : <Pause size={21} />}
                      <span>{active.state === 'PAUSED' ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button
                      className="console-round-button land-command"
                      disabled={
                        busy ||
                        landPending ||
                        !data.drone.connected ||
                        !['TAKING_OFF', 'EXECUTING', 'PAUSED'].includes(active.state)
                      }
                      onClick={() => onCommand('LAND')}
                      aria-label="Land"
                    >
                      <ArrowDownToLine size={21} />
                      <span>Land</span>
                    </button>
                  </div>
                  <span className="console-command-status">
                    {command
                      ? `${command.action.replaceAll('_', ' ')} · ${command.status}`
                      : 'AWAITING COMMAND'}
                  </span>
                  {!data.drone.connected && (
                    <button
                      className="text-button danger-text"
                      disabled={busy}
                      onClick={onReconcile}
                    >
                      Close unconfirmed session
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button className="console-mission-select" onClick={onMissions}>
                    <Crosshair size={23} />
                    <span>Select mission</span>
                    <ChevronRight size={14} />
                  </button>
                  <p>Ready for a saved waypoint route.</p>
                </>
              )}
              <div className="desk-control-note">
                <Radio size={11} /> Commands require acknowledgement
              </div>
            </div>
          </div>
        </section>
        <HeadingDial sample={sample} />
      </div>
      <div className="console-bottomline">
        <span>
          <i />
          {data.mode === 'demo'
            ? 'Synthetic telemetry · Webots not connected'
            : 'External agent · local coordinate frame'}
        </span>
        <button onClick={onHistory}>
          {data.flights.length} recorded flights <ArrowUpRight size={11} />
        </button>
      </div>
    </div>
  );
}
function ClockGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.3" stroke="currentColor" />
      <path d="M6 3V6L8 7" stroke="currentColor" />
    </svg>
  );
}
