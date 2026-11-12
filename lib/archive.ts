import {dayKey,nextMidnight} from './orbit.ts';
export function dayTimestamp(day:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;
 const n=Date.parse(day+'T12:00:00+09:00');return Number.isFinite(n)&&dayKey(n)===day?n:null;
}
export function archiveDays(index:Record<string,number>|null,now:number){
 const today=dayKey(now),days=new Set([today]);
 for(const [key,value] of Object.entries(index||{})){
  if(String(value)!==key||!Number.isSafeInteger(value)||value>nextMidnight(now)||(value+32400000)%86400000!==0)continue;
  days.add(dayKey(value-1));
 }
 return [...days].sort().reverse();
}
export function archiveLabel(day:string){const [y,m,d]=day.split('-');return `${y}년 ${m}월 ${d}일 궤도`;}
