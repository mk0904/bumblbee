import { ArrowUpRight, Play, Plus, Route, Trash2 } from 'lucide-react';
import { Badge, Empty } from '../components/ui.jsx';
import { WorldMap } from '../components/WorldMap.jsx';

export function MissionCards({
  missions,
  onEdit,
  onStart,
  onNew,
  onArchive,
  disabled,
  filter = '',
}) {
  const visible = missions.filter((m) =>
    `${m.name} ${m.description}`.toLowerCase().includes(filter.toLowerCase()),
  );
  if (!missions.length)
    return (
      <Empty
        title="No missions yet"
        action={
          <button className="button primary" onClick={onNew}>
            <Plus size={15} /> Create mission
          </button>
        }
      >
        Create a route in the local training world to begin.
      </Empty>
    );
  if (!visible.length) return <Empty title="No missions match">Try another mission name.</Empty>;
  return (
    <div className="mission-cards">
      {visible.map((mission, i) => (
        <article className="mission-card" key={mission.id}>
          <div className="mission-card-top">
            <span className="mission-number">M / {String(i + 1).padStart(3, '0')}</span>
            <Badge tone={mission.waypoints.length ? 'green' : 'neutral'}>
              {mission.waypoints.length ? 'READY' : 'DRAFT'}
            </Badge>
          </div>
          <div className="mission-mini-map">
            <WorldMap waypoints={mission.waypoints} compact />
          </div>
          <h3>{mission.name}</h3>
          <p>{mission.description || 'Local training mission'}</p>
          <div className="mission-card-meta">
            <span>
              <Route size={13} />
              {mission.waypoints.length} waypoints
            </span>
            <span>Rev {mission.revision}</span>
          </div>
          <div className="mission-card-actions">
            <button className="button secondary" onClick={() => onEdit(mission)}>
              Edit route <ArrowUpRight size={13} />
            </button>
            <button
              className="button primary"
              disabled={disabled || !mission.waypoints.length}
              onClick={() => onStart(mission)}
            >
              <Play size={13} /> Start
            </button>
            <button
              className="icon-button"
              title="Archive mission"
              aria-label={`Archive ${mission.name}`}
              onClick={() => onArchive(mission)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
