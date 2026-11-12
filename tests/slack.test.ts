import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../integrations/OrbitSlack.gs',import.meta.url),'utf8');
function harness(){
 const values:Record<string,string>={},posts:Record<string,unknown>={},sent:unknown[]=[];let triggers=0,fail=false;
 const now=Date.now(),end=now-((now+32400000)%86400000)+86400000;
 const props={getProperty:(k:string)=>values[k]||null,setProperty:(k:string,v:string)=>{values[k]=v},getProperties:()=>({...values}),deleteProperty:(k:string)=>{delete values[k]}};
 values.SLACK_WEBHOOK_URL='https://hooks.slack.com/services/test/fake/only';
 const ctx=vm.createContext({console,Date,PropertiesService:{getScriptProperties:()=>props},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{sleep(){},formatDate:()=>new Date(now+32400000).toISOString().slice(0,10)},ScriptApp:{getProjectTriggers:()=>triggers?[{getHandlerFunction:()=> 'pollOrbitPosts'}]:[],newTrigger:()=>({timeBased:()=>({everyMinutes:()=>({create:()=>{triggers++}})})})},UrlFetchApp:{fetch:(url:string,opts:any)=>{
  if(url.includes('hooks.slack.com')){if(fail)return{getResponseCode:()=>500,getContentText:()=>''};sent.push(JSON.parse(opts.payload));return{getResponseCode:()=>200,getContentText:()=> 'ok'}}
  return{getResponseCode:()=>200,getContentText:()=>JSON.stringify(url.endsWith('/index.json')?{[end]:end}:posts)};
 }}});
 vm.runInContext(code,ctx);
 return {ctx,values,posts,sent,now,triggers:()=>triggers,fail:(value:boolean)=>{fail=value}};
}
test('Slack starts once, skips old posts, and deduplicates subsequent polls',()=>{
 const h=harness();h.ctx.startOrbitNotifications();h.ctx.startOrbitNotifications();assert.equal(h.triggers(),1);
 const start=Number(h.values.ORBIT_STARTED_AT);
 h.posts.old={body:'before setup',createdAt:start-1};h.posts.new={body:'new heart',createdAt:start+1};
 h.ctx.pollOrbitPosts();h.ctx.pollOrbitPosts();assert.equal(h.sent.length,1);
});
test('Slack failed sends remain pending; content is plain text and points to dated post',()=>{
 const h=harness();h.ctx.startOrbitNotifications();h.posts.p={body:'<!channel> <https://example.com>',createdAt:Number(h.values.ORBIT_STARTED_AT)+1};
 h.fail(true);assert.throws(()=>h.ctx.pollOrbitPosts());assert.equal(Object.keys(h.values).filter(k=>k.startsWith('SENT_')).length,0);
 h.fail(false);h.ctx.pollOrbitPosts();const message:any=h.sent[0];assert.equal(message.blocks[1].text.type,'plain_text');assert.equal(message.blocks[1].text.text,'<!channel> <https://example.com>');assert.match(message.blocks[2].elements[0].url,/\?day=\d{4}-\d{2}-\d{2}&thought=p$/);
});
