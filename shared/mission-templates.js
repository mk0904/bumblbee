/** Bounded local-world route templates. Speeds apply to incoming legs. */
const point = (x, y, altitude = 4) => ({ x: Math.round(x*10)/10, y: Math.round(y*10)/10, altitude: Math.round(altitude*10)/10, speed: 0.5 });
const loop = (count, turns, ascending) => Array.from({length:count},(_,i)=>{
  const t=i/(count-1), angle=t*Math.PI*2*turns;
  return point(8*Math.cos(angle),8*Math.sin(angle),ascending === undefined ? 4 : ascending ? 3+8*t : 11-8*t);
});
export const missionTemplates = [
 {name:'Straight line',waypoints:[point(0,0),point(8,0),point(16,0),point(24,0)]},
 {name:'Square',waypoints:[point(-8,-8),point(8,-8),point(8,8),point(-8,8),point(-8,-8)]},
 {name:'Zigzag',waypoints:Array.from({length:7},(_,i)=>point(-18+i*6,i%2?8:-8))},
 {name:'Circular',waypoints:loop(17,1)},
 {name:'Toroidal up',waypoints:loop(20,2,true)},
 {name:'Toroidal down',waypoints:loop(20,2,false)},
].map(template=>({...template,defaultAltitude:template.waypoints[0].altitude,defaultSpeed:0.5}));
