import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeThoughts,mergeEvents,flightPoint} from '../lib/live.ts';
const day='2026-11-11';
const row={id:'one',body:'hello',day,createdAt:1,imageUrl:null,comfort:2,empathy:3,mine:[]};
test('overlapping snapshot and reaction acknowledgements never double count or roll back',()=>{
 const seen=mergeThoughts([row],[{...row,empathy:4}],day);
 const ack=mergeThoughts(seen,[{...row,empathy:4}],day);
 assert.equal(ack[0].empathy,4);
 assert.equal(mergeThoughts(ack,[row],day)[0].empathy,4);
});
test('remote posts arrive while local posts survive an older snapshot; midnight removes old day',()=>{
 const merged=mergeThoughts([row,{...row,id:'local',createdAt:3}],[{...row,id:'remote',createdAt:2}],day);
 assert.deepEqual(merged.map(x=>x.id),['local','remote','one']);
 assert.deepEqual(mergeThoughts(merged,[],'2026-11-12'),[]);
});
test('activity acknowledgements and snapshots deduplicate and keep newest twelve',()=>{
 const events=Array.from({length:15},(_,i)=>({id:String(i),thoughtId:'one',body:'hello',kind:'empathy' as const,createdAt:i}));
 const merged=mergeEvents(events,events.slice(8));assert.equal(merged.length,12);assert.equal(merged[0].id,'14');assert.equal(new Set(merged.map(x=>x.id)).size,12);
});
test('flight starts at input, follows an arc, and settles exactly at the moving target',()=>{
 const from={x:200,y:600},to={x:600,y:300};
 const start=flightPoint(from,to,0),end=flightPoint(from,to,1);
 assert.equal(start.x,from.x);assert.equal(start.y,from.y);assert.deepEqual(end,{...to,scale:1,rotation:0});
 assert.equal(flightPoint(from,to,.5).rotation,0);
 assert.ok(flightPoint(from,to,.5).y<450);
 for(let i=0;i<=100;i++){const point=flightPoint(from,to,i/100);assert.equal(point.rotation,0);assert.ok(point.scale<=1);assert.ok(point.x<=to.x);}
 assert.deepEqual(flightPoint(from,{x:620,y:310},2),{x:620,y:310,scale:1,rotation:0});
});
