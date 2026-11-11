import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dayKey,nextMidnight,dateLabel,cleanBody,orbitPoint,ORBIT_COUNT,EARTH_ORBIT_INDEX,thoughtOrbits} from '../lib/orbit.ts';
test('KST midnight rolls the day and expiry across year/month boundaries',()=>{
 const before=Date.parse('2026-12-31T14:59:59.999Z'),after=before+1;
 assert.equal(dayKey(before),'2026-12-31');assert.equal(dayKey(after),'2027-01-01');
 assert.equal(nextMidnight(before),after);assert.equal(nextMidnight(after),after+86400000);
 assert.equal(dateLabel(Date.parse('2026-11-11T00:00:00Z')),'서기 2026년 11월 11일 수요일');
});
test('body validation preserves Korean, line breaks and literal markup as text',()=>{
 assert.equal(cleanBody('  힝 ㅠ.ㅠ\n오늘도 무사히  '),'힝 ㅠ.ㅠ\n오늘도 무사히');
 assert.equal(cleanBody(' <script>alert(1)</script> '),'<script>alert(1)</script>');
 for(const invalid of ['', '   ',null,{},'가'.repeat(241)])assert.equal(cleanBody(invalid),null);
 assert.equal(cleanBody('가'.repeat(240))?.length,240);
});
test('eight moving orbits stay in the scene on mobile and desktop',()=>{
 for(const [w,h]of [[390,400],[1440,600]])for(let ring=0;ring<ORBIT_COUNT;ring++)for(let t=0;t<100;t++){
  const p=orbitPoint(t,ring,2.1,w,h);assert.ok(p.x>0&&p.x<w&&p.y>0&&p.y<h);
 }
 assert.notDeepEqual(orbitPoint(0,2,1,1200,600),orbitPoint(10,2,1,1200,600));
});

test('ganji uses the lunar year, including the New Year boundary',async()=>{
 const {ganjiLabel}=await import('../lib/orbit.ts');
 assert.equal(ganjiLabel(Date.parse('2026-11-11T00:00:00Z')),'병오년');
 assert.equal(ganjiLabel(Date.parse('2026-01-01T00:00:00Z')),'을사년');
 assert.equal(ganjiLabel(Date.parse('2026-02-17T00:00:00Z')),'병오년');
});

test('eight nested nonintersecting orbits move counterclockwise; Earth is third',()=>{
 assert.equal(ORBIT_COUNT,8);assert.equal(EARTH_ORBIT_INDEX,2);
 let previous=0;
 for(let ring=0;ring<ORBIT_COUNT;ring++){
  const a=orbitPoint(0,ring,0,1200,600),b=orbitPoint(.1,ring,0,1200,600);
  assert.ok((a.x-600)*(b.y-300)-(a.y-300)*(b.x-600)<0);
  const radius=Math.hypot(a.x-600,a.y-300);assert.ok(radius>previous);previous=radius;
 }
});

test('posts spread over eight orbits without shifting existing posts on arrival',()=>{
 const items=Array.from({length:8},(_,i)=>({id:'post-'+i,body:'hello',day:'2026-11-11',createdAt:i,comfort:0,empathy:0,mine:[]}));
 const before=thoughtOrbits(items);assert.equal(new Set(before.values()).size,8);
 const after=thoughtOrbits([...items,{...items[0],id:'new',createdAt:9}]);
 for(const [id,ring] of before)assert.equal(after.get(id),ring);
});
