import { Pagination, usePages } from '../components/Pagination.jsx';
import {
  ArrowDownToLine,
  ChevronRight,
  Crosshair,
  Pause,
  Play,
  Plus,
  Radio,
} from 'lucide-react';
import { CameraFeed } from '../components/CameraFeed.jsx';
import { WorldMap } from '../components/WorldMap.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import droneIdentity from '../../../shared/config/drone.json';
import { fmt, duration } from '../lib/format.js';
import './flight-console.css';

function HeadingDial({ sample, stale }) {
  const heading = sample ? ((90 - sample.yaw * 180 / Math.PI) % 360 + 360) % 360 : null;
  return (
    <section className={`console-panel heading-instrument operator-compass ${stale ? 'is-stale' : ''}`} aria-label="Local heading instrument">
      <div className="compass-body">
        <svg viewBox="0 0 220 220" aria-label={heading === null ? 'No heading telemetry' : `Local heading ${Math.round(heading) % 360} degrees clockwise from positive Y${stale ? ', stale' : ''}`}>
          <circle cx="110" cy="110" r="92" fill="#121215" stroke="#ffffff18" />
          <g transform={`rotate(${heading === null ? 0 : -heading} 110 110)`}>
            {Array.from({length:72},(_,i)=><line key={i} x1="110" y1="22" x2="110" y2={i%6===0?32:27} transform={`rotate(${i*5} 110 110)`} stroke={i%6===0?'#aaa3b5':'#4c4654'} />)}
            <g fill="#bcb5c6" fontSize="13" textAnchor="middle" fontFamily="DM Sans, sans-serif"><text x="110" y="51">N</text><text x="175" y="115">E</text><text x="110" y="182">S</text><text x="45" y="115">W</text></g>
          </g>
          <path d="M110 13L104 23H116Z" fill="#cdbadc" />
          <path d="M110 77L124 131L110 122L96 131Z" fill={sample ? '#e9deef' : '#65616b'} />
          <circle cx="110" cy="110" r="58" fill="none" stroke="#ffffff07" />
        </svg>
        <div className="compass-details"><span>{stale ? 'Stale reading' : sample ? 'Measured heading' : 'Awaiting telemetry'}</span><span>Local north = +Y</span></div>
      </div>
      <div className="heading-coordinates"><span>X <strong>{fmt(sample?.x)} m</strong></span><span>Y <strong>{fmt(sample?.y)} m</strong></span></div>
    </section>
  );
}

