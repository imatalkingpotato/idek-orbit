import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshot,applyStream} from '../lib/shared-state.ts';
const now=Date.parse('2026-11-11T14:59:00Z');
test('stream handles initial data, nested patches and deletion',()=>{
 let d=applyStream(null,'/',{posts:{one:{body:'안녕',createdAt:now}}});
 d=applyStream(d,'/events',{a:{thoughtId:'one',kind:'empathy',createdAt:now}},true);
 d=applyStream(d,'/',{'events/b':{thoughtId:'one',kind:'comfort',createdAt:now+1}},true);
 assert.equal(snapshot(d,now).thoughts[0].empathy,1);assert.equal(snapshot(d,now).thoughts[0].comfort,1);
 d=applyStream(d,'/events/a',null);assert.equal(snapshot(d,now).thoughts[0].empathy,0);
});
test('acknowledgment plus stream delivery counts each event once; repeated clicks each count',()=>{
 let d=applyStream(null,'/',{posts:{one:{body:'오늘',createdAt:now}}});
 for(const id of ['a','a','b','c'])d=applyStream(d,'/events/'+id,{thoughtId:'one',kind:'empathy',createdAt:now});
 const result=snapshot(d,now);assert.equal(result.thoughts[0].empathy,3);assert.equal(result.events.length,3);
 assert.equal(result.day,'2026-11-11');assert.equal(snapshot(null,now+60000).day,'2026-11-12');
});
test('ignores events without a post and returns only latest twelve feed events',()=>{
 const events=Object.fromEntries(Array.from({length:20},(_,i)=>[String(i),{thoughtId:'one',kind:'comfort' as const,createdAt:now+i}]));
 const d={posts:{one:{body:'오늘',createdAt:now}},events:{...events,missing:{thoughtId:'other',kind:'comfort' as const,createdAt:now}}};
 assert.equal(snapshot(d,now).thoughts[0].comfort,20);assert.equal(snapshot(d,now).events.length,12);assert.equal(snapshot(d,now).events[0].id,'19');
});
test('anonymous comments attach to their post, stream once, and remain readable in archives',()=>{
 let data=applyStream(null,'/',{posts:{one:{body:'hello',createdAt:now}}});
 for(const id of ['first','second','first'])data=applyStream(data,'/comments/'+id,{thoughtId:'one',body:id,createdAt:now+(id==='first'?1:2)});
 data=applyStream(data,'/comments/orphan',{thoughtId:'missing',body:'ignored',createdAt:now});
 const comments=snapshot(data,now).thoughts[0].comments!;
 assert.equal(comments.length,2);assert.deepEqual(comments.map(c=>c.body),['first','second']);assert.deepEqual(Object.keys(comments[0]).sort(),['body','createdAt','id']);
});
