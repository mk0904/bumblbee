import { useState } from 'react';
import { ChevronLeft, ChevronRight, CircleHelp, Plus, Save, Trash2 } from 'lucide-react';
import { Badge, PanelHeading } from '../components/ui.jsx';
import { WorldMap } from '../components/WorldMap.jsx';

export function Planner({ mission, onClose, onSave, busy }) {
  const [name, setName] = useState(mission?.name ?? 'Untitled mission'),
    [description, setDescription] = useState(mission?.description ?? ''),
    [waypoints, setWaypoints] = useState(mission?.waypoints ?? []),
    [selected, setSelected] = useState(-1),
    [altitude, setAltitude] = useState(8);
  const move = (i, patch) =>
    setWaypoints((points) => points.map((w, index) => (index === i ? { ...w, ...patch } : w)));
  const add = (p) => {
    if (waypoints.length < 20) {
      setWaypoints((points) => [...points, { ...p, altitude }]);
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
        <div>
          <button className="text-button back" onClick={onClose}>
            <ChevronLeft size={14} /> Back to missions
          </button>
          <h1>
            {mission ? 'Edit mission' : 'Plan a new mission'}
            <span className="title-dot">.</span>
          </h1>
          <p>Place your route in the training world. Each point is a local coordinate.</p>
        </div>
        <button
          className="button primary"
          disabled={busy || !name.trim()}
          onClick={() =>
            onSave({
              name,
              description,
              waypoints: waypoints.map(({ x, y, altitude }) => ({ x, y, altitude })),
              ...(mission ? { revision: mission.revision } : {}),
            })
          }
        >
          <Save size={15} /> Save mission
        </button>
      </div>
      <div className="planner-layout">
        <div className="panel planner-map">
          <PanelHeading number="01" title="Route editor">
            <Badge>LOCAL XY</Badge>
          </PanelHeading>
          <WorldMap
            editable
            waypoints={waypoints}
            selected={selected}
            onSelect={setSelected}
            onAdd={add}
            onMove={move}
          />
          <div className="map-note">
            <CircleHelp size={14} /> Click to add a point, drag to move. Scenery does not imply
            obstacle avoidance.
          </div>
        </div>
        <div className="planner-sidebar">
          <div className="panel mission-details">
            <PanelHeading number="02" title="Mission details" />
            <label>
              Mission name
              <input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Description
              <textarea
                maxLength={500}
                placeholder="What is this flight for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label>
              Default altitude <span className="muted">metres</span>
              <input
                type="number"
                min="2"
                max="15"
                value={altitude}
                onChange={(e) => setAltitude(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="panel waypoint-panel">
            <PanelHeading number="03" title={`Waypoints (${waypoints.length}/20)`}>
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
            <div className="waypoint-list">
              {waypoints.map((w, i) => (
                <div
                  className={`waypoint-editor ${selected === i ? 'selected' : ''}`}
                  key={i}
                  onClick={() => setSelected(i)}
                >
                  <div className="waypoint-editor-top">
                    <span className="waypoint-index">{String(i + 1).padStart(2, '0')}</span>
                    <strong>Waypoint {i + 1}</strong>
                    <button
                      className="icon-button"
                      aria-label={`Move waypoint ${i + 1} earlier`}
                      disabled={i === 0}
                      onClick={() => reorder(i, -1)}
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Move waypoint ${i + 1} later`}
                      disabled={i === waypoints.length - 1}
                      onClick={() => reorder(i, 1)}
                    >
                      <ChevronRight size={13} />
                    </button>
                    <button
                      className="icon-button danger-text"
                      aria-label={`Remove waypoint ${i + 1}`}
                      onClick={() =>
                        setWaypoints((points) => points.filter((_, index) => index !== i))
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="coordinate-inputs">
                    {['x', 'y', 'altitude'].map((field) => (
                      <label key={field}>
                        {field === 'altitude' ? 'ALT' : field.toUpperCase()}
                        <input
                          aria-label={`Waypoint ${i + 1} ${field}`}
                          type="number"
                          step="0.1"
                          min={field === 'altitude' ? 2 : -50}
                          max={field === 'altitude' ? 15 : 50}
                          value={w[field]}
                          onChange={(e) => move(i, { [field]: Number(e.target.value) })}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bounds-note">
              Flight bounds ±50 m · altitude 2–15 m<br />
              Empty routes can be saved as drafts.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
