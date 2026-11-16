import { expect,test } from 'vitest';
import { missionTemplates } from '../../shared/mission-templates.js';
test('all six templates fit world and waypoint bounds with valid speeds',()=>{
 expect(missionTemplates).toHaveLength(6);
 for(const mission of missionTemplates) {
 expect(mission.waypoints.length).toBeLessThanOrEqual(20);
 for(const p of mission.waypoints) {expect(Math.abs(p.x)).toBeLessThanOrEqual(50);expect(Math.abs(p.y)).toBeLessThanOrEqual(50);expect(p.altitude).toBeGreaterThanOrEqual(2);expect(p.altitude).toBeLessThanOrEqual(15);expect(p.speed).toBe(0.5);}
 }
 const up=missionTemplates[4].waypoints, down=missionTemplates[5].waypoints;
 expect(up.every((p,i)=>!i||p.altitude>up[i-1].altitude)).toBe(true);
 expect(down.every((p,i)=>!i||p.altitude<down[i-1].altitude)).toBe(true);
});
