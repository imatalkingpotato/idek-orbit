'use client';
import {useEffect,useRef,useMemo} from 'react';
import {flightPoint,FLIGHT_DURATION_MS,type Launch} from '../lib/live';
import {celestialAngles,DISPLAY_DAYS_PER_SECOND} from '../lib/celestial';
import {hash,orbitPoint,thoughtOrbits,ORBIT_COUNT,EARTH_ORBIT_INDEX,type Thought,type ReactionKind} from '../lib/orbit';
export function ReactionIcon({kind}:{kind:ReactionKind}){return <svg viewBox="0 0 24 24" aria-hidden="true">{kind==='empathy'?<path d="M12 20S3 14.8 3 8.6C3 3.6 9.2 2.6 12 6.7 14.8 2.6 21 3.6 21 8.6 21 14.8 12 20 12 20Z"/>:<><path d="M3 14c2 0 3 3 6 3h5c2 0 2 3 0 3H8l-5-2M4 13l6-3 5 2c2 1 5-1 6 1s-4 5-5 5"/><path d="M12 8s-4-2-4-4c0-2 3-3 4-1 1-2 4-1 4 1s-4 4-4 4Z"/></>}</svg>}
export function ReactionButtons({item,onReact,busy,labels=false}:{item:Thought;onReact:(id:string,kind:ReactionKind)=>void;busy:string;labels?:boolean}){return <div className={'reactions '+(labels?'with-labels':'')}>{(['comfort','empathy'] as const).map(kind=><button key={kind} type="button" disabled={busy==='archive'} data-reacted={item.mine.includes(kind)} aria-label={`${kind==='comfort'?'위로하기':'공감하기'}: ${item.body}`} onClick={()=>onReact(item.id,kind)}><ReactionIcon kind={kind}/>{labels&&<span>{kind==='comfort'?'위로하기':'공감하기'}</span>}<span key={item[kind]} className="reaction-count">{item[kind]||''}</span></button>)}</div>}
export default function Scene({items,paused,intro,selected,select,react,busy,fresh,launch,ghosts,resetAt,loaded}:{items:Thought[];paused:boolean;intro:boolean;selected:string|null;select:(id:string)=>void;react:(id:string,kind:ReactionKind)=>void;busy:string;fresh:string;launch:Launch|null;ghosts:Thought[];resetAt:number;loaded:boolean}){
 const previous=useRef(new Map<string,number>()),pulses=useRef<{id:string;at:number;seed:number}[]>([]);
 useEffect(()=>{const next=new Map<string,number>();for(const item of items){const total=item.empathy+item.comfort,old=previous.current.get(item.id);next.set(item.id,total);if(old!==undefined&&total>old)for(let i=0;i<Math.min(total-old,6);i++)pulses.current.push({id:item.id,at:performance.now()+i*110,seed:hash(item.id+total+i)});}previous.current=next;pulses.current=pulses.current.slice(-24);},[items]);
 const canvas=useRef<HTMLCanvasElement>(null),area=useRef<HTMLDivElement>(null),refs=useRef(new Map<string,HTMLDivElement>());
 const layout=useMemo(()=>thoughtOrbits([...items,...ghosts]),[items,ghosts]);
 const state=useRef({items,paused,intro,ghosts,resetAt,launch,layout});state.current={items,paused,intro,ghosts,resetAt,launch,layout};
 useEffect(()=>{
  const c=canvas.current,host=area.current;if(!c||!host)return;const ctx=c.getContext('2d');if(!ctx)return;
  const earthArt=new Image();earthArt.src=import.meta.env.BASE_URL+'earth-reference.png';
  const epoch=Date.now();let frame=0,last=0,time=0,w=0,h=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){const r=host!.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio,2);c!.width=w*d;c!.height=h*d;ctx!.setTransform(d,0,0,d,0,0)}
  const obs=new ResizeObserver(resize);obs.observe(host);resize();
  const stars=Array.from({length:180},(_,i)=>({x:hash('x'+i)%10000/10000,y:hash('y-'+i)%10000/10000,r:i%13===0?1.1:.45,a:.15+i%6*.08}));
  function paint(ms:number){
   const s=state.current;if(!s.paused&&!s.intro&&!reduced&&!document.hidden)time+=Math.min((ms-last)/1000,.05);last=ms;ctx!.clearRect(0,0,w,h);
   for(const star of stars){ctx!.fillStyle=`rgba(224,225,214,${star.a})`;ctx!.beginPath();ctx!.arc(star.x*w,star.y*h,star.r,0,Math.PI*2);ctx!.fill()}
   for(let ring=0;ring<ORBIT_COUNT;ring++){
    ctx!.beginPath();for(let j=0;j<=180;j++){const p=orbitPoint(0,ring,j/180*Math.PI*2,w,h);j?ctx!.lineTo(p.x,p.y):ctx!.moveTo(p.x,p.y)}
    ctx!.strokeStyle=ring===ORBIT_COUNT-1?'rgba(209,207,191,.46)':'rgba(177,184,182,.22)';ctx!.lineWidth=ring===ORBIT_COUNT-1?.8:.65;ctx!.stroke();
    ctx!.strokeStyle=ring%2?'rgba(161,119,79,.075)':'rgba(130,165,158,.07)';
    for(let j=0;j<16;j++){const a=orbitPoint(0,ring,j/16*Math.PI*2-time*.004,w,h),b=orbitPoint(0,ring,(j+7)/16*Math.PI*2-time*.004,w,h);ctx!.beginPath();ctx!.moveTo(a.x,a.y);ctx!.lineTo(b.x,b.y);ctx!.stroke()}
    const dot=orbitPoint(time,ring,ring*1.5,w,h);ctx!.fillStyle='#a5aaa1';ctx!.beginPath();ctx!.arc(dot.x,dot.y,2,0,Math.PI*2);ctx!.fill();
   }
   const angles=celestialAngles(epoch+time*DISPLAY_DAYS_PER_SECOND*86400000);
   const earth=orbitPoint(0,EARTH_ORBIT_INDEX,-angles.earth,w,h),mr=w<700?25:34;
   const moon={x:earth.x+Math.cos(angles.moon)*mr,y:earth.y-Math.sin(angles.moon)*mr*.65};
   ctx!.beginPath();ctx!.ellipse(earth.x,earth.y,mr,mr*.65,0,0,Math.PI*2);ctx!.strokeStyle='#96aebc25';ctx!.lineWidth=.6;ctx!.stroke();
   const er=w<700?8:11;
   ctx!.save();ctx!.translate(earth.x,earth.y);ctx!.beginPath();ctx!.arc(0,0,er,0,Math.PI*2);ctx!.clip();
   ctx!.fillStyle='#286c9b';ctx!.fillRect(-er,-er,er*2,er*2);
   // Render the supplied globe inside a circular viewport, without altering its source file.
   if(earthArt.complete&&earthArt.naturalWidth)ctx!.drawImage(earthArt,162,162,876,876,-er,-er,er*2,er*2);
   ctx!.restore();
   ctx!.beginPath();ctx!.arc(earth.x,earth.y,er+.5,0,Math.PI*2);ctx!.strokeStyle='#9fd6ed70';ctx!.stroke();
   const mg=ctx!.createRadialGradient(moon.x-1,moon.y-1,.2,moon.x,moon.y,4);mg.addColorStop(0,'#e6e5d8');mg.addColorStop(1,'#5d6569');ctx!.fillStyle=mg;ctx!.beginPath();ctx!.arc(moon.x,moon.y,w<700?3:4,0,Math.PI*2);ctx!.fill();
   for(const item of [...s.items,...s.ghosts]){const n=hash(item.id),p=orbitPoint(time,s.layout.get(item.id)??n%ORBIT_COUNT,n%6283/1000,w,h),el=refs.current.get(item.id);if(el){const tx=Math.max(el.offsetWidth/2+8,Math.min(w-el.offsetWidth/2-8,p.x));let q={x:tx,y:p.y,scale:1,rotation:0};
     if(s.launch?.id===item.id&&!reduced){const box=host!.getBoundingClientRect();q=flightPoint({x:s.launch.x-box.left,y:s.launch.y-box.top},{x:tx,y:p.y},(ms-s.launch.at)/FLIGHT_DURATION_MS);}
     el.style.transform=`translate(${q.x}px,${q.y}px) translate(-50%,-50%) rotate(${q.rotation}deg) scale(${q.scale})`;
    }
    if(s.ghosts.includes(item)&&!reduced){const progress=Math.min(1,(Date.now()-s.resetAt)/2200);for(let k=0;k<32;k++){const seed=hash(item.id+k),a=(seed%6283)/1000,r=progress*(30+seed%100);ctx!.fillStyle=`rgba(220,224,204,${(1-progress)*.7})`;ctx!.fillRect(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r-progress*45,1.5,1.5)}}
   }
   pulses.current=pulses.current.filter(pulse=>ms-pulse.at<4800&&s.items.some(item=>item.id===pulse.id));
   if(!reduced)for(const pulse of pulses.current){
    const age=(ms-pulse.at)/4800,n=hash(pulse.id),p=orbitPoint(time,s.layout.get(pulse.id)??n%ORBIT_COUNT,n%6283/1000,w,h),el=refs.current.get(pulse.id),margin=(el?.offsetWidth||150)/2+8;
    if(age<0)continue;
    const tx=Math.max(margin,Math.min(w-margin,p.x)),ty=p.y,startX=w/2,startY=h/2;
    const controlX=(startX+tx)/2+(pulse.seed%2?1:-1)*65,controlY=(startY+ty)/2-70;
    const position=(t:number)=>({x:(1-t)**2*startX+2*(1-t)*t*controlX+t*t*tx,y:(1-t)**2*startY+2*(1-t)*t*controlY+t*t*ty});
    ctx!.save();ctx!.globalCompositeOperation='lighter';
    if(age<.24){const t=age/.24;for(let k=20;k>=0;k--){const q=position(Math.max(0,t-k*.014));ctx!.fillStyle=`rgba(246,218,179,${(1-k/21)*.8})`;ctx!.shadowColor='#ffe5b6';ctx!.shadowBlur=k?8:18;ctx!.beginPath();ctx!.arc(q.x,q.y,k?1.2:2.5,0,Math.PI*2);ctx!.fill()}}
    else{const a=(age-.24)/.76,fade=(1-a)**1.5,ease=1-(1-a)**2;
     const glow=ctx!.createRadialGradient(tx,ty,0,tx,ty,30+ease*35);glow.addColorStop(0,`rgba(255,224,185,${fade*.22})`);glow.addColorStop(.45,`rgba(255,201,144,${fade*.09})`);glow.addColorStop(1,'rgba(255,201,144,0)');ctx!.fillStyle=glow;ctx!.fillRect(tx-70,ty-70,140,140);
     for(let ring=0;ring<3;ring++){const spread=Math.max(0,ease-ring*.12);ctx!.strokeStyle=`rgba(255,225,184,${fade*(.65-ring*.15)})`;ctx!.shadowColor='#ffdbad';ctx!.shadowBlur=20;ctx!.lineWidth=.8;ctx!.beginPath();ctx!.ellipse(tx,ty,12+spread*55,7+spread*21,0,0,Math.PI*2);ctx!.stroke();}
    }
    ctx!.restore();
   }
   frame=requestAnimationFrame(paint);
  }
  frame=requestAnimationFrame(paint);return()=>{cancelAnimationFrame(frame);obs.disconnect()};
 },[]);
 return <section className="universe" ref={area} aria-label="속마음이 머무는 궤도"><canvas ref={canvas} aria-hidden="true"/><div className="axis horizontal"/><div className="axis vertical"/><div className="core core-pair" aria-label="궤도 중심의 두 이미지"><span className="core-avatar core-orange"><img src={import.meta.env.BASE_URL+'center-orange.png'} alt="주황색 인물"/></span><span className="core-avatar core-j"><img src={import.meta.env.BASE_URL+'center-j.png'} alt="갈색 원 안의 J"/></span></div>
 {[...items,...ghosts].map(item=><div key={item.id} ref={el=>{if(el)refs.current.set(item.id,el);else refs.current.delete(item.id)}} className={`thought ${fresh===item.id?'fresh':''} ${launch?.id===item.id?'launching':''} ${ghosts.includes(item)?'dissolve':''} ${selected===item.id?'selected':''}`}><div className="thought-content"><button className="thought-open" onClick={()=>select(item.id)} aria-label={`속마음 읽기: ${item.body}`}><span className="thought-dot"/>{item.imageUrl&&<img src={item.imageUrl} alt="첨부 이미지 미리보기"/>}<span>{item.body}</span></button><ReactionButtons item={item} onReact={react} busy={busy}/></div></div>)}
 {!items.length&&!ghosts.length&&loaded&&<p className="empty">아직 고요한 궤도.<br/><span>{busy==='archive'?'이 날짜에 보관된 속마음이 없어요.':'첫 번째 속마음을 띄워 보세요.'}</span></p>}
 </section>
}
