import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../integrations/OrbitSlack.gs',import.meta.url),'utf8');
function harness(){
 const values:Record<string,string>={},posts:Record<string,unknown>={},sent:any[]=[];let triggers=0,fail=false,locked=false;
 const now=Date.now(),end=now-((now+32400000)%86400000)+86400000;
 const props={getProperty:(k:string)=>values[k]||null,setProperty:(k:string,v:string)=>{values[k]=v},getProperties:()=>({...values}),deleteProperty:(k:string)=>{delete values[k]}};
 values.SLACK_WEBHOOK_URL='https://hooks.slack.com/services/test/fake/only';
 const ctx=vm.createContext({console,Date,ContentService:{MimeType:{JSON:'json'},createTextOutput:(s:string)=>({setMimeType:()=>JSON.parse(s)})},PropertiesService:{getScriptProperties:()=>props},LockService:{getScriptLock:()=>({tryLock:()=>!locked,releaseLock(){}})},Utilities:{sleep(){},formatDate:()=>new Date(now+32400000).toISOString().slice(0,10)},ScriptApp:{getProjectTriggers:()=>triggers?[{getHandlerFunction:()=> 'pollOrbitPosts'}]:[],newTrigger:()=>({timeBased:()=>({everyMinutes:()=>({create:()=>{triggers++}})})})},UrlFetchApp:{fetch:(url:string,opts:any)=>{
  if(url.includes('hooks.slack.com')){if(fail)return{getResponseCode:()=>500,getContentText:()=>''};sent.push(JSON.parse(opts.payload));return{getResponseCode:()=>200,getContentText:()=> 'ok'}}
  const id=url.match(/\/posts\/([^/]+)\.json$/)?.[1];
  return{getResponseCode:()=>200,getContentText:()=>JSON.stringify(url.endsWith('/index.json')?{[end]:end}:id?posts[id]||null:posts)};
 }}});vm.runInContext(code,ctx);
 return {ctx,values,posts,sent,now,end,triggers:()=>triggers,fail:(value:boolean)=>{fail=value},lock:(value:boolean)=>{locked=value},instant:(id:string,extra={})=>ctx.doPost({postData:{contents:JSON.stringify({day:String(end),id,...extra})}})};
}
test('Slack starts once, skips old posts, and deduplicates subsequent polls',()=>{
 const h=harness();h.ctx.startOrbitNotifications();h.ctx.startOrbitNotifications();assert.equal(h.triggers(),1);
 const start=Number(h.values.ORBIT_STARTED_AT);h.posts.old={body:'before setup',createdAt:start-1};h.posts.new={body:'new heart',createdAt:start};
 h.ctx.pollOrbitPosts();h.ctx.pollOrbitPosts();assert.equal(h.sent.length,1);
});
test('failed sends remain pending; notification omits post content and uses one section with a button',()=>{
 const h=harness();h.ctx.startOrbitNotifications();h.posts.p={body:'<!channel> private text',createdAt:Number(h.values.ORBIT_STARTED_AT)};
 h.fail(true);assert.throws(()=>h.ctx.pollOrbitPosts());assert.equal(Object.keys(h.values).filter(k=>k.startsWith('SENT_')).length,0);
 h.fail(false);h.ctx.pollOrbitPosts();const message=h.sent[0];assert.equal(message.blocks.length,1);assert.equal(message.blocks[0].text.text,'🌌 궤도에 새로운 속마음이 도착했어요.');assert.ok(!JSON.stringify(message).includes('private text'));assert.match(message.blocks[0].accessory.url,/\?day=\d{4}-\d{2}-\d{2}&thought=p$/);
});
test('disabled notifications never send or read the database',()=>{
 const h=harness();h.ctx.startOrbitNotifications();h.values.SLACK_DISABLED='true';h.posts.p={body:'new',createdAt:Date.now()};h.ctx.pollOrbitPosts();assert.equal(h.sent.length,0);
});
