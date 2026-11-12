import {dayKey,type Thought,type Activity} from './orbit.ts';
export type StoredPost={body:string;createdAt:number;imageUrl?:string};
export type StoredEvent={thoughtId:string;kind:'comfort'|'empathy';createdAt:number};
export type StoredComment={thoughtId:string;body:string;createdAt:number};
export type DayData={expiresAt?:number;posts?:Record<string,StoredPost>;events?:Record<string,StoredEvent>;comments?:Record<string,StoredComment>};
export function snapshot(data:DayData|null,now:number){
 const day=dayKey(now),posts=data?.posts||{},events:Activity[]=[];
 const thoughts:Thought[]=Object.entries(posts).map(([id,p])=>({id,body:p.body,createdAt:p.createdAt,day,imageUrl:p.imageUrl||null,comfort:0,empathy:0,mine:[],comments:[]}));
 const lookup=new Map(thoughts.map(p=>[p.id,p]));
 for(const [id,e] of Object.entries(data?.events||{})){const p=lookup.get(e.thoughtId);if(!p||!['comfort','empathy'].includes(e.kind))continue;p[e.kind]++;events.push({id,...e,body:p.body})}
 for(const [id,c] of Object.entries(data?.comments||{})){const p=lookup.get(c.thoughtId);if(!p||typeof c.body!=='string'||!c.body.trim()||!Number.isFinite(c.createdAt))continue;p.comments!.push({id,body:c.body,createdAt:c.createdAt});events.push({id:`comment:${id}`,thoughtId:c.thoughtId,body:p.body,kind:'comment',createdAt:c.createdAt})}
 for(const p of thoughts)p.comments!.sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
 thoughts.sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));events.sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id));
 return {thoughts,events:events.slice(0,12),day,now};
}
export function applyStream(data:DayData|null,path:string,value:unknown,patch=false):DayData|null{
 let root=structuredClone(data||{}) as Record<string,unknown>;
 const put=(path:string,value:unknown)=>{const parts=path.split('/').filter(Boolean);if(!parts.length){root=(value||{}) as Record<string,unknown>;return}let node=root;for(const k of parts.slice(0,-1)){if(!node[k]||typeof node[k]!=='object')node[k]={};node=node[k] as Record<string,unknown>}if(value===null)delete node[parts.at(-1)!];else node[parts.at(-1)!]=value};
 if(patch&&value&&typeof value==='object')for(const [k,v] of Object.entries(value))put(path+'/'+k,v);else put(path,value);
 return root as DayData;
}
