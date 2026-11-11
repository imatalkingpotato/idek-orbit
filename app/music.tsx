'use client';
import {useEffect,useRef,useState} from 'react';
export default function Music(){
 const audio=useRef<HTMLAudioElement>(null),[playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),manual=useRef(false);
 useEffect(()=>{
  const el=audio.current;if(!el)return;el.volume=.35;
  const start=(e:Event)=>{if(manual.current||(e.target as Element)?.closest('[data-music-control]'))return;el.play().catch(()=>{});document.removeEventListener('pointerdown',start);document.removeEventListener('keydown',start)};
  el.play().catch(()=>{});document.addEventListener('pointerdown',start);document.addEventListener('keydown',start);
  return()=>{document.removeEventListener('pointerdown',start);document.removeEventListener('keydown',start);el.pause()};
 },[]);
 const toggle=()=>{const el=audio.current;if(!el)return;manual.current=true;if(el.paused){setFailed(false);el.play().catch(()=>setFailed(true))}else el.pause()};
 return <div className="music"><audio ref={audio} src={import.meta.env.BASE_URL+'audio/idek-balanced-space-loop.mp3'} preload="none" loop onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setPlaying(false);setFailed(true)}}/><button type="button" data-music-control aria-label={playing?'배경음악 끄기':'배경음악 켜기'} aria-pressed={playing} onClick={toggle}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z"/>{playing?<><path d="M16 8c3 2 3 6 0 8M19 5c5 4 5 10 0 14"/></>:<path d="m17 9 5 6m0-6-5 6"/>}</svg><span>{playing?'배경음악 끄기':'배경음악 켜기'}</span></button></div>
}
