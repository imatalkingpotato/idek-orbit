import type {Thought,Activity} from './orbit';
// Today's entries and reaction totals only grow. Merge overlapping reads/writes
// monotonically so a slower response cannot erase a post or count a click twice.
export function mergeThoughts(current:Thought[],incoming:Thought[],day:string):Thought[]{
 const rows=new Map(current.filter(x=>x.day===day).map(x=>[x.id,x]));
 for(const row of incoming){if(row.day!==day)continue;const old=rows.get(row.id);rows.set(row.id,old?{...row,comfort:Math.max(old.comfort,row.comfort),empathy:Math.max(old.empathy,row.empathy),mine:[...new Set([...old.mine,...row.mine])]}:row);}
 return [...rows.values()].sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
}
export function mergeEvents(current:Activity[],incoming:Activity[]):Activity[]{
 const rows=new Map([...current,...incoming].map(x=>[x.id,x]));
 return [...rows.values()].sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id)).slice(0,12);
}
export type Launch={id:string;x:number;y:number;at:number};
export const FLIGHT_DURATION_MS=2800;
export function flightPoint(origin:{x:number;y:number},target:{x:number;y:number},progress:number){
 const t=Math.max(0,Math.min(1,progress)),e=t*t*t*(t*(t*6-15)+10);
 // Ease into the moving orbit without rotation, overshoot, or a bounce.
 return {x:origin.x+(target.x-origin.x)*e-Math.sin(Math.PI*e)*24,y:origin.y+(target.y-origin.y)*e-Math.sin(Math.PI*e)*32,scale:.92+.08*e,rotation:0};
}