/** Presentation only. Commands and all flight/telemetry state are provided by application services. */
export function FlightConsole({
  data,
  selectedMission,
  active,
  sample,
  stale,
  busy,
  pending,
  commands,
  onCommand,
  onMissions,
  onStart,
  onNewMission,
  onReconcile,
  onHistory,
}) {
  const route = active?.snapshot.waypoints ?? selectedMission?.waypoints ?? [];
  const waypointPages = usePages(route, 2);
  const initial = !active && !sample;
  const initialValue = initial ? 0 : undefined;
  const command = commands.at(-1);
  const landPending = commands.some(
    (c) => ['PENDING', 'ACCEPTED', 'UNKNOWN'].includes(c.status) && c.action !== 'START_MISSION',
  );
  const state = active?.state ?? (data.drone.connected ? 'STANDBY' : 'OFFLINE');
  const current = Math.min((sample?.waypoint ?? 0) + 1, route.length);
  return (
    <div className="flight-console">
      <div className="console-layout">
        <section className="console-viewport" aria-label="Mission viewport">
          <WorldMap
            zoomKey="flight-deck"
            waypoints={route}
            sample={sample}
            trail={active ? data.telemetry : []}
            toolbarExtras={<>
              <button className={`map-mission-status ${!data.drone.connected ? 'offline' : stale ? 'stale' : active?.state === 'PAUSED' ? 'paused' : active ? 'running' : 'standby'}`} aria-label={`Mission status: ${!data.drone.connected ? 'Simulator offline' : stale ? 'Telemetry stale' : active?.state?.replaceAll('_', ' ') ?? 'Standby — no active mission'}`}>
                <i />
                <span className="map-status-tooltip" role="tooltip">
                  <strong>{!data.drone.connected ? 'Simulator offline' : stale ? 'Telemetry stale' : active?.state?.replaceAll('_', ' ') ?? 'Standby — no active mission'}</strong>
                  <span>Green · active mission</span><span>Amber · paused</span><span>Red · stale telemetry or offline</span><span>Grey · standby</span>
                </span>
              </button>

            </>}
          />
          <div className="map-panel-name">Map</div>
          <div className="viewport-grid" aria-hidden="true" />
        </section>
        <section className="console-panel live-camera-panel" aria-label="Camera view">
          <div className="live-camera-image"><CameraFeed enabled={data.mode === 'webots'} /></div>
          <div className="camera-panel-name">Camera</div>
        </section>
        <div className="navigation-instrument-stack">
        <HeadingDial sample={sample} stale={stale} />
        <section className={`console-panel altitude-gauge-panel ${stale ? 'is-stale' : ''}`} aria-label="Altitude range meter">
          <div className="altitude-gauge-heading"><span>Altitude</span><strong>{fmt(sample?.altitude ?? initialValue)}<small> m</small></strong></div>
          <div className="altitude-gauge-body">
            <div className="altitude-ruler" aria-hidden="true">
              {Array.from({length:16},(_,i) => <div className={`altitude-ruler-tick ${i%5===0 ? 'major' : ''}`} key={i} style={{bottom:`${i/15*100}%`}}><i />{i%5===0 && <span>{Number(((data.world.maxAltitude ?? 15)*i/15).toFixed(1))}</span>}</div>)}
              <div className="altitude-ruler-pointer" style={{bottom:`${Math.min(100,Math.max(0,(sample?.altitude ?? 0)/(data.world.maxAltitude ?? 15)*100))}%`}}><span>{fmt(sample?.altitude ?? initialValue)}</span><i /></div>
            </div>
          </div>
          <div className="altitude-limit-label">Limit {data.world.maxAltitude ?? 15} m</div>
          <div className="altitude-gauge-condition">{stale ? 'Telemetry stale' : sample ? 'Above ground' : 'Awaiting telemetry'}</div>
        </section>
        </div>
        <section className="telemetry-history-section" aria-label="UAV telemetry and history">
          <aside className="console-panel telemetry-tiles-panel" aria-label="Drone telemetry">
            <div className="uav-section-header"><h2>{data.drone.code ?? droneIdentity.code}</h2><span className={`uav-condition ${stale ? 'stale' : ''}`}><i />{stale ? 'Telemetry stale' : state.replaceAll('_', ' ')}</span></div>
            <div className="telemetry-tile-grid">
              {[
                ['Battery', fmt(sample?.battery ?? initialValue, 0), '%', 'Estimated'],
                ['Altitude', fmt(sample?.altitude ?? initialValue), 'm'],
                ['Ground speed', fmt(sample?.speed ?? initialValue), 'm/s'],
                ['Flight time', active ? (sample ? duration(sample.simulationTime) : '—') : '00:00', ''],
                ['Waypoint', active ? `${current} / ${route.length}` : `0 / ${route.length}`, ''],
                ['Heading', sample ? fmt(((90 - sample.yaw * 180 / Math.PI) % 360 + 360) % 360, 1) : initial ? '0.0' : '—', '°'],
                ['Pitch', sample ? fmt(sample.pitch * 180 / Math.PI, 1) : initial ? '0.0' : '—', '°'],
                ['Roll', sample ? fmt(sample.roll * 180 / Math.PI, 1) : initial ? '0.0' : '—', '°'],
              ].map(([label,value,unit,note]) => <div className={`telemetry-tile ${stale ? 'is-stale' : ''}`} key={label}><span>{label}{note && <small>{note}</small>}</span><strong>{value}<small>{unit}</small></strong></div>)}
            </div>
          </aside>
          <section className="console-panel flight-trend-panel" aria-label="Live altitude trend">
            <div className="live-panel-title"><span>Altitude history</span></div>
            <TelemetryChart samples={data.telemetry} height={130} />
          </section>
        </section>
        <section className="console-panel console-control-desk">
          <div className="desk-top">
            <span className="desk-title">Mission & controls</span>
            <button className="console-plan-button" onClick={onNewMission}>
              <Plus size={13} /> Plan mission
            </button>
          </div>
          <div className="desk-body">
            <div className="mission-summary">
              <h2>{active?.snapshot.name ?? selectedMission?.name ?? 'No mission selected'}</h2>
              <p className="selected-mission-state">{active ? `In flight · waypoint ${current} / ${route.length}` : selectedMission ? `Selected · ${route.length} waypoints` : 'Select a saved plan to inspect its route.'}</p>
              {route.length > 0 && <div className="selected-waypoints">
                <table aria-label="Selected mission waypoints"><thead><tr><th>WP</th><th>X (m)</th><th>Y (m)</th><th>Alt (m)</th></tr></thead><tbody>{waypointPages.items.map((point,i)=><tr key={waypointPages.page*2+i}><td>{String(waypointPages.page*2+i+1).padStart(2,'0')}</td><td>{fmt(point.x)}</td><td>{fmt(point.y)}</td><td>{fmt(point.altitude)}</td></tr>)}</tbody></table>
                <Pagination pages={waypointPages} label="Waypoints" />
              </div>}
              <button className="desk-history" onClick={onHistory}>Flight records <ChevronRight size={12} /></button>
            </div>
            <div className="desk-controls">
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
                  {selectedMission && <button className="button primary selected-start" disabled={busy || pending || !data.drone.connected || !route.length} onClick={() => onStart(selectedMission)}><Play size={15} /> Start mission</button>}
                  <button className="console-mission-select" onClick={onMissions}>
                    <Crosshair size={23} />
                    <span>{selectedMission ? 'Change mission' : 'Select mission'}</span>
                    <ChevronRight size={14} />
                  </button>
                  <p>{!data.drone.connected ? 'Connect the simulator to start.' : selectedMission ? 'Ready to start selected plan.' : 'Choose a plan before starting.'}</p>
                </>
              )}
              <div className="desk-control-note">
                <Radio size={11} /> Commands require acknowledgement
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
