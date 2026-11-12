import {dayKey,nextMidnight,type ReactionKind} from './orbit';
import {archiveDays,dayTimestamp} from './archive';
import {snapshot,applyStream,type DayData,type StoredPost,type StoredEvent} from './shared-state';
const ROOT='https://confirm-bell-default-rtdb.firebaseio.com/idekorbit';
let active='',cache:DayData|null=null,stream:EventSource|null=null,ready=false,online=false,lastRead=0,clockOffset=0;
const listeners=new Set<()=>void>();
export const sharedNow=()=>Date.now()+clockOffset;
const bucket=()=>String(nextMidnight(sharedNow()));
async function request(path:string,init:RequestInit={}){
 const r=await fetch(ROOT+path+'.json',{...init,cache:'no-store',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json',...init.headers}});
 if(!r.ok)throw new Error('연결이 잠시 끊겼어요. 다시 시도해 주세요.');return r.json();
}
function ensureStream(){
 const key=bucket();if(active===key&&stream)return;
 stream?.close();active=key;cache=null;ready=false;online=false;lastRead=0;
 stream=new EventSource(ROOT+'/days/'+key+'.json');
 for(const type of ['put','patch'])stream.addEventListener(type,e=>{if(active!==key)return;try{const event=JSON.parse((e as MessageEvent).data);cache=applyStream(cache,event.path,event.data,type==='patch');ready=true;online=true;lastRead=Date.now();listeners.forEach(fn=>fn())}catch{online=false}});
 stream.onerror=()=>{online=false};stream.addEventListener('cancel',()=>{online=false;stream?.close();stream=null});
}
export function onSharedChange(fn:()=>void){listeners.add(fn);ensureStream();return()=>{listeners.delete(fn);if(!listeners.size){stream?.close();stream=null}}}
export async function readShared(force=false){
 ensureStream();const key=active;
 if(force||!ready||(!online&&Date.now()-lastRead>4000)){
  const data=await request('/days/'+key) as DayData|null;
  if(active!==key)return readShared();
  // Never replace a newer stream event with an older HTTP response.
  if(!online||!ready||force){cache=data;ready=true}lastRead=Date.now();
 }
 if(bucket()!==key)return readShared();
 return snapshot(cache,sharedNow());
}
async function ensureDay(key:string){
 const expiresAt=Number(key);
 await request('/days/'+key+'/expiresAt',{method:'PUT',body:JSON.stringify(expiresAt)});
 await request('/index/'+key,{method:'PUT',body:JSON.stringify(expiresAt)});
}
async function createOnce<T>(path:string,value:unknown):Promise<T>{
 try{return await request(path,{method:'PUT',body:JSON.stringify(value)}) as T}
 catch(error){const existing=await request(path);if(existing)return existing as T;throw error}
}
async function imageData(file?:File|null){
 if(!file)return '';
 const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');let size=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));let result='';
 for(let attempt=0;attempt<5;attempt++){canvas.width=Math.max(1,Math.round(bitmap.width*size));canvas.height=Math.max(1,Math.round(bitmap.height*size));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);result=canvas.toDataURL('image/webp',.8-attempt*.07);if(result.length<=700000)break;size*=.8}bitmap.close();
 if(result.length>700000)throw Error('이미지가 너무 커요. 조금 작은 이미지로 보내 주세요.');return result;
}
export async function sendShared(id:string,body:string,file?:File|null){
 const imageUrl=await imageData(file),key=bucket();await ensureDay(key);
 const saved=await createOnce<StoredPost>('/days/'+key+'/posts/'+id,{body,createdAt:{'.sv':'timestamp'},...(imageUrl?{imageUrl}:{})});
 // Acknowledgment supplies server time, keeping the midnight clock in sync.
 clockOffset=saved.createdAt-Date.now();
 if(active===key){cache=applyStream(cache,'/posts/'+id,saved);ready=true}
 return {id,...saved,day:dayKey(saved.createdAt),comfort:0,empathy:0,mine:[] as ReactionKind[]};
}
export async function reactShared(thoughtId:string,kind:ReactionKind,id:string){
 const key=bucket();
 const event=await createOnce<StoredEvent>('/days/'+key+'/events/'+id,{thoughtId,kind,createdAt:{'.sv':'timestamp'}});
 if(active!==key)throw Error('새로운 하루의 궤도가 열렸어요.');
 cache=applyStream(cache,'/events/'+id,event);
 const state=snapshot(cache,sharedNow()),thought=state.thoughts.find(x=>x.id===thoughtId);
 if(!thought)throw Error('이 속마음은 자정에 흘려보냈어요.');
 return {day:state.day,counts:{comfort:thought.comfort,empathy:thought.empathy},event:{id,...event,body:thought.body}};
}

export async function listArchiveDays(){return archiveDays(await request('/index'),sharedNow())}
export async function readArchive(day:string){
 const n=dayTimestamp(day);if(n===null||day>=dayKey(sharedNow()))throw Error('지난 날짜의 궤도를 선택해 주세요.');
 const data=await request('/days/'+nextMidnight(n)) as DayData|null;
 return snapshot(data,n);
}
