import {test} from 'node:test';
import assert from 'node:assert/strict';
import {archiveDays,dayTimestamp,archiveLabel} from '../lib/archive.ts';
import {snapshot} from '../lib/shared-state.ts';
import {nextMidnight} from '../lib/orbit.ts';
test('archive lists retained KST days newest first and always includes today',()=>{
 const now=Date.parse('2026-11-12T00:00:01+09:00');
 const yesterday=nextMidnight(now-86400000);
 assert.deepEqual(archiveDays({[yesterday]:yesterday,garbage:0,[nextMidnight(now)+86400000]:nextMidnight(now)+86400000},now),['2026-11-12','2026-11-11']);
});
test('archive dates reject invalid dates and format Korean labels',()=>{
 assert.equal(dayTimestamp('2026-02-30'),null);assert.equal(dayTimestamp('../days'),null);
 assert.equal(archiveLabel('2026-11-11'),'2026년 11월 11일 궤도');
});
test('historical snapshot retains original date and final reaction totals',()=>{
 const n=dayTimestamp('2026-11-11')!;
 const state=snapshot({posts:{p:{body:'보관할 마음',createdAt:n}},events:{e:{thoughtId:'p',kind:'comfort',createdAt:n+1}}},n);
 assert.equal(state.day,'2026-11-11');assert.equal(state.thoughts[0].comfort,1);
});
