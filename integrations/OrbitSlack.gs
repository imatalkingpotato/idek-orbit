// Dedicated Apps Script project. Store SLACK_WEBHOOK_URL in Script Properties.
// No Slack credential is shipped to the website or the public repository.
const ORBIT_DB = 'https://confirm-bell-default-rtdb.firebaseio.com/idekorbit';
const ORBIT_SITE = 'https://imatalkingpotato.github.io/idek-orbit/';
function startOrbitNotifications() {
  const p = PropertiesService.getScriptProperties();
  requireWebhook_(p);
  const existing = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'pollOrbitPosts');
  if (!p.getProperty('ORBIT_STARTED_AT')) p.setProperty('ORBIT_STARTED_AT', String(Date.now()));
  if (!existing.length) ScriptApp.newTrigger('pollOrbitPosts').timeBased().everyMinutes(1).create();
  console.log('새 글 알림이 활성화되었습니다. 기존 글은 보내지 않습니다.');
}
function testOrbitNotification() {
  postSlack_(requireWebhook_(PropertiesService.getScriptProperties()), {
    text: '궤도 알림 봇이 진입했습니다',
    unfurl_links: false, unfurl_media: false
  });
  console.log('온보딩-채널에디터 연결 테스트 전송 완료');
}
function pollOrbitPosts() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const p = PropertiesService.getScriptProperties(), hook = requireWebhook_(p);
    const started = Number(p.getProperty('ORBIT_STARTED_AT'));
    if (!started) throw Error('startOrbitNotifications를 먼저 실행해 주세요.');
    const now = Date.now(), index = readOrbit_('/index') || {};
    const closedThrough = Number(p.getProperty('ORBIT_CLOSED_THROUGH') || 0);
    const buckets = Object.entries(index).filter(([key, end]) => String(end) === key && Number(end) > started && Number(end) > closedThrough).sort((a,b) => Number(a[1])-Number(b[1]));
    let sent = 0;
    for (const [key,end] of buckets) {
      const posts = readOrbit_('/days/' + key + '/posts') || {};
      const rows = Object.entries(posts).filter(([,v]) => v.createdAt >= started).sort((a,b) => a[1].createdAt-b[1].createdAt || a[0].localeCompare(b[0]));
      for (const [id,post] of rows) {
        const marker = 'SENT_' + key + '_' + id;
        if (p.getProperty(marker)) continue;
        postSlack_(hook, orbitMessage_(id,post));
        p.setProperty(marker,String(now));
        if (++sent >= 40) return; // Continue at the next tick, without skipping unprocessed posts.
        Utilities.sleep(1050);
      }
      // Keep a grace period for requests that were committed immediately before midnight.
      if (Number(end) < now - 120000) {
        p.setProperty('ORBIT_CLOSED_THROUGH',key);
        Object.keys(p.getProperties()).filter(k => k.startsWith('SENT_'+key+'_')).forEach(k => p.deleteProperty(k));
      }
    }
  } finally { lock.releaseLock(); }
}
function orbitMessage_(id,post) {
  const date = Utilities.formatDate(new Date(post.createdAt),'Asia/Seoul','yyyy-MM-dd');
  const url = ORBIT_SITE + '?day=' + date + '&thought=' + encodeURIComponent(id);
  return {
    text: '🌌 궤도에 새로운 속마음이 도착했어요.\n' + post.body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '\n' + url,
    mrkdwn:false,parse:'none',link_names:false,
    blocks: [
      {type:'section',text:{type:'plain_text',text:'🌌 궤도에 새로운 속마음이 도착했어요.',emoji:true}},
      {type:'section',text:{type:'plain_text',text:post.body,emoji:true}},
      ...(post.imageUrl ? [{type:'context',elements:[{type:'plain_text',text:'📎 첨부 이미지는 궤도에서 볼 수 있어요.'}]}] : []),
      {type:'actions',elements:[{type:'button',text:{type:'plain_text',text:'궤도에서 보기'},url}]}
    ], unfurl_links:false,unfurl_media:false
  };
}
function requireWebhook_(p) {
  const value = p.getProperty('SLACK_WEBHOOK_URL');
  if (!value || !/^https:\/\/hooks\.slack\.com\/services\//.test(value)) throw Error('SLACK_WEBHOOK_URL 스크립트 속성을 설정해 주세요.');
  return value;
}
function readOrbit_(path) {
  const r=UrlFetchApp.fetch(ORBIT_DB+path+'.json',{muteHttpExceptions:true});
  if(r.getResponseCode()!==200)throw Error('궤도 읽기 실패: '+r.getResponseCode());
  return JSON.parse(r.getContentText());
}
function postSlack_(url,payload) {
  const r=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true});
  if(r.getResponseCode()!==200||r.getContentText().trim()!=='ok')throw Error('Slack 전송 실패: '+r.getResponseCode());
}
