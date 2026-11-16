import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Empty } from '../components/ui.jsx';
import { WorldMap } from '../components/WorldMap.jsx';
export function MissionCards({ missions, onEdit, onSelect, onNew, onArchive, filter = '' }) {
 const visible=missions.filter(m=>`${m.name} ${m.description}`.toLowerCase().includes(filter.toLowerCase()));
 if(!missions.length) return <Empty title="No saved plans" action={<button className="button secondary" onClick={onNew}><Plus size={14}/>New mission</button>}>Build your first route in the editor.</Empty>;
 if(!visible.length) return <Empty title="No matching plans">Try another name.</Empty>;
 return <div className="mission-collection"><div className="mission-cards">{visible.map(mission=><article className="mission-card" key={mission.id}>
   <button className="mission-tile-select" aria-label={`Select ${mission.name}`} onClick={()=>onSelect(mission)}><div className="mission-mini-map"><WorldMap waypoints={mission.waypoints} compact /></div><h3>{mission.name}</h3></button>
   <div className="mission-tile-actions"><button className="icon-button" title="Edit mission" aria-label={`Edit ${mission.name}`} onClick={()=>onEdit(mission)}><Pencil size={15}/></button><button className="icon-button danger-action" title="Delete mission" aria-label={`Archive ${mission.name}`} onClick={()=>onArchive(mission)}><Trash2 size={15}/></button></div>
 </article>)}</div></div>;
}
