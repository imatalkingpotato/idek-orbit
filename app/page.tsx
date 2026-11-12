'use client';
import {useEffect,useRef,useState} from 'react';
import {readShared,sendShared,reactShared,onSharedChange,listArchiveDays,readArchive} from '../lib/shared';
import {LIMIT,dateLabel,ganjiLabel,dayKey,nextMidnight,type Thought,type Activity,type ReactionKind} from '../lib/orbit';
import {archiveLabel,dayTimestamp} from '../lib/archive';
import Scene,{ReactionButtons,ReactionIcon} from './scene';
import Music from './music';
import CloudPassage from './clouds';
import {mergeThoughts,mergeEvents,FLIGHT_DURATION_MS,type Launch} from '../lib/live';
const DEMO=['오늘은 아무것도 컨펌받고 싶지 않다.','퇴근이라는 행성에 착륙하고 싶어요','이 덱을 떠나고 싶지만…','사실 아까 그 아이디어 좋았어요.','오늘도 무사히 지나가기를','말하지 못한 마음은 여기에.','내일의 나에게 맡겨둡니다','다들 고생 많았어, 진짜.'];
export default function Home(){
 const [now,setNow]=useState(0),[items,setItems]=useState<Thought[]>([]),[text,setText]=useState(''),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState('');
 const [intro,setIntro]=useState(true),[replay,setReplay]=useState(0),[paused,setPaused]=useState(false),[sending,setSending]=useState(false),[loaded,setLoaded]=useState(false),[connected,setConnected]=useState(false),[demo,setDemo]=useState(false);
 const [notice,setNotice]=useState(''),[noticeKey,setNoticeKey]=useState(0),[selected,setSelected]=useState<string|null>(null),[reactionBusy,setReactionBusy]=useState(''),[events,setEvents]=useState<Activity[]>([]),[fresh,setFresh]=useState('');
 const [archive,setArchive]=useState(''),[dates,setDates]=useState<string[]>([]),[archiveLoading,setArchiveLoading]=useState(false);
 const view=useRef(''),viewVersion=useRef(0),deepLink=useRef('');
 const [launch,setLaunch]=useState<Launch|null>(null);
 const [ghosts,setGhosts]=useState<Thought[]>([]),[resetAt,setResetAt]=useState(0);
 const field=useRef<HTMLTextAreaElement>(null),upload=useRef<HTMLInputElement>(null),reading=useRef<HTMLDivElement>(null),offset=useRef(0),day=useRef(''),requestId=useRef(''),polling=useRef(false),itemRef=useRef(items),ghostTimer=useRef<ReturnType<typeof setTimeout>|null>(null),isDemo=useRef(false);
 const reactionQueue=useRef<{id:string;kind:ReactionKind;body:string;requestId:string}[]>([]),reactionRunning=useRef(false);
 itemRef.current=items;
 const say=(value:string)=>{setNotice(value);setNoticeKey(k=>k+1)};
 function resetDay(newDay:string){if(day.current===newDay)return;day.current=newDay;setGhosts(itemRef.current);setResetAt(Date.now());setItems([]);setSelected(null);setEvents([]);setFresh('');setLaunch(null);if(ghostTimer.current)clearTimeout(ghostTimer.current);ghostTimer.current=setTimeout(()=>setGhosts([]),2300);say('새로운 하루의 궤도가 열렸어요.');}
 async function sync(){
  if(polling.current||document.hidden||view.current)return;polling.current=true;const version=viewVersion.current;
  try{const data=await readShared();
   if(view.current||version!==viewVersion.current||data.day<day.current)return;
   offset.current=data.now-Date.now();const changed=data.day!==day.current;if(changed)resetDay(data.day);setNow(Date.now()+offset.current);setItems(old=>mergeThoughts(old,data.thoughts.filter(x=>x.id!==requestId.current||old.some(row=>row.id===x.id)),data.day));setEvents(old=>mergeEvents(changed?[]:old,data.events));setConnected(true);setLoaded(true);if(deepLink.current&&data.thoughts.some(x=>x.id===deepLink.current)){setSelected(deepLink.current);deepLink.current='';}
  }catch{if(version===viewVersion.current){setConnected(false);setLoaded(true);}}finally{polling.current=false;}
 }
 async function refreshDates(){try{setDates(await listArchiveDays())}catch{setDates(old=>[...new Set([dayKey(),...old])].sort().reverse())}}
 async function chooseDay(value:string){
  if(sending||reactionRunning.current)return;
  const target=value===dayKey(Date.now()+offset.current)?'':value;
  view.current=target;const version=++viewVersion.current;setArchive(target);setSelected(null);setItems([]);setEvents([]);setGhosts([]);setFresh('');setLaunch(null);setNotice('');setArchiveLoading(!!target);setLoaded(false);
  const url=new URL(location.href);if(target)url.searchParams.set('day',target);else url.searchParams.delete('day');url.searchParams.delete('thought');history.replaceState(null,'',url);
  if(!target){if(isDemo.current){setItems(DEMO.map((body,i)=>({id:`demo-${i}`,body,day:day.current,createdAt:Date.now(),imageUrl:null,comfort:0,empathy:0,mine:[]})));setLoaded(true)}else void sync();return}
  try{const data=isDemo.current?{thoughts:DEMO.slice(0,3).map((body,i)=>({id:`archive-demo-${i}`,body,day:target,createdAt:dayTimestamp(target)!,imageUrl:null,comfort:i+1,empathy:3-i,mine:[] as ReactionKind[]})),events:[] as Activity[]}:await readArchive(target);if(version!==viewVersion.current)return;setItems(data.thoughts);setEvents(data.events);setLoaded(true);if(deepLink.current&&data.thoughts.some(x=>x.id===deepLink.current)){setSelected(deepLink.current);deepLink.current='';}}
  catch{if(version===viewVersion.current){say('이 날짜의 궤도를 불러오지 못했어요.');setLoaded(true)}}
  finally{if(version===viewVersion.current)setArchiveLoading(false)}
 }
 useEffect(()=>{
  isDemo.current=new URLSearchParams(location.search).has('demo');setDemo(isDemo.current);const n=Date.now();day.current=dayKey(n);setNow(n);
  const params=new URLSearchParams(location.search);deepLink.current=params.get('thought')||'';const requested=params.get('day')||'';
  if(!isDemo.current){void refreshDates();if(dayTimestamp(requested)!==null&&requested<day.current)void chooseDay(requested)}
  const unsubscribe=isDemo.current?()=>{}:onSharedChange(()=>void sync());
  if(isDemo.current){setDates([dayKey(n),dayKey(n-86400000)]);setItems(DEMO.map((body,i)=>({id:`demo-${i}`,body,day:day.current,createdAt:n,imageUrl:null,comfort:0,empathy:0,mine:[]})));setLoaded(true);}else sync();
  const timer=setInterval(()=>{const n=Date.now()+offset.current;setNow(n);if(dayKey(n)!==day.current){if(view.current)day.current=dayKey(n);else resetDay(dayKey(n));if(!isDemo.current){void refreshDates();sync()}}},250);
  const poll=setInterval(()=>{if(!isDemo.current)sync()},1000);const visible=()=>{if(!document.hidden&&!isDemo.current)sync()};document.addEventListener('visibilitychange',visible);
  return()=>{unsubscribe();clearInterval(timer);clearInterval(poll);if(ghostTimer.current)clearTimeout(ghostTimer.current);document.removeEventListener('visibilitychange',visible)};
 },[]);
 useEffect(()=>{if(!intro)return;const t=setTimeout(()=>setIntro(false),matchMedia('(prefers-reduced-motion: reduce)').matches?1800:9500);return()=>clearTimeout(t)},[intro,replay]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),notice==='속마음이 궤도에 안착했어요.'?5000:11200);return()=>clearTimeout(t)},[noticeKey]);
 useEffect(()=>{if(!launch)return;const t=setTimeout(()=>{setLaunch(null);say('속마음이 궤도에 안착했어요.')},matchMedia('(prefers-reduced-motion: reduce)').matches?0:FLIGHT_DURATION_MS);return()=>clearTimeout(t)},[launch]);
 useEffect(()=>{if(!fresh)return;const t=setTimeout(()=>setFresh(''),12000);return()=>clearTimeout(t)},[fresh]);
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 useEffect(()=>{if(!selected)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null)};const outside=(e:PointerEvent)=>{const el=e.target as Element;if(!reading.current?.contains(el)&&!el.closest('.thought'))setSelected(null)};document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside)}},[selected]);
 function attach(f?:File){if(!f)return;if(!['image/jpeg','image/png','image/gif','image/webp'].includes(f.type)){say('JPG, PNG, GIF, WebP 이미지를 첨부해 주세요.');return}if(f.size>5*1024*1024){say('이미지는 5MB 이하로 첨부해 주세요.');return}setFile(f);requestId.current='';}
 async function send(e:React.FormEvent){
  e.preventDefault();if(view.current||!text.trim()||sending||reactionRunning.current)return;setSending(true);setNotice('');const body=text.trim();requestId.current ||= crypto.randomUUID();
  try{let thought:Thought;
   if(demo)thought={id:requestId.current,body,day:dayKey(),createdAt:Date.now(),imageUrl:file?URL.createObjectURL(file):null,comfort:0,empathy:0,mine:[]};
   else thought=await sendShared(requestId.current,body,file);
   if(thought.day===dayKey(Date.now()+offset.current)){const rect=field.current?.getBoundingClientRect();setLaunch({id:thought.id,x:rect?rect.left+rect.width/2:innerWidth/2,y:rect?rect.top+rect.height/2:innerHeight-90,at:performance.now()});setItems(old=>mergeThoughts(old,[thought],thought.day));setFresh(thought.id)}
   setText('');setFile(null);if(upload.current)upload.current.value='';requestId.current='';field.current?.focus();
  }catch(e){say(e instanceof Error?e.message:'보내지 못했어요. 다시 시도해 주세요.')}finally{setSending(false)}
 }
 async function react(id:string,kind:ReactionKind){
  if(view.current||sending)return;const item=itemRef.current.find(x=>x.id===id);if(!item)return;
  reactionQueue.current.push({id,kind,body:item.body,requestId:crypto.randomUUID()});
  if(reactionRunning.current)return;reactionRunning.current=true;setReactionBusy('sending');
  try{while(reactionQueue.current.length){const entry=reactionQueue.current.shift()!;
   try{
    let confirmed:{day:string;counts:{comfort:number;empathy:number};event:Activity}|null=null;
    if(!isDemo.current)confirmed=await reactShared(entry.id,entry.kind,entry.requestId);
    if(confirmed&&confirmed.day!==day.current)continue;
    setItems(old=>old.map(x=>x.id!==entry.id?x:{...x,comfort:confirmed?Math.max(x.comfort,confirmed.counts.comfort):x.comfort+(entry.kind==='comfort'?1:0),empathy:confirmed?Math.max(x.empathy,confirmed.counts.empathy):x.empathy+(entry.kind==='empathy'?1:0),mine:x.mine.includes(entry.kind)?x.mine:[...x.mine,entry.kind]}));
    setEvents(old=>mergeEvents(old,[confirmed?.event||{id:entry.requestId,thoughtId:entry.id,body:entry.body,kind:entry.kind,createdAt:Date.now()}]));
   }catch(error){say(error instanceof Error?error.message:'반응을 보내지 못했어요.');}
  }}finally{reactionRunning.current=false;setReactionBusy('');if(!isDemo.current)sync();}
 }
 const remaining=now?Math.max(0,Math.floor((nextMidnight(now)-now)/1000)):0,clock=[Math.floor(remaining/3600),Math.floor(remaining%3600/60),remaining%60].map(n=>String(n).padStart(2,'0')).join(':');
 const displayTime=archive?dayTimestamp(archive)!:now;
 const activeItem=items.find(x=>x.id===selected),recentEvents=events.slice(0,5);
 return <main><div className="space" inert={intro||undefined}>
  <header><div className="brand-block"><a className="brand" href={import.meta.env.BASE_URL} aria-label="이덱떠 궤도 홈"><span className="brand-line"><i/><span>이덱떠 궤도</span></span><span className="brand-en">THE ORBIT OF UNSAID THINGS</span></a><button className="intro-replay" onClick={()=>{setIntro(true);setReplay(v=>v+1)}}>인트로 다시 보기</button></div>
   <div className="date"><h1>{now?dateLabel(displayTime):'오늘의 궤도'}</h1><span className="ganji" title="음력 연도 기준">{now?ganjiLabel(displayTime):''}</span><select className="archive-select" aria-label="날짜별 궤도" value={archive||dayKey(now||Date.now())} disabled={sending||!!reactionBusy} onChange={e=>void chooseDay(e.target.value)}>{[...new Set([dayKey(now||Date.now()),...dates,...(archive?[archive]:[])])].sort().reverse().map(d=><option key={d} value={d}>{archiveLabel(d)}{d===dayKey(now||Date.now())?' · 오늘':''}</option>)}</select></div>
   <aside className="activity" aria-label="실시간 공감과 위로 소식"><span className="activity-label"><i/>{archive?'그날의 소식':'궤도의 소식'}</span>{recentEvents.length?<div className="activity-list" data-count={recentEvents.length} style={{height:recentEvents.length*34}}>{recentEvents.map((event,index)=><div key={event.id} className="activity-slot" style={{transform:`translateY(${index*34}px)`}}><div className="activity-event"><ReactionIcon kind={event.kind}/><p><q>{event.body}</q><span>{event.kind==='comfort'?'위로를':'공감을'} 받았습니다</span></p></div></div>)}</div>:<p className="activity-empty">아직 고요한 궤도</p>}</aside>
  </header>
  <Scene items={items} paused={paused} intro={intro} selected={selected} select={setSelected} react={react} busy={archive?'archive':reactionBusy} fresh={fresh} launch={launch} ghosts={ghosts} resetAt={resetAt} loaded={loaded}/>
  <section className="composer" aria-label="속마음 보내기"><div className="composer-label"><span>{demo?'미리보기':!connected&&loaded?'연결을 기다리고 있어요':''}</span><span>{items.length}개의 속마음</span></div>
   {!archive&&file&&preview&&<div className="attachment"><img src={preview} alt="첨부할 이미지"/><span>{file.name}</span><button type="button" aria-label="첨부 이미지 삭제" disabled={sending} onClick={()=>{setFile(null);requestId.current='';if(upload.current)upload.current.value=''}}>×</button></div>}
   {!archive?<form onSubmit={send}><input type="file" ref={upload} accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" tabIndex={-1} onChange={e=>attach(e.target.files?.[0])}/><button className="attach-button" type="button" aria-label="이미지 첨부" disabled={sending} onClick={()=>upload.current?.click()}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 5 5 3-3 4 4"/></svg></button><label className="sr-only" htmlFor="heart">나의 속마음</label><textarea id="heart" ref={field} value={text} onChange={e=>{setText(e.target.value);requestId.current=''}} onPaste={e=>{const image=Array.from(e.clipboardData.files).find(x=>x.type.startsWith('image/'));if(image){e.preventDefault();attach(image)}}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} placeholder="나의 속마음을 이야기해 보세요." maxLength={LIMIT} rows={1} disabled={sending}/><span className="character-count">{text.length}/{LIMIT}</span>
    <button type="submit" className="send" disabled={!text.trim()||sending||!!reactionBusy} aria-label={sending?'속마음 보내는 중':'속마음 궤도로 보내기'}><span className="send-label">전송</span>{sending&&<span className="sending-ring"/>}</button>
    <button className="motion-button" type="button" onClick={()=>setPaused(!paused)} aria-pressed={paused} aria-label={paused?'궤도 움직임 재개':'궤도 움직임 멈추기'}><svg viewBox="0 0 24 24" aria-hidden="true">{paused?<path d="m8 5 12 7-12 7Z"/>:<><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>}</svg></button>
   </form>:<div className="archive-summary"><span>{archiveLoading?'지난 궤도를 불러오는 중…':'지난 궤도 · 읽기 전용'}</span><button onClick={()=>void chooseDay(dayKey())}>오늘의 궤도로 돌아가기</button></div>}<div className="composer-foot">{!archive&&<span><b>{clock}</b> 후 새 궤도</span>}{demo&&<button type="button" onClick={()=>{setGhosts(items);setResetAt(Date.now());setItems([]);setSelected(null);setEvents([]);if(ghostTimer.current)clearTimeout(ghostTimer.current);ghostTimer.current=setTimeout(()=>setGhosts([]),2300)}}>자정 연출 미리보기</button>}</div><div key={noticeKey} className={`notice ${notice==='속마음이 궤도에 안착했어요.'?'landed-notice':''}`} role="status">{notice}</div>
  </section><Music/><footer>이덱떠 궤도 © {now?new Date(now).getFullYear():''}</footer>
  {activeItem&&<div ref={reading} className="reading" role="dialog" aria-modal="false" aria-label="속마음 자세히 보기"><button className="close" aria-label="닫기" onClick={()=>setSelected(null)}>×</button><p className="full-thought">{activeItem.body}</p>{activeItem.imageUrl&&<img className="full-image" src={activeItem.imageUrl} alt="속마음에 첨부한 이미지"/>}<ReactionButtons item={activeItem} onReact={react} busy={archive?'archive':reactionBusy} labels/></div>}
 </div>{intro&&<div key={replay} className="intro" role="dialog" aria-modal="true" aria-label="궤도 진입 인트로"><div className="intro-paper"/><div className="intro-words"><span>말하지 못한 마음들이 모이는 곳</span><p>이덱떠 궤도에<br className="mobile-br"/> 진입하셨습니다</p><i/></div><CloudPassage/><button className="skip" onClick={()=>setIntro(false)}>건너뛰기 ↗</button></div>}</main>
}
