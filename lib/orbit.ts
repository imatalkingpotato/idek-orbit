export const LIMIT=240;
export const ORBIT_COUNT=8;
export const EARTH_ORBIT_INDEX=2;
export function dayKey(now=Date.now()) { return new Date(now+9*3600000).toISOString().slice(0,10); }
export function nextMidnight(now=Date.now()) { return Date.parse(dayKey(now)+'T00:00:00+09:00')+86400000; }
export function dateLabel(now:number) {
  const d=new Date(now+9*3600000);
  return `서기 ${d.getUTCFullYear()}년 ${String(d.getUTCMonth()+1).padStart(2,'0')}월 ${String(d.getUTCDate()).padStart(2,'0')}일 ${'일월화수목금토'[d.getUTCDay()]}요일`;
}
export function cleanBody(value:unknown) {
  if(typeof value!=='string') return null;
  const body=value.trim();
  return body.length>0&&body.length<=LIMIT?body:null;
}
export function hash(value:string) { let n=2166136261; for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x85ebca6b);n^=n>>>13;return n>>>0; }
export function orbitPoint(t:number,ring:number,seed:number,w:number,h:number) {
  const spacing=.24+ring*(.76/(ORBIT_COUNT-1));
  const radius=w*.455*spacing;
  const angle=-t*(.048+ring*.006)+seed;
  const vertical=Math.min(h*.40,w*.29)*spacing;
  const x=Math.cos(angle)*radius,y=Math.sin(angle)*vertical;
  const tilt=-.06;
  return {x:w/2+x*Math.cos(tilt)-y*Math.sin(tilt),y:h/2+x*Math.sin(tilt)+y*Math.cos(tilt)};
}

export function ganjiLabel(now:number) {
  const parts=new Intl.DateTimeFormat('ko-KR-u-ca-chinese',{year:'numeric',timeZone:'Asia/Seoul'}).formatToParts(new Date(now));
  return (parts.find(p=>String(p.type)==='yearName')?.value||'')+'년';
}
export type ReactionKind='comfort'|'empathy';
export type OrbitComment={id:string;body:string;createdAt:number};
export type Thought={id:string;body:string;day:string;createdAt:number;imageUrl?:string|null;comfort:number;empathy:number;mine:ReactionKind[];comments?:OrbitComment[]};
export type Activity={id:string;thoughtId:string;body:string;kind:ReactionKind|'comment';createdAt:number};

// Fill the least occupied orbit first, preserving older posts when new ones arrive.
export function thoughtOrbits(items:Thought[]){
 const counts=Array<number>(ORBIT_COUNT).fill(0),layout=new Map<string,number>();
 for(const item of [...items].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))){
  const preferred=hash(item.id)%ORBIT_COUNT,min=Math.min(...counts);
  for(let offset=0;offset<ORBIT_COUNT;offset++){const ring=(preferred+offset)%ORBIT_COUNT;if(counts[ring]===min){layout.set(item.id,ring);counts[ring]++;break;}}
 }
 return layout;
}
