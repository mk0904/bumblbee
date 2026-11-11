import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Save, Trash2 } from 'lucide-react';
import { PanelHeading } from '../components/ui.jsx';
import { WorldMap } from '../components/WorldMap.jsx';

export function Planner({ mission, onClose: _onClose, onSave, busy }) {
  const [name, setName] = useState(mission?.name ?? 'Untitled mission'),
    [waypoints, setWaypoints] = useState(mission?.waypoints ?? []),
    [selected, setSelected] = useState(-1),
    [altitude, setAltitude] = useState(mission?.defaultAltitude ?? 8),
    [speed, setSpeed] = useState(mission?.defaultSpeed ?? 1);
  const listRef = useRef(null);
  useEffect(() => {
    const list = listRef.current;
    const row = list?.children[selected];
    if (!row) return;
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = top + row.offsetHeight - list.clientHeight;
  }, [selected, waypoints.length]);
  const move = (i, patch) =>
    setWaypoints((points) => points.map((w, index) => (index === i ? { ...w, ...patch } : w)));
  const add = (p) => {
    if (waypoints.length < 20) {
      setWaypoints((points) => [...points, { ...p, altitude, speed }]);
      setSelected(waypoints.length);
    }
  };
  const reorder = (i, direction) =>
    setWaypoints((points) => {
      const next = [...points];
      const j = i + direction;
      [next[i], next[j]] = [next[j], next[i]];
      setSelected(j);
      return next;
    });
  return (
    <section className="planner-page">
      <div className="page-title">
        <h1 className="planner-heading">Plan a mission</h1>
        <button
          className="button primary planner-save-icon"
          aria-label="Save mission"
          title="Save mission"
          disabled={busy || !name.trim()}
          onClick={() =>
            onSave({
              name,
              defaultAltitude: altitude,
              defaultSpeed: speed,
              waypoints: waypoints.map(({ x, y, altitude, speed }) => ({ x, y, altitude, speed: speed ?? 1 })),
              ...(mission ? { revision: mission.revision } : {}),
            })
          }
        >
          <Save size={18} />
        </button>
      </div>
      <div className="planner-layout">
        <div className="panel planner-map">
          <WorldMap
            editable
            waypoints={waypoints}
            selected={selected}
            onSelect={setSelected}
            onAdd={add}
            onMove={move}
          />

        </div>
        <div className="planner-sidebar">
          <div className="panel mission-details">
            <PanelHeading number="02" title="Mission details" />
            <label>
              <span className="field-border-label">Mission name</span>
              <input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span className="field-border-label">Default altitude</span><span className="field-unit">m</span>
              <input
                type="number"
                min="2"
                max="15"
                value={altitude}
                onChange={(e) => setAltitude(Number(e.target.value))}
              />
            </label>
            <label className="mission-default-speed"><span className="field-border-label">Default speed</span><span className="field-unit">m/s</span><input aria-label="Default speed" type="number" min="0.2" max="2" step="0.1" value={speed} onChange={e => setSpeed(Number(e.target.value))} /></label>
          </div>
          <div className="panel waypoint-panel">
            <PanelHeading title={`Waypoints (${waypoints.length}/20)`}>
              <button
                className="icon-button"
                title="Add waypoint at origin"
                aria-label="Add waypoint at origin"
                disabled={waypoints.length >= 20}
                onClick={() => add({ x: 0, y: 0 })}
              >
                <Plus size={16} />
              </button>
            </PanelHeading>
            {!waypoints.length && (
              <div className="waypoint-empty">Click the map or + to add your first waypoint.</div>
            )}
            <ol ref={listRef} className="waypoint-list" aria-label="Mission waypoints">
              {waypoints.map(
                (w, i) =>
                  (
                    <li className={`waypoint-editor ${selected === i ? 'selected' : ''}`} key={i}>
                      <div className="waypoint-editor-top">
                        <span className="waypoint-index">{String(i + 1).padStart(2, '0')}</span>
                        <button className="waypoint-focus" onClick={() => setSelected(i)} aria-label={`Select waypoint ${i + 1}`}><span>{String(i + 1).padStart(2, '0')}</span>Waypoint</button>
                        <div className="waypoint-action-tray"><button
                          className="icon-button"
                          aria-label={`Move waypoint ${i + 1} earlier`}
                          disabled={i === 0}
                          onClick={() => reorder(i, -1)}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Move waypoint ${i + 1} later`}
                          disabled={i === waypoints.length - 1}
                          onClick={() => reorder(i, 1)}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          className="icon-button danger-text danger-action"
                          aria-label={`Remove waypoint ${i + 1}`}
                          onClick={() =>
                            setWaypoints((points) => points.filter((_, index) => index !== i))
                          }
                        >
                          <Trash2 size={13} />
                        </button></div>
                      </div>
                      <div className="coordinate-inputs">
                        {['x', 'y', 'altitude', 'speed'].map((field) => (
                          <label key={field}>
                            <span>{field === 'altitude' ? 'Alt' : field === 'speed' ? 'Speed' : field.toUpperCase()}<small>{field === 'speed' ? 'm/s' : 'm'}</small></span>
                            <input
                              aria-label={`Waypoint ${i + 1} ${field}`}
                              type="number"
                              step="0.1"
                              min={field === 'speed' ? 0.2 : field === 'altitude' ? 2 : -50}
                              max={field === 'speed' ? 2 : field === 'altitude' ? 15 : 50}
                              value={w[field] ?? (field === 'speed' ? 1 : '')}
                              onChange={(e) => move(i, { [field]: Number(e.target.value) })}
                            />
                          </label>
                        ))}
                      </div>
                    </li>
                  ),
              )}
            </ol>

          </div>
        </div>
      </div>
    </section>
  );
}
