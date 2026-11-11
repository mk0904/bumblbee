import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { FlightConsole } from './FlightConsole.jsx';
import { Modal } from '../components/Modal.jsx';
import { useEffect, useState } from 'react';
import {
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
  LayoutDashboard,
  LogOut,
  Map,
  Plus,
  Radio,
  Settings2,
  ShieldCheck,
  Signal,
  TriangleAlert,
  Wifi,
  X,
} from 'lucide-react';
import { api, requestKey } from '../lib/api.js';
import { terminal, date, duration } from '../lib/format.js';
import { Badge, Empty } from '../components/ui.jsx';
import { useDashboard } from '../lib/use-dashboard.js';

import { Planner } from './Planner.jsx';
import { MissionCards } from './MissionCards.jsx';
import { Report } from './Report.jsx';

export function Workspace({ user: _user, onLogout }) {
  const { data, connection, error, refresh } = useDashboard(onLogout);
  const [page, setPage] = useState('overview'),
    [selectedMissionId, setSelectedMissionId] = useState(null),
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
      <aside className="sidebar" aria-label="Primary navigation">
        <a
          aria-label="bumbl.bee overview"
          className="brand"
          href="#overview"
          onClick={() => navigate('overview')}
        >
          <div className="brand-symbol">
            <span className="rail-monogram">b.</span>
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
        <nav aria-label="Workspace navigation">
          {[
            ['overview', LayoutDashboard, 'Overview'],
            ['missions', Map, 'Mission planner'],
            ['history', Clock3, 'Flight history'],
            ['system', Settings2, 'System & alerts'],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              aria-label={label}
              aria-current={page === id ? 'page' : undefined}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={17} />
              <span className="nav-label" aria-hidden="true">
                {label}
              </span>
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
          <ThemeToggle />
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
              {data.mode === 'demo' ? 'Demo mode' : 'Webots'}
            </span>
            <span className="topbar-separator" />
            <button
              className="icon-button"
              title="View alerts"
              aria-label="View alerts"
              onClick={() => navigate('system')}
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
          {page === 'missions' ? (
            <div className="mission-planning-workspace">
              <section className="saved-plans-panel panel">
                <div className="saved-plans-header"><h1>Mission plans</h1></div>
                <MissionCards missions={data.missions} filter={filter} onNew={() => setEditor({})} onEdit={setEditor} onSelect={mission => {setSelectedMissionId(mission.id);navigate('overview');}} onArchive={archive} />
              </section>
              <Planner key={editor?.id ?? 'new'} mission={editor?.id ? editor : null} busy={busy} onClose={() => setEditor({})} onSave={input => act(async () => {
                await api(editor?.id ? `/missions/${editor.id}` : '/missions', {method:editor?.id ? 'PATCH' : 'POST',body:input});
                setEditor(null);
              },'Mission saved')} />
            </div>
          ) : (
            <>
              {page !== 'overview' && page !== 'history' && page !== 'system' && (
                <div className="page-title">
                  <div>
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
                          missions: 'Local routes, saved with their execution settings.',
                          history: 'Flight sessions, telemetry and command records.',
                          alerts: 'Battery and connection incidents, with acknowledgement history.',
                          system: 'Connection, storage and simulator configuration.',
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
              )}
              {page === 'overview' && (
                <FlightConsole
                  data={data}
                  selectedMission={data.missions.find(m => m.id === selectedMissionId)}
                  active={active}
                  sample={sample}
                  stale={stale}
                  busy={busy}
                  pending={pending}
                  commands={commands}
                  onCommand={command}
                  onStart={start}
                  onMissions={() => navigate('missions')}
                  onHistory={() => navigate('history')}
                  onNewMission={() => {
                    setEditor({});
                    setPage('missions');
                  }}
                  onReconcile={() =>
                    setConfirmation({
                      title: 'Close unconfirmed session?',
                      message:
                        'This records an interrupted session. It does not command or confirm landing.',
                      confirm: () =>
                        act(
                          () => api(`/flights/${active.id}/reconcile`, { method: 'POST' }),
                          'Session marked interrupted; outcome unknown',
                        ),
                    })
                  }
                />
              )}
              {page === 'history' && (
                <section className="flight-history-screen" aria-label="Flight history">
                  <div className="history-heading"><div><h1>Flight history</h1><span>{data.flights.length} recorded flights</span></div><button className="button secondary" onClick={() => navigate('missions')}><Plus size={15} />Plan a mission</button></div>
                  <div className="history-summary-grid">
                    <div><span>Total flights</span><strong>{data.flights.length}</strong></div>
                    <div><span>Completed</span><strong>{data.flights.filter(f=>f.state === 'COMPLETED').length}</strong></div>
                    <div><span>Interrupted / failed</span><strong>{data.flights.filter(f=>['FAILED','INTERRUPTED'].includes(f.state)).length}</strong></div>
                  </div>
                  <div className="panel history-records">
                    {data.flights.length ? <div className="history-record-list">{data.flights.map(f=><article className="history-record" key={f.id}>
                      <div className="history-record-icon"><FileText size={21}/></div>
                      <div className="history-record-name"><h2>{f.snapshot.name}</h2><span>{date(f.startedAt)}{f.adapter === 'demo' ? ' · Demo' : ''}</span></div>
                      <div className="history-duration"><span>Flight time</span><strong>{f.latest ? duration(f.latest.simulationTime) : '—'}</strong></div>
                      <Badge tone={f.state === 'COMPLETED' ? 'green' : terminal(f.state) ? 'amber' : 'neutral'}>{f.state.replaceAll('_',' ')}</Badge>
                      <button className="history-report-button" aria-label={`Open report for ${f.snapshot.name}`} disabled={busy} onClick={()=>showReport(f)}>View report<ArrowUpRight size={15}/></button>
                    </article>)}</div> : <Empty icon={FileText} title="No flights yet">Your recorded missions will appear here.</Empty>}
                  </div>
                </section>
              )}
              {page === 'system' && (
                <section className="system-health-screen" aria-label="System and alerts">
                  <div className="system-health-heading"><h1>System & alerts</h1><button aria-label="Disconnect control session" className="button secondary" onClick={()=>act(async()=>{await api('/auth/logout',{method:'POST'});onLogout();})}><LogOut size={14}/>Disconnect</button></div>
                  <div className="health-tiles">
                    {[['UAV',data.drone.code ?? 'BMBL'],['Simulator',data.drone.connected ? 'Connected' : 'Offline'],['Live channel',connection === 'live' ? 'Connected' : 'Reconnecting'],['Open incidents',openAlerts.length]].map(([label,value])=><div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
                  </div>
                  <div className="health-content">
                    <section className="panel health-incidents"><div className="health-section-heading"><h2>Incidents</h2><Badge tone={openAlerts.length?'amber':'green'}>{openAlerts.length} open</Badge></div>
                      <div className="health-incident-list">{data.alerts.length ? [...data.alerts].reverse().map(a=><article className="health-incident" key={a.id}><TriangleAlert size={18}/><div><h3>{a.title}</h3><p>{a.message}</p><span>{date(a.createdAt)}</span></div><div className="health-incident-action"><Badge tone={a.status==='OPEN'?'amber':'neutral'}>{a.status}</Badge>{a.status==='OPEN' && <button className="button secondary" disabled={busy} onClick={()=>act(()=>api(`/alerts/${a.id}/acknowledgement`,{method:'POST'}),'Alert acknowledged')}><Check size={13}/>Acknowledge</button>}</div></article>) : <Empty icon={ShieldCheck} title="No incidents">Battery and connection incidents appear here.</Empty>}</div>
                    </section>
                    <section className="panel health-configuration"><h2>Connection details</h2><dl>{[['Runtime',data.mode==='demo'?'Demo adapter':'Webots'],['Storage',data.storage],['World',data.world.id],['Coordinate frame',data.world.frame],['Flight area','X/Y ±50 m'],['Altitude range','2–15 m']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                      {data.mode==='demo' && <div className="health-demo"><h3>Demo controls</h3><button className="button secondary" disabled={busy||!active||!data.drone.connected} onClick={()=>act(()=>api('/demo/inject',{method:'POST',body:{kind:'battery'}}),'Synthetic battery set to 18%')}><Battery size={14}/>Low battery</button><button className="button secondary" disabled={busy} onClick={()=>act(()=>api('/demo/inject',{method:'POST',body:{kind:data.drone.connected?'disconnect':'reconnect'}}),'Demo link updated')}><Wifi size={14}/>{data.drone.connected?'Disconnect':'Reconnect'}</button></div>}
                    </section>
                  </div>
                </section>
              )}
            </>
          )}

        </main>
      </div>
      <div className="workspace-notifications" aria-label="Notifications">
        {(error || connection !== 'live') && <ConnectionNotification key={error || connection} message={error ? `Connection issue: ${error}. Retrying automatically.` : 'Live connection interrupted. Reconnecting; displayed data may be outdated.'} />}
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
      </div>
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

function ConnectionNotification({ message }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return <div className="toast error connection-notification" role="alert"><TriangleAlert size={17} /><span>{message}</span><button className="icon-button" aria-label="Dismiss connection notification" onClick={() => setDismissed(true)}><X size={15} /></button></div>;
}
