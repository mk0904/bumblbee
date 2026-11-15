import { Modal } from '../components/Modal.jsx';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Battery,
  Bell,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  FileText,
  Gauge,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Map,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Route,
  Settings2,
  ShieldCheck,
  Signal,
  TriangleAlert,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { api, requestKey } from '../lib/api.js';
import { terminal, fmt, duration, date } from '../lib/format.js';
import { Badge, PanelHeading, Empty } from '../components/ui.jsx';
import { useDashboard } from '../lib/use-dashboard.js';
import { WorldMap } from '../components/WorldMap.jsx';
import { TelemetryChart } from '../components/TelemetryChart.jsx';
import { Planner } from './Planner.jsx';
import { MissionCards } from './MissionCards.jsx';
import { Report } from './Report.jsx';

export function Workspace({ user, onLogout }) {
  const { data, connection, error, refresh } = useDashboard(onLogout);
  const [page, setPage] = useState('overview'),
    [editor, setEditor] = useState(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(null),
    [report, setReport] = useState(null),
    [filter, setFilter] = useState(''),
    [confirmation, setConfirmation] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const escape = (e) => {
      if (e.key === 'Escape') setReport(null);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  const act = async (work, message) => {
    setBusy(true);
    try {
      await work();
      await refresh();
      if (message) setToast({ message });
    } catch (error) {
      setToast({ message: error.message, error: true });
    } finally {
      setBusy(false);
    }
  };
  const active = data?.flights.find((f) => !terminal(f.state)),
    sample = active?.latest;
  const stale = sample ? Date.now() - Date.parse(sample.receivedAt) > 3000 : false;
  const commands = data?.commands.filter((c) => c.flightId === active?.id) ?? [],
    pending = commands.some((c) => ['PENDING', 'ACCEPTED', 'UNKNOWN'].includes(c.status));
  const openAlerts = data?.alerts.filter((a) => a.status === 'OPEN') ?? [];
  const start = (mission) =>
    act(async () => {
      await api('/flights', {
        method: 'POST',
        headers: requestKey(),
        body: { missionId: mission.id, revision: mission.revision },
      });
      setPage('overview');
    }, 'Start requested. Waiting for simulator confirmation.');
  const command = (action) =>
    act(
      () =>
        api(`/flights/${active.id}/commands`, {
          method: 'POST',
          headers: requestKey(),
          body: { action },
        }),
      `${action.toLowerCase()} requested`,
    );
  const showReport = (flight) =>
    act(async () => setReport(await api(`/flights/${flight.id}/report`)));
  const archive = (mission) =>
    setConfirmation({
      title: 'Archive mission?',
      message: `Archive “${mission.name}”? Saved flight history will remain.`,
      confirm: () =>
        act(() => api(`/missions/${mission.id}`, { method: 'DELETE' }), 'Mission archived'),
    });
  const navigate = (next) => {
    setPage(next);
    setEditor(null);
    setFilter('');
  };
  const flightSeconds = sample?.simulationTime ?? 0;
  if (!data)
    return (
      <div className="loading-page">
        <Compass size={35} />
        <h2>Connecting to your workspace</h2>
        <p>{error || 'Loading missions and flight state…'}</p>
        <button className="button secondary" onClick={refresh}>
          Retry
        </button>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          aria-label="bumbl.bee overview"
          className="brand"
          href="#overview"
          onClick={() => navigate('overview')}
        >
          <div className="brand-symbol">
            <Compass size={23} />
          </div>
          <span>
            bumbl<span className="brand-period">.bee</span>
          </span>
        </a>
        <div className="workspace-selector">
          <div className="workspace-avatar">T</div>
          <div>
            <strong>Training workspace</strong>
            <span>Mission operations</span>
          </div>
          <ChevronDown size={13} />
        </div>
        <span className="nav-section-label">WORKSPACE</span>
        <nav>
          {[
            ['overview', LayoutDashboard, 'Overview'],
            ['missions', Map, 'Mission planner'],
            ['history', Clock3, 'Flight history'],
            ['alerts', Bell, 'Alerts'],
            ['system', Settings2, 'System'],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              title={label}
              aria-label={label}
              className={`nav-item ${page === id && !editor ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={17} />
              {label}
              {id === 'alerts' && openAlerts.length > 0 && (
                <span className="nav-count">{openAlerts.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-card">
            <div>
              <span className={`pulse-dot ${data.drone.connected ? '' : 'offline'}`} />
              <strong>
                {data.drone.connected ? 'Ground station online' : 'Simulator offline'}
              </strong>
            </div>
            <p>
              {data.mode === 'demo' ? 'Demo adapter · synthetic data' : 'Webots external agent'}
            </p>
            <span>
              <Signal size={12} /> {connection === 'live' ? 'LIVE CHANNEL' : 'RECONNECTING'}
            </span>
          </div>
          <button
            className="operator-profile"
            aria-label="Disconnect control session"
            title="Disconnect control session"
            onClick={() =>
              act(async () => {
                await api('/auth/logout', { method: 'POST' });
                onLogout();
              })
            }
          >
            <span className="operator-avatar">
              <Radio size={14} />
            </span>
            <span>
              <strong>Ground station</strong>
              <small>{user.email}</small>
            </span>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={12} />
            <strong>
              {editor
                ? 'Mission editor'
                : {
                    overview: 'Overview',
                    missions: 'Mission planner',
                    history: 'Flight history',
                    alerts: 'Alerts',
                    system: 'System',
                  }[page]}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="environment-tag">
              <Box size={12} />
              {data.mode === 'demo' ? 'DEMO ENVIRONMENT' : 'WEBOTS ENVIRONMENT'}
            </span>
            <span className="topbar-separator" />
            <button
              className="icon-button"
              title="View alerts"
              aria-label="View alerts"
              onClick={() => navigate('alerts')}
            >
              <Bell size={17} />
              {openAlerts.length > 0 && <i />}
            </button>
            <span className="operator-avatar small">
              <Radio size={13} />
            </span>
          </div>
        </header>
        <main className="content">
          {error && (
            <div className="error-banner" role="alert">
              <WifiOff size={16} />
              {error}
            </div>
          )}
          {connection !== 'live' && (
            <div className="warning-banner">
              <RefreshCw size={15} />
              Live channel reconnecting. Last received data may be outdated.
            </div>
          )}
          {editor ? (
            <Planner
              key={editor.id ?? 'new'}
              mission={editor.id ? editor : null}
              busy={busy}
              onClose={() => setEditor(null)}
              onSave={(input) =>
                act(async () => {
                  await api(editor.id ? `/missions/${editor.id}` : '/missions', {
                    method: editor.id ? 'PATCH' : 'POST',
                    body: input,
                  });
                  setEditor(null);
                  setPage('missions');
                }, 'Mission saved')
              }
            />
          ) : (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">GROUND CONTROL / ATLAS 01</span>
                  <h1>
                    {
                      {
                        overview: 'Mission control',
                        missions: 'Mission planner',
                        history: 'Flight history',
                        alerts: 'Alerts & incidents',
                        system: 'System overview',
                      }[page]
                    }
                    <span className="title-dot">.</span>
                  </h1>
                  <p>
                    {
                      {
                        overview: 'A clear view of your drone, from takeoff to touchdown.',
                        missions: 'Build a route. Define the details. Make it repeatable.',
                        history: 'Every flight recorded. Every decision traceable.',
                        alerts: 'The signals that need your attention.',
                        system: 'Know what is connected, and what is still being built.',
                      }[page]
                    }
                  </p>
                </div>
                <div className="page-actions">
                  <span className="date-label">
                    {new Date().toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    className="button primary"
                    onClick={() => {
                      setEditor({});
                      setPage('missions');
                    }}
                  >
                    <Plus size={15} /> New mission
                  </button>
                </div>
              </div>
              {page === 'overview' && (
                <>
                  <div className="stat-grid">
                    {[
                      [
                        Route,
                        'TOTAL MISSIONS',
                        data.missions.length,
                        'Saved in your workspace',
                        'missions',
                      ],
                      [
                        Activity,
                        'FLIGHT SESSIONS',
                        data.flights.length,
                        `${data.flights.filter((f) => f.state === 'COMPLETED').length} completed flights`,
                        'history',
                      ],
                      [
                        Radio,
                        'DRONE STATUS',
                        active
                          ? active.state.replaceAll('_', ' ')
                          : data.drone.connected
                            ? 'Standby'
                            : 'Offline',
                        active ? 'Mission in progress' : 'No active mission',
                        'system',
                      ],
                      [
                        Bell,
                        'OPEN ALERTS',
                        openAlerts.length.toString().padStart(2, '0'),
                        openAlerts.length ? 'Review required' : 'No unresolved incidents',
                        'alerts',
                      ],
                    ].map(([Icon, label, value, note, target]) => (
                      <button className="stat-card" key={label} onClick={() => navigate(target)}>
                        <div className="stat-label">
                          <span>{label}</span>
                          <Icon size={16} />
                        </div>
                        <strong className={label === 'DRONE STATUS' ? 'status-value' : ''}>
                          {value}
                        </strong>
                        <div className="stat-note">
                          <span className="tiny-dot" />
                          {note}
                          <ArrowUpRight size={13} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="operations-grid">
                    <section className="panel live-map-panel">
                      <PanelHeading number="01" title="Live mission view">
                        <Badge tone={active ? (stale ? 'amber' : 'green') : 'neutral'}>
                          {active ? (stale ? 'STALE' : 'IN FLIGHT') : 'STANDBY'}
                        </Badge>
                      </PanelHeading>
                      <div className="live-map-info">
                        <div>
                          <span className="drone-glyph">
                            <Compass size={19} />
                          </span>
                          <div>
                            <strong>{active?.snapshot.name ?? 'Atlas 01'}</strong>
                            <span>
                              {active
                                ? `FLIGHT ${active.id.slice(0, 8).toUpperCase()} · ${data.mode.toUpperCase()}`
                                : 'QUADCOPTER / NO ACTIVE MISSION'}
                            </span>
                          </div>
                        </div>
                        <span className="live-chip">
                          <span className={`pulse-dot ${!data.drone.connected ? 'offline' : ''}`} />
                          {data.drone.connected
                            ? data.mode === 'demo'
                              ? 'Demo link'
                              : 'Agent linked'
                            : 'No agent'}
                        </span>
                      </div>
                      <WorldMap
                        waypoints={active?.snapshot.waypoints ?? data.missions[0]?.waypoints ?? []}
                        sample={sample}
                        trail={data.telemetry}
                      />
                      <div className="map-bottom-strip">
                        <span>
                          <ShieldCheck size={14} /> LOCAL COORDINATE FRAME
                        </span>
                        <span>
                          {active
                            ? `Waypoint ${Math.min((sample?.waypoint ?? 0) + 1, active.snapshot.waypoints.length)} / ${active.snapshot.waypoints.length}`
                            : 'Awaiting mission assignment'}
                        </span>
                      </div>
                    </section>
                    <aside className="flight-side">
                      <section className="panel telemetry-panel">
                        <PanelHeading number="02" title="Live telemetry">
                          <Radio size={14} />
                        </PanelHeading>
                        <div className="telemetry-values">
                          {[
                            [ArrowUpRight, 'Altitude', fmt(sample?.altitude), 'm'],
                            [Gauge, 'Ground speed', fmt(sample?.speed), 'm/s'],
                            [Battery, 'Battery', fmt(sample?.battery, 0), '%'],
                            [Clock3, 'Flight time', active ? duration(flightSeconds) : '—', ''],
                          ].map(([Icon, label, value, unit]) => (
                            <div key={label}>
                              <span>
                                <Icon size={14} />
                                {label}
                              </span>
                              <strong>
                                {value}
                                <small>{unit}</small>
                              </strong>
                              {label === 'Battery' && (
                                <div className="battery-track">
                                  <i
                                    style={{
                                      width: `${sample?.battery ?? 0}%`,
                                      background: sample?.battery < 20 ? '#e4ad70' : undefined,
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="attitude-strip" aria-label="Drone attitude in degrees">
                          {['roll', 'pitch', 'yaw'].map((axis) => (
                            <span key={axis}>
                              {axis.toUpperCase()}{' '}
                              <strong>
                                {sample ? fmt((sample[axis] * 180) / Math.PI, 0) : '—'}°
                              </strong>
                            </span>
                          ))}
                        </div>
                        <div className="telemetry-foot">
                          <span className={`pulse-dot ${stale || !sample ? 'offline' : ''}`} />
                          {sample
                            ? stale
                              ? 'Readings stale'
                              : '5 Hz target · simulated readings'
                            : 'Awaiting telemetry'}
                          <span>Battery: {sample?.batterySource ?? 'synthetic'}</span>
                        </div>
                      </section>
                      <section className="panel control-panel">
                        <PanelHeading number="03" title="Flight controls" />
                        <div className="flight-control-state">
                          <span>EXECUTION STATE</span>
                          <Badge tone={active ? 'green' : 'neutral'}>
                            {active?.state ?? 'IDLE'}
                          </Badge>
                        </div>
                        {active ? (
                          <>
                            <div className="flight-buttons">
                              <button
                                className="button secondary"
                                disabled={
                                  busy ||
                                  pending ||
                                  stale ||
                                  !data.drone.connected ||
                                  !['EXECUTING', 'PAUSED'].includes(active.state)
                                }
                                onClick={() =>
                                  command(active.state === 'PAUSED' ? 'RESUME' : 'PAUSE')
                                }
                              >
                                {active.state === 'PAUSED' ? (
                                  <Play size={15} />
                                ) : (
                                  <Pause size={15} />
                                )}{' '}
                                {active.state === 'PAUSED' ? 'Resume' : 'Pause'}
                              </button>
                              <button
                                className="button landing"
                                disabled={
                                  busy ||
                                  commands.some(
                                    (c) =>
                                      ['PENDING', 'ACCEPTED', 'UNKNOWN'].includes(c.status) &&
                                      c.action !== 'START_MISSION',
                                  ) ||
                                  !data.drone.connected ||
                                  !['TAKING_OFF', 'EXECUTING', 'PAUSED'].includes(active.state)
                                }
                                onClick={() => command('LAND')}
                              >
                                <ArrowDownToLine size={15} /> Land
                              </button>
                            </div>
                            {commands.at(-1) && (
                              <p className="command-status">
                                <span>{commands.at(-1).action.replaceAll('_', ' ')}</span>
                                <strong>{commands.at(-1).status}</strong>
                              </p>
                            )}
                            {!data.drone.connected && (
                              <button
                                className="text-button danger-text"
                                disabled={busy}
                                onClick={() =>
                                  setConfirmation({
                                    title: 'Close unconfirmed session?',
                                    message:
                                      'This records an interrupted session. It does not command or confirm landing.',
                                    confirm: () =>
                                      act(
                                        () =>
                                          api(`/flights/${active.id}/reconcile`, {
                                            method: 'POST',
                                          }),
                                        'Session marked interrupted; outcome unknown',
                                      ),
                                  })
                                }
                              >
                                Close unconfirmed session
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="control-help">
                              Choose a saved mission to begin automatic waypoint execution.
                            </p>
                            <button
                              className="button secondary full"
                              onClick={() => navigate('missions')}
                            >
                              Select mission <ArrowRight size={14} />
                            </button>
                          </>
                        )}
                        <p className="control-caption">
                          Commands require simulator acknowledgement.
                        </p>
                      </section>
                    </aside>
                  </div>
                  <div className="lower-grid">
                    <section className="panel">
                      <PanelHeading number="04" title="Altitude profile">
                        <span className="panel-subtitle">METRES / SIMULATION TIME</span>
                      </PanelHeading>
                      <div className="chart-wrap">
                        <TelemetryChart samples={data.telemetry} />
                      </div>
                    </section>
                    <section className="panel recent-panel">
                      <PanelHeading number="05" title="Recent activity">
                        <button className="text-button" onClick={() => navigate('history')}>
                          View all <ArrowUpRight size={13} />
                        </button>
                      </PanelHeading>
                      {data.flights.length ? (
                        data.flights.slice(0, 3).map((f) => (
                          <button className="activity-row" key={f.id} onClick={() => showReport(f)}>
                            <span className="activity-icon">
                              <Route size={16} />
                            </span>
                            <span>
                              <strong>{f.snapshot.name}</strong>
                              <small>{date(f.startedAt)}</small>
                            </span>
                            <Badge
                              tone={
                                f.state === 'COMPLETED'
                                  ? 'green'
                                  : terminal(f.state)
                                    ? 'amber'
                                    : 'neutral'
                              }
                            >
                              {f.state.replaceAll('_', ' ')}
                            </Badge>
                          </button>
                        ))
                      ) : (
                        <div className="activity-empty">
                          <Clock3 size={21} />
                          <span>No flights yet</span>
                          <p>Your flight timeline will appear here.</p>
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
              {page === 'missions' && (
                <>
                  <div className="list-toolbar">
                    <div className="segmented">
                      <button className="selected">
                        All missions <span>{data.missions.length}</span>
                      </button>
                    </div>
                    <label className="search-box">
                      <ListFilter size={15} />
                      <input
                        aria-label="Filter missions"
                        placeholder="Filter missions…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                    </label>
                  </div>
                  <MissionCards
                    missions={data.missions}
                    filter={filter}
                    onNew={() => setEditor({})}
                    onEdit={setEditor}
                    onStart={start}
                    onArchive={archive}
                    disabled={busy || Boolean(active) || !data.drone.connected}
                  />
                </>
              )}
              {page === 'history' && (
                <section className="panel history-panel">
                  <PanelHeading number="01" title="Recorded flights">
                    <span className="panel-subtitle">{data.flights.length} SESSIONS</span>
                  </PanelHeading>
                  {data.flights.length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>MISSION</th>
                            <th>STARTED</th>
                            <th>SOURCE</th>
                            <th>STATUS</th>
                            <th>REPORT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.flights.map((f) => (
                            <tr key={f.id}>
                              <td>
                                <strong>{f.snapshot.name}</strong>
                                <small>
                                  {f.id.slice(0, 8)} · revision {f.snapshot.revision}
                                </small>
                              </td>
                              <td>{date(f.startedAt)}</td>
                              <td>
                                <span className="source-label">{f.adapter}</span>
                              </td>
                              <td>
                                <Badge
                                  tone={
                                    f.state === 'COMPLETED'
                                      ? 'green'
                                      : terminal(f.state)
                                        ? 'amber'
                                        : 'neutral'
                                  }
                                >
                                  {f.state}
                                </Badge>
                              </td>
                              <td>
                                <button
                                  className="text-button"
                                  disabled={busy}
                                  onClick={() => showReport(f)}
                                >
                                  Open report <ArrowUpRight size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty icon={FileText} title="A clean flight log">
                      Complete your first mission to start building a flight history.
                    </Empty>
                  )}
                </section>
              )}
              {page === 'alerts' && (
                <section className="panel">
                  <PanelHeading number="01" title="Incident log">
                    <Badge tone={openAlerts.length ? 'amber' : 'green'}>
                      {openAlerts.length} OPEN
                    </Badge>
                  </PanelHeading>
                  {data.alerts.length ? (
                    <div className="alert-list">
                      {[...data.alerts].reverse().map((a) => (
                        <div className={`alert-item ${a.severity}`} key={a.id}>
                          <span className="alert-icon">
                            <TriangleAlert size={20} />
                          </span>
                          <div>
                            <h3>
                              {a.title}
                              <Badge tone={a.status === 'OPEN' ? 'amber' : 'neutral'}>
                                {a.status}
                              </Badge>
                            </h3>
                            <p>{a.message}</p>
                            <small>
                              {date(a.createdAt)} · {a.flightId.slice(0, 8)}
                            </small>
                          </div>
                          {a.status === 'OPEN' && (
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  () => api(`/alerts/${a.id}/acknowledgement`, { method: 'POST' }),
                                  'Alert acknowledged',
                                )
                              }
                            >
                              <Check size={14} /> Acknowledge
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty icon={ShieldCheck} title="Nothing needs your attention">
                      Low battery and missing telemetry incidents will appear here.
                    </Empty>
                  )}
                </section>
              )}
              {page === 'system' && (
                <div className="system-grid">
                  <section className="panel system-panel">
                    <PanelHeading number="01" title="Connection & environment" />
                    <dl>
                      {[
                        ['Drone', 'Atlas 01 / drone-01'],
                        [
                          'Execution adapter',
                          data.mode === 'demo'
                            ? 'Demo — kinematic test adapter'
                            : 'Webots external agent',
                        ],
                        ['Simulator link', data.drone.connected ? 'Connected' : 'Disconnected'],
                        ['Dashboard channel', connection],
                        ['Storage', data.storage],
                        ['Coordinate frame', data.world.frame],
                        ['World', data.world.id],
                        ['Telemetry rate', '5 Hz target'],
                        ['Flight bounds', 'X/Y ±50 m · altitude 2–15 m'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                  <div>
                    <section className="panel system-panel">
                      <PanelHeading number="02" title="Adapter boundary" />
                      <div className="integration-path">
                        <span>Dashboard</span>
                        <ChevronDown size={16} />
                        <span>Express · application services</span>
                        <ChevronDown size={16} />
                        <span>Simulator adapter</span>
                        <ChevronDown size={16} />
                        <span className="selected">
                          {data.mode === 'demo' ? 'Demo execution' : 'Webots bridge'}
                        </span>
                      </div>
                      <p>
                        Webots flight physics and controller integration remain unverified. Demo
                        motion is generated on the backend, not in this dashboard.
                      </p>
                    </section>
                    {data.mode === 'demo' && (
                      <section className="panel system-panel demo-tools">
                        <PanelHeading number="03" title="Demo fault injection" />
                        <p>Test alert and connection behaviour using the labelled demo adapter.</p>
                        <div className="demo-actions">
                          <button
                            className="button secondary"
                            disabled={busy || !active || !data.drone.connected}
                            onClick={() =>
                              act(
                                () =>
                                  api('/demo/inject', {
                                    method: 'POST',
                                    body: { kind: 'battery' },
                                  }),
                                'Synthetic battery set to 18%',
                              )
                            }
                          >
                            <Battery size={14} /> Low battery
                          </button>
                          <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() =>
                              act(
                                () =>
                                  api('/demo/inject', {
                                    method: 'POST',
                                    body: {
                                      kind: data.drone.connected ? 'disconnect' : 'reconnect',
                                    },
                                  }),
                                'Demo link updated',
                              )
                            }
                          >
                            {data.drone.connected ? <WifiOff size={14} /> : <Wifi size={14} />}{' '}
                            {data.drone.connected ? 'Disconnect' : 'Reconnect'}
                          </button>
                        </div>
                        <small>
                          Demo disconnect suspends test execution. This is not a verified Webots
                          watchdog.
                        </small>
                      </section>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <Compass size={12} /> BUMBL.BEE MISSION CONTROL
            </span>
            <span>
              {data.mode === 'demo'
                ? 'Demo adapter · not a physical drone or Webots flight'
                : 'Webots mode · controller integration requires verification'}
              <span className="footer-dot">·</span>WORLD_LOCAL_V1
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div
          className={`toast ${toast.error ? 'error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <TriangleAlert size={17} /> : <Check size={17} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {report && <Report report={report} onClose={() => setReport(null)} />}
      {confirmation && (
        <Modal title={confirmation.title} onClose={() => setConfirmation(null)}>
          <section className="confirm-card">
            <TriangleAlert size={25} />
            <h2>{confirmation.title}</h2>
            <p>{confirmation.message}</p>
            <div>
              <button className="button secondary" onClick={() => setConfirmation(null)}>
                Cancel
              </button>
              <button
                className="button primary"
                onClick={() => {
                  const run = confirmation.confirm;
                  setConfirmation(null);
                  run();
                }}
              >
                Confirm
              </button>
            </div>
          </section>
        </Modal>
      )}
    </div>
  );
}
