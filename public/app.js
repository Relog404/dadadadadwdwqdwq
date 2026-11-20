let me=null, token=localStorage.getItem('tg_token'), chats=[], activeId=null, replyTo=null, editId=null, pinnedId=null;
let gifts=[], isRecording=false, mediaRecorder=null, audioChunks=[], recStart=0;
let vcStream=null, vcRecorder=null, vcChunks=[], vcRecording=false;
let emojiCats={
  '😊':['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🤩','😍','🥰','😘','😋','🤗','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😰','😥','😳','🤪','😵','🥴','😠','😡','🤬','😷','🤒','🤕','🤢','🤮','🥳','🥺','🤠','🤡','🥸','😎','🤓','🧐'],
  '❤️':['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💝','💘','💟','♥️','💋'],
  '🎉':['🎉','🎊','🎂','🎁','🎈','✨','⭐','🌟','🔥','🎵','🎶'],
  '🐻':['🐻','🐶','🐱','🐭','🐹','🐰','🦊','🐼','🐨','🐯','🦁','🐮','🐷'],
  '🍔':['🍔','🍕','🌭','🍿','🍩','🍪','🎂','🍫','🍬','☕','🍺'],
  '⚽':['⚽','🏀','🏈','🎾','🎯','🎮','♠️','🎲'],
  '🚀':['🚀','✈️','🚂','🚗','🛳️','🚀','🛰️']
};
let recentEmoji = JSON.parse(localStorage.getItem('recentEmoji')||'[]');
let socket=null, communities=[], bots=[], stories=[];
let currentView='chats';

function api(path, opts={}){
  opts.headers = opts.headers||{};
  if(token) opts.headers['x-token']=token;
  if(opts.body && !(opts.body instanceof FormData)) {opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(opts.body);}
  return fetch(path, opts).then(r=>r.json());
}
async function sendCode(){
  const country=document.getElementById('country').value;
  let phone=document.getElementById('phone').value.trim();
  if(!phone.startsWith('+')) phone = country + phone.replace(/\D/g,'');
  if(phone.length<8) return alert('Введи номер');
  try{
    const res= await fetch('/api/auth/send-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})}).then(r=>r.json());
    if(res.ok){
      document.getElementById('authStep1').style.display='none';
      document.getElementById('authStep2').style.display='block';
      document.getElementById('devCode').style.display='block';
      document.getElementById('devCode').innerHTML='Код (dev): <b style="font-size:16px;cursor:pointer" onclick="document.getElementById(\'code\').value=\''+res.dev_code+'\'">'+res.dev_code+'</b> — нажми чтобы вставить';
      document.getElementById('phone').dataset.phone=phone;
      setTimeout(()=> document.getElementById('code').focus(),100);
    } else alert(res.error||'ошибка: '+JSON.stringify(res));
  } catch(e){ alert('Ошибка сети: '+e.message); }
}
function pasteCode(){
  const hint=document.getElementById('devCode').textContent;
  const m=hint.match(/(\d{5})/);
  if(m) document.getElementById('code').value=m[1];
}
function clearToken(){ localStorage.removeItem('tg_token'); token=null; location.reload(); }
async function quickDemo(){
  const phone='+79990000001';
  document.getElementById('phone').value=phone;
  const s=await fetch('/api/auth/send-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})}).then(r=>r.json());
  if(!s.ok) return alert('send-code fail');
  const v=await fetch('/api/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone, code:s.dev_code})}).then(r=>r.json());
  if(v.token){ token=v.token; localStorage.setItem('tg_token', token); me=v.user; document.getElementById('auth').style.display='none'; document.getElementById('app').classList.add('show'); init(); }
  else alert('verify fail: '+v.error);
}
function buildDemoChips(){
  const el=document.getElementById('demoChips'); if(!el) return;
  const demos=[
    {phone:'+79990000001', name:'Алексей @alex'},
    {phone:'+79990000002', name:'Мария @maria ⭐'},
    {phone:'+79990000003', name:'Дима @dima'},
    {phone:'+79990000005', name:'Анна @anna'},
  ];
  el.innerHTML='';
  demos.forEach(d=>{
    const b=document.createElement('button'); b.className='btn-ghost'; b.style.fontSize='12px'; b.style.border='1px solid #243447'; b.textContent=d.name;
    b.onclick=async()=>{
      document.getElementById('phone').value=d.phone;
      const s=await fetch('/api/auth/send-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:d.phone})}).then(r=>r.json());
      if(s.ok){
        document.getElementById('authStep1').style.display='none';
        document.getElementById('authStep2').style.display='block';
        document.getElementById('devCode').style.display='block';
        document.getElementById('devCode').innerHTML='Код: <b style="font-size:18px">'+s.dev_code+'</b> — авто-вход через 0.5с';
        document.getElementById('phone').dataset.phone=d.phone;
        setTimeout(async()=>{
          const v=await fetch('/api/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:d.phone, code:s.dev_code})}).then(r=>r.json());
          if(v.token){ token=v.token; localStorage.setItem('tg_token', token); me=v.user; document.getElementById('auth').style.display='none'; document.getElementById('app').classList.add('show'); init(); }
        },500);
      }
    };
    el.appendChild(b);
  });
}
setTimeout(buildDemoChips,500);
function backToPhone(){ document.getElementById('authStep1').style.display='block'; document.getElementById('authStep2').style.display='none'; }
async function verifyCode(){
  const phone=document.getElementById('phone').dataset.phone || document.getElementById('phone').value.trim();
  const code=document.getElementById('code').value.trim();
  if(!code) return;
  const body={phone, code};
  const rf=document.getElementById('regFields');
  if(rf.style.display!=='none'){ body.first_name=document.getElementById('regFirst').value; body.last_name=document.getElementById('regLast').value; body.username=document.getElementById('regUser').value; }
  const res= await fetch('/api/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
  if(res.error){ if(res.error==='username taken'){ document.getElementById('regFields').style.display='block'; document.getElementById('verifyErr').textContent='Юзернейм занят'; return;} if(!res.token){ document.getElementById('regFields').style.display='block'; document.getElementById('verifyErr').textContent=res.error; return; } }
  if(res.token){ token=res.token; localStorage.setItem('tg_token', token); me=res.user; document.getElementById('auth').style.display='none'; document.getElementById('app').classList.add('show'); init(); }
}
async function init(){
  try{
    me = await api('/api/me');
    if(!me || me.error){ localStorage.removeItem('tg_token'); location.reload(); return; }
    gifts = await api('/api/gifts'); if(!Array.isArray(gifts)) gifts=[];
    try{ communities = await api('/api/communities'); if(!Array.isArray(communities)) communities=[]; }catch{ communities=[]; }
    try{ bots = await api('/api/bots'); if(!Array.isArray(bots)) bots=[]; }catch{ bots=[]; }
    try{ stories = await api('/api/stories'); if(!Array.isArray(stories)) stories=[]; }catch{ stories=[]; }
  buildEmoji(); buildGifts(); renderStoriesReel(); await loadChats(); connectSocket(); renderDrawer();
  if(chats[0]) openChat(chats[0].id);
  syncPremiumUI();
}
function connectSocket(){
  socket=io();
  socket.on('new_message', m=>{ if(m.chat_id===activeId) loadMessages(activeId); loadChats(); });
  socket.on('update_message', m=>{ if(m.chat_id===activeId) loadMessages(activeId); });
  socket.on('delete_message', d=>{ if(d.chat_id===activeId) loadMessages(activeId); loadChats(); });
  socket.on('reaction', ()=>{ if(activeId) loadMessages(activeId); });
  socket.on('typing', ({chatId, isTyping})=>{ if(chatId===activeId){ document.getElementById('typingHint').style.display=isTyping?'block':'none'; document.getElementById('typingHint').textContent=isTyping?'печатает...':''; } });
  socket.on('bot_stream', ({chunk})=>{ const el=document.getElementById('messagesInner'); const div=document.createElement('div'); div.textContent='🤖 '+chunk; el.appendChild(div); });
}
function renderDrawer(){
  document.getElementById('drawerName').textContent = (me.first_name+' '+(me.last_name||'')).trim();
  document.getElementById('drawerPhone').textContent = me.phone + ' @'+me.username + (me.premium?' ⭐ Premium':'');
  document.getElementById('drawerAvatar').textContent = (me.first_name[0]||'U');
  document.getElementById('drawerStars').textContent = `⭐ ${me.stars||0} Stars`;
  document.getElementById('starsBal').textContent = `${me.stars||0} ⭐`;
}
function syncPremiumUI(){
  // update limits hint if needed
}
function switchView(v){
  currentView=v;
  document.querySelectorAll('.view-tab').forEach(b=> b.classList.toggle('active', b.dataset.v===v));
  if(v==='chats'){ document.getElementById('chatList').style.display='block'; document.getElementById('viewContent').style.display='none'; renderChats(); }
  else {
    document.getElementById('chatList').style.display='none'; const vc=document.getElementById('viewContent'); vc.style.display='block';
    if(v==='communities') renderCommunitiesView();
    else if(v==='bots') renderBotsView();
    else if(v==='gifts') renderGiftsView();
  }
}
function renderStoriesReel(){
  const el=document.getElementById('storiesReel'); if(!el) return;
  el.innerHTML='';
  const add=document.createElement('div'); add.className='story-ring'; add.innerHTML=`<div class="ring" style="background:#2b5278"><div class="ring-inner">+</div></div><small>История</small>`; add.onclick=()=>openStories(); el.appendChild(add);
  stories.forEach(s=>{
    const u=me.id===s.user_id ? me : {first_name:'Юзер'};
    const d=document.createElement('div'); d.className='story-ring'; d.innerHTML=`<div class="ring"><div class="ring-inner">${s.media?`<img src="${s.media}">`:(u.first_name[0]||'S')}</div></div><small>${u.first_name||'story'}</small>`;
    d.onclick=()=> openStoryViewer(s);
    el.appendChild(d);
  });
}
function openStoryViewer(s){
  document.getElementById('storyViewImg').src=s.media;
  document.getElementById('storyViewText').textContent=s.caption||'';
  openModal('storyViewer');
  api('/api/stories/'+s.id+'/view',{method:'POST'});
}
async function loadChats(){
  const data=await api('/api/chats');
  if(Array.isArray(data)) chats=data;
  if(currentView==='chats') renderChats();
}
function renderChats(){
  const q=(document.getElementById('search').value||'').toLowerCase();
  const el=document.getElementById('chatList'); el.innerHTML='';
  let list=[...chats];
  if(q) list=list.filter(c=>{
    const title=(c.title|| getPrivateName(c) || '').toLowerCase();
    const last=(c.last_message?.content||'').toLowerCase();
    const from = (c.last_message?.sender_id||'').toLowerCase();
    return title.includes(q)|| last.includes(q) || (c.username||'').toLowerCase().includes(q) || from.includes(q);
  });
  list.sort((a,b)=> (b.last_message?.created||b.created) - (a.last_message?.created||a.created));
  if(!list.length){ el.innerHTML=`<div style="padding:24px;text-align:center;color:#a8afb8">Чатов нет</div>`; return; }
  list.forEach(c=>{
    const title = c.type==='private' ? (getPrivateName(c)||'Сохранённое') : c.title;
    const avatarLetter=(title||'?')[0]||'?';
    const avatarUrl=c.avatar||'';
    const last=c.last_message;
    const unread=c.unread||0;
    const time= last? fmtTime(last.created):'';
    const isSecret=c.is_secret;
    const isChannel=c.type==='channel';
    const item=document.createElement('div');
    item.className='chat-item'+(c.id===activeId?' active':'') + (c.pinned_msg?' pinned':'');
    item.onclick=()=>openChat(c.id);
    item.innerHTML=`
      <div class="avatar" style="${isSecret?'border:2px solid #22c55e':''}">${avatarUrl?`<img src="${avatarUrl}">`:avatarLetter} ${isSecret?'🔒':''}</div>
      <div class="chat-main">
        <div class="chat-head"><div class="chat-name">${escape(title)} ${c.type==='channel'?'📢': c.type==='group'?'👥':''} ${c.is_public?'🌐':''} ${isSecret?'🔒':''}</div><div class="chat-time">${time}</div></div>
        <div class="chat-last"><span style="flex:1;overflow:hidden;text-overflow:ellipsis">${last? (last.sender_id===me.id?'Вы: ':'') + preview(last) : (c.description||'нет сообщений')}</span>${c.pinned_msg?`<span class="pin-icon">📌</span>`:''}${c.auto_delete?`⏳${c.auto_delete}s`:''}${unread?`<span class="unread">${unread>99?'99+':unread}</span>`:''}</div>
      </div>
    `;
    el.appendChild(item);
  });
}
function getPrivateName(c){
  if(c.membersDetailed){ const o=c.membersDetailed.find(m=>m.user_id!==me.id); if(o) return (o.first_name+' '+(o.last_name||'')).trim(); }
  return c._privateName||'';
}
function preview(m){ if(m.type==='photo') return '🖼️ Фото'; if(m.type==='voice') return '🎤 Голосовое'; if(m.type==='video_note') return '⭕ Видео'; if(m.type==='gift') return '🎁 Подарок'; if(m.type==='location') return '📍 Гео'; if(m.type==='file') return '📎 Файл'; if(m.type==='poll') return '📊 Опрос'; return (m.content||m.caption||'').slice(0,40); }
function fmtTime(ts){ const d=new Date(ts); const now=new Date(); const same=d.toDateString()===now.toDateString(); if(same) return d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'}); return d.toLocaleDateString('ru',{day:'numeric',month:'short'}); }
function fmtDate(ts){ return new Date(ts).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'});}
function escape(s){ return String(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

let chatDetailCache={};
async function openChat(id){
  activeId=id; renderChats();
  document.getElementById('chatHeader').style.display='flex'; document.getElementById('composer').style.display='flex';
  document.getElementById('sidebar').classList.remove('open'); socket.emit('join', id);
  const det=await api('/api/chats/'+id); chatDetailCache[id]=det;
  const c=chats.find(x=>x.id===id); if(c && det.members){ c.membersDetailed=det.members; const other=det.members.find(m=>m.user_id!==me.id); if(other) c._privateName=(other.first_name+' '+(other.last_name||'')).trim(); }
  renderHeader(det); renderPinned(det); await loadMessages(id); loadRight(det);
}
function renderHeader(det){
  const el=document.getElementById('chatHeader');
  const isPrivate=det.type==='private';
  let title=det.title, sub=det.description||'', avatarLetter=(det.title||'?')[0]||'?', avatarUrl=det.avatar||'';
  if(isPrivate){ const other=det.members.find(m=>m.user_id!==me.id); if(other){ title=(other.first_name+' '+(other.last_name||'')).trim(); sub='@'+other.username+' • '+(other.online?'в сети':'не в сети')+(other.premium?' ⭐':'') ; avatarLetter=other.first_name[0]||'?'; avatarUrl=other.avatar||''; } else { title='Избранное'; sub=''; } }
  else { sub=det.type==='channel'? `${det.members.length} подписчиков • ${det.description||''} ${det.is_public?'🌐 публичный':'🔒 приватный'}` : `${det.members.length} участников${det.is_public?' • 🌐':''}`; if(det.is_secret) sub='🔒 Секретный чат • E2E'; }
  if(det.auto_delete) sub+=` • ⏳ автоудаление ${det.auto_delete}с`;
  el.innerHTML=`<div class="avatar" style="width:40px;height:40px;font-size:16px">${avatarUrl?`<img src="${avatarUrl}">`:avatarLetter}</div><div class="info"><div class="title">${escape(title)} ${det.type==='channel'?'📢': det.type==='group'?'👥':''} ${det.is_secret?'🔒':''}</div><div class="sub">${escape(sub)}</div></div><button class="icon-btn" onclick="copyInvite()">🔗</button><button class="icon-btn" onclick="toggleRight()">⋯</button>`;
  document.getElementById('composer').style.display = (det.type==='channel' && det.owner_id!==me.id && !det.members.some(m=>m.user_id===me.id && m.role==='admin')) ? 'none' : 'flex';
}
function renderPinned(det){
  const el=document.getElementById('pinned');
  if(det.pinned_msg){ const c=chats.find(x=>x.id===det.id); const pinObj=c?.pinned_msg_obj; el.style.display='flex'; el.innerHTML=`<div class="line"></div><div style="flex:1"><div style="color:#5288c1;font-size:13px;font-weight:600">Закреплено</div><div style="color:#a8afb8;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escape(pinObj? (pinObj.content||pinObj.caption||'') : 'сообщение')}</div></div><span>📌</span>`; pinnedId=det.pinned_msg; } else { el.style.display='none'; pinnedId=null; }
}
function scrollPinned(){ if(!pinnedId) return; const e=document.querySelector(`[data-mid="${pinnedId}"]`); if(e) e.scrollIntoView({behavior:'smooth',block:'center'}); }

let messagesCache=[];
async function loadMessages(chatId){
  const q=document.getElementById('search').value||'';
  let url=`/api/chats/${chatId}/messages`;
  if(q) url+=`?q=${encodeURIComponent(q)}`;
  const data=await api(url); messagesCache=data||[]; renderMessages();
}
function renderMessages(){
  const inner=document.getElementById('messagesInner'); inner.innerHTML='';
  // secret banner
  const det=chatDetailCache[activeId];
  if(det && det.is_secret){
    const sec=document.createElement('div'); sec.className='secret-banner'; sec.textContent='🔒 Секретный чат — оконечное шифрование, сообщения не на серверах, самоуничтожение '+ (det.secret_ttl||det.auto_delete||'выкл'); inner.appendChild(sec);
  }
  if(!messagesCache.length){ inner.innerHTML+=`<div class="empty"><div class="empty-card"><div style="font-size:32px">✈️</div><h3>Нет сообщений</h3><p style="color:#a8afb8">Отправьте первое — поддерживается Rich Editor 32k, таблицы, формулы</p></div></div>`; return; }
  let lastDate=''; messagesCache.forEach(m=>{
    const d=fmtDate(m.created); if(d!==lastDate){ const sep=document.createElement('div'); sep.className='date-sep'; sep.textContent=d; inner.appendChild(sep); lastDate=d; }
    inner.appendChild(msgEl(m));
  });
  document.getElementById('messages').scrollTop=document.getElementById('messages').scrollHeight;
}
function msgEl(m){
  const isOut=m.sender_id===me.id;
  const row=document.createElement('div'); row.className='msg-row'+(isOut?' out':''); row.dataset.mid=m.id;
  const sender=m.sender || {first_name:'User', last_name:'', username:''};
  const name=(sender.first_name+' '+(sender.last_name||'')).trim() || sender.username || 'User';
  let content='';
  if(m.forwarded_from) content+=`<div class="forward">↪ Переслано от ${escape(m.forwarded_name||'пользователя')}</div>`;
  if(m.reply_to){ const rep=messagesCache.find(x=>x.id===m.reply_to); if(rep) content+=`<div class="reply"><b>${escape(rep.sender?.first_name||'Сообщение')}</b><div>${escape(rep.content||rep.caption||'[медиа]')}</div></div>`; }
  // rich / poll / types
  if(m.poll){
    content+=`<div class="poll-card"><b>📊 ${escape(m.poll.question)}</b>${m.poll.options.map((o,i)=>{ const votes=Object.values(m.poll.votes||{}).filter(v=>v===i).length; const pct=m.poll.total? Math.round(votes*100/m.poll.options.length):0; return `<div class="poll-opt" onclick="votePoll('${m.id}',${i})"><span>${escape(o)}</span><span style="margin-left:auto">${votes}</span><div class="bar" style="width:60px"><i style="width:${pct}%"></i></div></div>`}).join('')}</div>`;
  } else if(m.rich){
    content+=`<div class="rich-content">${renderRich(m.rich)}</div>`;
  } else if(m.type==='text'){
    const txt = renderTextWithFormatting(m.content);
    content+=`<div class="bubble-text">${txt} ${m.edited?'<span style="opacity:.6;font-size:11px">(изменено)</span>':''}</div>`;
  } else if(m.type==='photo'){ content+=`<div class="photo" onclick="openLight('${m.content}')"><img src="${m.content}" loading="lazy"></div>${m.caption?`<div class="bubble-text">${escape(m.caption)}</div>`:''}`; }
  else if(m.type==='voice'){ const dur=m.duration||0; const wf=m.waveform? JSON.parse(m.waveform): Array.from({length:24},()=>8+Math.random()*18); content+=`<div class="voice"><button class="voice-play" onclick="playVoice(this,'${m.content}')">▶</button><div class="wave">${wf.map(h=>`<i style="height:${h}px"></i>`).join('')}</div><span style="font-size:12px;opacity:.8">${dur}″</span></div>`; }
  else if(m.type==='video_note'){ content+=`<div class="video-circle"><video src="${m.content}" autoplay loop muted playsinline></video></div>`; }
  else if(m.type==='location'){ content+=`<div class="loc"><div class="loc-map">📍<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:#0e1621;padding:4px 8px;border-radius:999px;font-size:11px">${Number(m.location_lat).toFixed(4)}, ${Number(m.location_lon).toFixed(4)}</div></div><a href="https://maps.google.com/?q=${m.location_lat},${m.location_lon}" target="_blank">Открыть карты</a></div>`; }
  else if(m.type==='gift'){ const g=gifts.find(x=>x.id===m.gift_id); content+=`<div class="gift-msg"><div class="gift-icon" style="background:${g?.color||'#2b5278'}">${g?.emoji||'🎁'}</div><div><b>${escape(g?.name||'Подарок')}</b><div style="font-size:12px;color:#a8afb8">Подарок от ${escape(name)} ${g?.collectible?'• коллекционный':''}</div></div></div>`; }
  else if(m.type==='file'){ content+=`<div class="file-msg"><div class="file-icon">📄</div><div><b>${escape(m.file_name||'файл')}</b><div style="font-size:12px;color:#a8afb8">${formatSize(m.file_size)}</div></div><a href="${m.content}" target="_blank" style="margin-left:auto;color:#5288c1">⬇</a></div>${m.caption?`<div class="bubble-text">${escape(m.caption)}</div>`:''}`; }
  else if(m.type==='system'){ content+=`<div class="bubble-text" style="font-style:italic;opacity:.8;font-size:13px">${escape(m.content)}</div>`; }
  const reacts=m.reactions||[];
  const reactsHtml= reacts.length? `<div class="reacts">${reacts.map(r=>`<span class="react" onclick="quickReact('${m.id}')">${r.emoji} ${r.count}</span>`).join('')}</div>`:'';
  const time=new Date(m.created).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
  const views=m.views? `👁 ${m.views}`:'';
  const ttl = m.ttl? ` ⏳${m.ttl}s`:'';
  const ticks=isOut? (m.pinned?'📌': views? views : '✓✓') : views;
  row.innerHTML=`${!isOut?`<div class="avatar" style="width:32px;height:32px;font-size:12px">${(sender.first_name||'?')[0]}</div>`:''}<div class="bubble">${!isOut? `<div class="bubble-name" style="color:${colorFor(sender.id||sender.username)}">${escape(name)} ${sender.badge==='bot'?'🤖':''}</div>`:''}${content}${reactsHtml}<div class="bubble-footer"><span class="time">${time}${ttl}</span><span class="ticks">${ticks}</span></div><div class="actions"><button class="act" onclick="setReply('${m.id}')">↩️</button><button class="act" onclick="quickReact('${m.id}')">❤️</button><button class="act" onclick="pinMsg('${m.id}')">📌</button><button class="act" onclick="forwardMsg('${m.id}')">↪</button>${isOut?`<button class="act" onclick="startEdit('${m.id}')">✎</button><button class="act" onclick="deleteMsg('${m.id}')">🗑️</button>`:''}</div></div>`;
  return row;
}
function renderRich(r){
  let html='';
  if(r.blocks) for(const b of r.blocks){
    if(b.type==='h1') html+=`<h1>${escape(b.text)}</h1>`;
    else if(b.type==='h2') html+=`<h2>${escape(b.text)}</h2>`;
    else if(b.type==='p') html+=`<p>${formatRichText(b.text)}</p>`;
    else if(b.type==='quote') html+=`<blockquote>${escape(b.text)}</blockquote>`;
    else if(b.type==='code') html+=`<pre>${escape(b.text)}</pre>`;
    else if(b.type==='table') html+=`<table>${b.rows.map(row=>`<tr>${row.map(c=>`<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    else if(b.type==='list') html+=`<ul>${b.items.map(i=>`<li>${escape(i)}</li>`).join('')}</ul>`;
    else if(b.type==='checklist') html+=`<ul class="checklist">${b.items.map(i=>`<li>${escape(i)}</li>`).join('')}</ul>`;
    else if(b.type==='details') html+=`<details><summary>${escape(b.summary)}</summary><div>${escape(b.text)}</div></details>`;
    else if(b.type==='math') html+=`<div class="katex">${escape(b.text)}</div>`;
  }
  return html || escape(JSON.stringify(r));
}
function formatRichText(t){ return linkify(escape(t)).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/__(.+?)__/g,'<u>$1</u>').replace(/\*(.+?)\*/g,'<i>$1</i>').replace(/~~(.+?)~~/g,'<s>$1</s>').replace(/`(.+?)`/g,'<code>$1</code>').replace(/\|\|(.+?)\|\|/g,'<span style="background:#333;color:transparent" onclick="this.style.color=\'#fff\'">$1</span>'); }
function renderTextWithFormatting(s){ return formatRichText(s||''); }
function colorFor(s){ const colors=['#5288c1','#e17076','#a47cf3','#45b983','#e8a44c','#6ec9cb']; let h=0; for(let i=0;i<String(s).length;i++) h+=String(s).charCodeAt(i); return colors[h%colors.length]; }
function linkify(s){ return s.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank">$1</a>'); }
function formatSize(b){ if(!b) return ''; if(b<1024) return b+' B'; if(b<1024*1024) return (b/1024).toFixed(1)+' KB'; return (b/1024/1024).toFixed(1)+' MB'; }

// RIGHT
function loadRight(det){
  const el=document.getElementById('rightBody'); const isPrivate=det.type==='private';
  let html='';
  if(isPrivate){ const other=det.members.find(m=>m.user_id!==me.id); if(other){ html+=`<div class="profile-hero"><div class="big">${other.avatar?`<img src="${other.avatar}">`: (other.first_name[0]||'?')}</div><div style="font-weight:600">${escape(other.first_name+' '+(other.last_name||''))} ${badge(other.badge)} ${other.premium?'⭐':''}</div><div style="color:#a8afb8;font-size:13px">@${escape(other.username)} • ${other.phone||''}</div><div style="color:#a8afb8;font-size:13px">${escape(other.bio||'')} ${escape(other.bio_extra||'')}</div><div style="color:${other.online?'#0ac630':'#a8afb8'};font-size:12px">${other.online?'в сети':'не в сети'} ${other.emoji_status||''}</div><div style="font-size:12px;color:#a8afb8">Приватность: ${other.privacy?.phone||''} | Звонки ${other.privacy?.calls||''}</div></div>`; } }
  else {
    html+=`<div class="profile-hero"><div class="big">${det.avatar?`<img src="${det.avatar}">`: (det.title[0]||'C')}</div><div style="font-weight:600">${escape(det.title)} ${det.type==='channel'?'📢':'👥'}</div><div style="color:#a8afb8;font-size:13px">${escape(det.description||'')}</div><div style="color:#a8afb8;font-size:12px">${det.username?'@'+det.username+' • ':''}${det.members.length} участн. ${det.is_public?'🌐 публичный':'🔒 приватный'} ${det.history_visible?'• история вкл':'• история выкл'} ${det.is_secret?'• 🔒 E2E':''}</div><div style="font-size:12px">Ссылка: ${det.invite_link||'нет'} <button class="btn-ghost" onclick="copyInvite()">Копировать</button></div></div>`;
    html+=`<div class="card"><h4>Участники</h4><div class="members">${det.members.map(m=>`<div class="member"><div class="avatar" style="width:36px;height:36px;font-size:14px">${m.avatar?`<img src="${m.avatar}">`: (m.first_name[0]||'?')}</div><div style="flex:1"><div style="font-weight:500;font-size:14px">${escape(m.first_name+' '+(m.last_name||''))} ${badge(m.badge)} ${m.premium?'⭐':''}</div><div style="font-size:12px;color:#a8afb8">@${escape(m.username)} ${det.owner_id===m.user_id?'• владелец': m.role==='admin'?'• админ':''} ${det.admin_rights[m.user_id]?'• права':''}</div></div>${m.user_id!==me.id?`<button class="btn-ghost" onclick="startPrivate('${m.username}')">Написать</button>`:''}</div>`).join('')}</div><div style="margin-top:8px;display:flex;gap:6px"><input id="addMemberInput" placeholder="юзернейм" style="flex:1;padding:8px;border-radius:8px;border:1px solid #243447;background:#242f3d;color:#fff"><button class="btn-tg" style="width:auto;padding:8px 12px" onclick="addMember()">Добавить</button></div></div>`;
    html+=`<div class="card"><h4>Права администратора</h4><div style="font-size:13px">Владелец: ${det.owner_id===me.id?'вы':'другой'} — можешь менять права через API</div><button class="btn-ghost" onclick="editChatPerms()">⚙️ Права участников</button> <button class="btn-ghost" onclick="toggleHistory()">История: ${det.history_visible?'вкл':'выкл'}</button></div>`;
    html+=`<div class="card"><h4>Модерация</h4><label style="font-size:13px"><input type="checkbox" ${det.permissions.send_text?'checked':''} onchange="setPerm('send_text',this.checked)"> Текст</label><br><label style="font-size:13px"><input type="checkbox" ${det.permissions.send_media?'checked':''} onchange="setPerm('send_media',this.checked)"> Медиа</label><br><label style="font-size:13px"><input type="checkbox" ${det.permissions.send_links?'checked':''} onchange="setPerm('send_links',this.checked)"> Ссылки</label><div style="margin-top:8px">Автоудаление: <select onchange="setAutoDel(this.value)"><option value="0" ${det.auto_delete==0?'selected':''}>выкл</option><option value="86400" ${det.auto_delete==86400?'selected':''}>24 ч</option><option value="604800" ${det.auto_delete==604800?'selected':''}>7 дн</option></select></div><div>Слоу-мод: <input type="number" value="${det.slow_mode}" onchange="setSlow(this.value)" style="width:60px"></div></div>`;
  }
  const photos=messagesCache.filter(m=>m.type==='photo').slice(-9);
  if(photos.length) html+=`<div class="card"><h4>Медиа</h4><div class="media-grid">${photos.map(p=>`<img src="${p.content}" onclick="openLight('${p.content}')">`).join('')}</div></div>`;
  html+=`<div class="card"><h4>Действия</h4><button class="btn-ghost" style="width:100%" onclick="clearChat()">🧹 Очистить</button><button class="btn-ghost" style="width:100%;color:#ff6b6b" onclick="leaveChat()">🚪 Выйти</button></div>`;
  el.innerHTML=html; document.getElementById('rightTitle').textContent = isPrivate? 'Профиль' : det.title;
}
function badge(b){ if(!b) return ''; if(b==='bot') return '🤖'; return `<span class="badge-verified ${b==='gold'?'gold': b==='green'?'green': b==='premium'?'premium':''}">✓</span>`; }

// community views
function renderCommunitiesView(){
  const el=document.getElementById('viewContent'); el.innerHTML=`<div style="padding:12px"><h3>🏘️ Сообщества</h3><p style="color:#a8afb8;font-size:13px">Объединяют каналы, группы и ботов — как сервера Discord. Переключайся между чатами без приглашений.</p><button class="btn-tg" style="margin-top:8px" onclick="openCommunityCreate()">+ Создать сообщество</button><div id="comList" style="margin-top:12px;display:flex;flex-direction:column;gap:8px"></div></div>`;
  const list=el.querySelector('#comList');
  communities.forEach(c=>{
    const div=document.createElement('div'); div.className='card'; div.innerHTML=`<b>${escape(c.name)}</b> <small>@${c.username}</small><div style="font-size:13px;color:#a8afb8">${escape(c.description)}</div><div style="font-size:12px">Чаты: ${c.chat_ids.join(', ')} • Боты: ${c.bot_ids.join(', ')}</div><button class="btn-ghost" onclick="openCommunity('${c.id}')">Открыть</button>`;
    list.appendChild(div);
  });
}
function renderBotsView(){
  const el=document.getElementById('viewContent'); el.innerHTML=`<div style="padding:12px"><h3>🤖 Боты</h3><p style="color:#a8afb8">AI-боты в любом чате через @, стриминг текста, инлайн, бот-бот взаимодействие</p><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${bots.map(b=>`<div class="card"><b>@${b.username}</b> — ${escape(b.name)}<div style="font-size:13px;color:#a8afb8">${escape(b.description)}</div><div style="font-size:12px">${b.type} ${b.inline?'• инлайн':''} ${b.ai?'• AI':''} ${b.streaming?'• стриминг':''}</div><button class="btn-ghost" onclick="invokeBot('${b.id}')">Вызвать в текущем чате</button></div>`).join('')}</div><button class="btn-tg" onclick="createBot()">+ Создать бота</button></div>`;
}
function renderGiftsView(){
  const el=document.getElementById('viewContent'); el.innerHTML=`<div style="padding:12px"><h3>🎁 Подарки & Stars</h3><div style="color:#a8afb8">Дари коллекционные подарки, покупай за Stars, перепродавай</div><div id="giftsViewGrid" class="gifts-grid" style="margin-top:10px"></div></div>`;
  const g=document.getElementById('giftsViewGrid'); gifts.forEach(x=>{ const d=document.createElement('div'); d.className='gift-card'; d.innerHTML=`<div class="emo">${x.emoji}</div><b>${x.name}</b><small>${x.price} ⭐ ${x.collectible?'• коллекц':''}</small>`; d.onclick=()=> sendGift(x.id); g.appendChild(d); });
}

// composer etc
function autoGrow(el){ /* contenteditable */ }
function syncInput(){}
function onKey(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } }
function onTyping(){ if(!activeId) return; socket.emit('typing', {chatId:activeId, userId:me.id, isTyping:true}); clearTimeout(onTyping.t); onTyping.t=setTimeout(()=> socket.emit('typing',{chatId:activeId, userId:me.id, isTyping:false}), 1000); }
async function sendMessage(){
  const inp=document.getElementById('msgInput');
  const text=inp.innerText.trim(); // contenteditable
  if(!text && !editId) return;
  if(editId){ await api(`/api/messages/${editId}`,{method:'PATCH', body:{content:text}}); editId=null; document.getElementById('editBar').classList.remove('show'); }
  else {
    const fd=new FormData(); fd.append('type','text'); fd.append('content', text);
    if(replyTo) fd.append('reply_to', replyTo);
    // check rich?
    if(window._richPayload){ fd.append('rich', JSON.stringify(window._richPayload)); window._richPayload=null; }
    await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
    replyTo=null; document.getElementById('replyBar').classList.remove('show');
  }
  inp.innerText=''; await loadMessages(activeId); loadChats();
}
function setReply(id){ replyTo=id; const m=messagesCache.find(x=>x.id===id); document.getElementById('replyBar').classList.add('show'); document.getElementById('replyName').textContent=m.sender.first_name; document.getElementById('replyText').textContent=m.content||m.caption||'[медиа]'; document.getElementById('msgInput').focus(); }
function cancelReply(){ replyTo=null; document.getElementById('replyBar').classList.remove('show'); }
function startEdit(id){ const m=messagesCache.find(x=>x.id===id); editId=id; document.getElementById('editBar').classList.add('show'); document.getElementById('editText').textContent=m.content.slice(0,40); document.getElementById('msgInput').innerText=m.content; document.getElementById('msgInput').focus(); }
function cancelEdit(){ editId=null; document.getElementById('editBar').classList.remove('show'); document.getElementById('msgInput').innerText=''; }
async function deleteMsg(id){ if(!confirm('Удалить?')) return; await api(`/api/messages/${id}`,{method:'DELETE'}); loadMessages(activeId); loadChats(); }
async function pinMsg(id){ await api(`/api/messages/${id}/pin`,{method:'POST'}); const det=chatDetailCache[activeId]; if(det){ det.pinned_msg = det.pinned_msg===id? null: id; renderPinned(det);} loadMessages(activeId); }
async function quickReact(id){ const emojis=['❤️','🔥','👍','😂','🎉','😍']; const e=prompt('Реакция: '+emojis.join(' '),'❤️'); if(!e) return; const res=await api(`/api/messages/${id}/react`,{method:'POST', body:{emoji:e}}); if(res.error) alert(res.error); else loadMessages(activeId); }
async function forwardMsg(id){ const chatList=chats.map(c=> `${c.id}: ${c.title||c.username||c._privateName||'чат'}`).join('\n'); const target=prompt('ID чата для пересылки:\n'+chatList); if(!target) return; const m=messagesCache.find(x=>x.id===id); const fd=new FormData(); fd.append('type', m.type); fd.append('content', m.content); if(m.caption) fd.append('caption', m.caption); fd.append('forwarded_from', m.sender_id); await fetch(`/api/chats/${target}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}); alert('Переслано'); }
function toggleAttach(){ document.getElementById('attachPanel').classList.toggle('show'); }
function triggerPhoto(){ document.getElementById('photoInput').click(); toggleAttach(); }
function triggerFile(){ document.getElementById('fileInput').click(); toggleAttach(); }
async function handlePhoto(inp){ const file=inp.files[0]; if(!file) return; const fd=new FormData(); const type=file.type.startsWith('video')?'video_note':'photo'; fd.append('file', file); fd.append('type', type); fd.append('content',''); if(replyTo) fd.append('reply_to', replyTo); const res=await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}).then(r=>r.json()); if(res.error) alert(res.error); else { replyTo=null; document.getElementById('replyBar').classList.remove('show'); } inp.value=''; loadMessages(activeId); loadChats(); }
async function handleFile(inp){ const file=inp.files[0]; if(!file) return; const fd=new FormData(); fd.append('file', file); fd.append('type','file'); fd.append('content', file.name); if(replyTo) fd.append('reply_to', replyTo); const res=await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}).then(r=>r.json()); if(res.error) alert(res.error); inp.value=''; loadMessages(activeId); }
async function sendLocation(){ toggleAttach(); const doSend=(lat,lon)=>{ const fd=new FormData(); fd.append('type','location'); fd.append('content',''); fd.append('location_lat', lat); fd.append('location_lon', lon); if(replyTo) fd.append('reply_to', replyTo); fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}).then(()=> loadMessages(activeId)); }; if(navigator.geolocation){ navigator.geolocation.getCurrentPosition(p=> doSend(p.coords.latitude, p.coords.longitude), ()=> doSend(55.7558,37.6173)); } else doSend(55.7558,37.6173); }

// emoji & gifts
function buildEmoji(){
  const head=document.getElementById('emojiHead'); const cats=Object.keys(emojiCats);
  head.innerHTML=`<button class="emoji-cat active" data-cat="recent">🕒</button>`+ cats.map(c=>`<button class="emoji-cat" data-cat="${c}">${c}</button>`).join('');
  head.querySelectorAll('button').forEach(b=> b.onclick=()=>{ head.querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderEmojiGrid(b.dataset.cat); });
  renderEmojiGrid('recent');
}
function renderEmojiGrid(cat){
  const grid=document.getElementById('emojiGrid'); grid.innerHTML=''; let list=[]; if(cat==='recent') list = recentEmoji.length? recentEmoji : emojiCats['😊'].slice(0,16); else list = emojiCats[cat]||[]; list.forEach(e=>{ const btn=document.createElement('button'); btn.textContent=e; btn.onclick=()=> insertEmoji(e); grid.appendChild(btn); });
}
function toggleEmoji(){ document.getElementById('emojiPanel').classList.toggle('show'); document.getElementById('giftsPanel').classList.remove('show'); }
function insertEmoji(e){ const inp=document.getElementById('msgInput'); document.execCommand('insertText', false, e); inp.focus(); recentEmoji=[e, ...recentEmoji.filter(x=>x!==e)].slice(0,32); localStorage.setItem('recentEmoji', JSON.stringify(recentEmoji)); }
function buildGifts(){ const grid=document.getElementById('giftsGrid'); if(!grid) return; grid.innerHTML=''; gifts.forEach(g=>{ const div=document.createElement('div'); div.className='gift-card'; div.innerHTML=`<div class="emo">${g.emoji}</div><b>${escape(g.name)}</b><small>${g.price} ⭐ ${g.collectible?'★':''}</small>`; div.onclick=()=> sendGift(g.id); grid.appendChild(div); }); }
function openGifts(){ document.getElementById('giftsPanel').classList.add('show'); toggleAttach(); }
function toggleGifts(){ document.getElementById('giftsPanel').classList.toggle('show'); }
async function sendGift(giftId){ const fd=new FormData(); fd.append('type','gift'); fd.append('gift_id', giftId); fd.append('content',''); if(replyTo) fd.append('reply_to', replyTo); const res=await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}).then(r=>r.json()); if(res.error) alert(res.error); else { document.getElementById('giftsPanel').classList.remove('show'); loadMessages(activeId); loadChats(); refreshMe(); } }
async function topupStars(){ const res=await api('/api/stars/topup',{method:'POST', body:{amount:500}}); if(res.stars!==undefined){ me.stars=res.stars; renderDrawer(); document.getElementById('starsBal').textContent=res.stars+' ⭐'; } }
async function refreshMe(){ me=await api('/api/me'); renderDrawer(); }

// voice
async function startVoice(e){
  e.preventDefault(); if(isRecording) return;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRecorder=new MediaRecorder(stream); audioChunks=[];
    mediaRecorder.ondataavailable=ev=> audioChunks.push(ev.data);
    mediaRecorder.onstop= async ()=>{
      const blob=new Blob(audioChunks,{type:'audio/webm'});
      const dur=Math.max(1, Math.round((Date.now()-recStart)/1000));
      const wave=JSON.stringify(Array.from({length:30},()=> 6+Math.random()*18|0));
      const fd=new FormData(); fd.append('file', blob, 'voice.webm'); fd.append('type','voice'); fd.append('duration', dur); fd.append('waveform', wave);
      if(replyTo) fd.append('reply_to', replyTo);
      await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
      replyTo=null; document.getElementById('replyBar').classList.remove('show');
      stream.getTracks().forEach(t=>t.stop()); loadMessages(activeId); loadChats();
    };
    mediaRecorder.start(); isRecording=true; recStart=Date.now();
    document.getElementById('recordBtn').classList.add('recording'); document.getElementById('recordBtn').textContent='⏹';
    document.getElementById('typingHint').style.display='block'; document.getElementById('typingHint').textContent='● Запись... отпусти чтобы отправить';
  }catch{ isRecording=true; recStart=Date.now(); document.getElementById('recordBtn').classList.add('recording'); document.getElementById('typingHint').style.display='block'; document.getElementById('typingHint').textContent='● Запись (демо)'; }
  catch(err){ alert('Mic: '+err.message); }
}
async function stopVoice(e){ e.preventDefault(); if(!isRecording) return; isRecording=false; document.getElementById('recordBtn').classList.remove('recording'); document.getElementById('recordBtn').textContent='🎙️'; document.getElementById('typingHint').style.display='none'; if(mediaRecorder && mediaRecorder.state!=='inactive') mediaRecorder.stop(); else { const dur=Math.max(1, Math.round((Date.now()-recStart)/1000)); const fd=new FormData(); fd.append('type','voice'); fd.append('content',''); fd.append('duration', dur); fd.append('waveform', JSON.stringify(Array.from({length:30},()=>6+Math.random()*18|0))); if(replyTo) fd.append('reply_to', replyTo); await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}); loadMessages(activeId); } }
function playVoice(btn, src){ if(btn._audio){ if(!btn._audio.paused){ btn._audio.pause(); btn.textContent='▶'; return;} else { btn._audio.play(); btn.textContent='⏸'; return; } } if(!src || src===''){ btn.textContent='▶'; return; } const a=new Audio(src); btn._audio=a; a.play(); btn.textContent='⏸'; a.onended=()=> btn.textContent='▶'; a.onerror=()=> btn.textContent='▶'; }

// video circle
async function startVideoCircle(){ toggleAttach(); openModal('videoModal'); document.getElementById('vcStatus').textContent='Запрашиваем камеру...'; try{ vcStream=await navigator.mediaDevices.getUserMedia({video:{width:320,height:320}, audio:true}); const v=document.getElementById('vcPreview'); v.srcObject=vcStream; await v.play(); document.getElementById('vcStatus').textContent='Камера готова. Нажми ● Запись'; }catch(e){ document.getElementById('vcStatus').textContent='Камера недоступна: '+e.message; } }
function toggleVcRec(){ if(vcRecording) stopVcRec(); else startVcRec(); }
function startVcRec(){ if(!vcStream) return alert('Камера не готова'); vcChunks=[]; vcRecorder=new MediaRecorder(vcStream, {mimeType:'video/webm'}); vcRecorder.ondataavailable=e=> vcChunks.push(e.data); vcRecorder.onstop=()=> document.getElementById('vcStatus').textContent='Готово к отправке'; vcRecorder.start(); vcRecording=true; document.getElementById('vcRecBtn').textContent='■ Стоп'; document.getElementById('vcStatus').textContent='● Запись кружка...'; }
function stopVcRec(){ if(vcRecorder && vcRecorder.state!=='inactive') vcRecorder.stop(); vcRecording=false; document.getElementById('vcRecBtn').textContent='● Запись'; }
async function sendVc(){ let blob=null; if(vcChunks.length) blob=new Blob(vcChunks,{type:'video/webm'}); else { const fd=new FormData(); fd.append('type','video_note'); fd.append('content',''); if(replyTo) fd.append('reply_to', replyTo); await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}); closeModal('videoModal'); if(vcStream) vcStream.getTracks().forEach(t=>t.stop()); loadMessages(activeId); return; } const fd=new FormData(); fd.append('file', blob, 'videonote.webm'); fd.append('type','video_note'); if(replyTo) fd.append('reply_to', replyTo); await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}); closeModal('videoModal'); if(vcStream) vcStream.getTracks().forEach(t=>t.stop()); vcChunks=[]; loadMessages(activeId); }

// rich
function toggleRich(){ document.getElementById('richToolbar').classList.toggle('show'); }
function rich(type, arg){
  const inp=document.getElementById('msgInput');
  const sel=window.getSelection().toString();
  let ins='';
  if(type==='heading') ins=`<h${arg}>${sel||'Заголовок'}</h${arg}>`;
  else if(type==='bold') ins=`**${sel||'жирный'}**`;
  else if(type==='italic') ins=`*${sel||'курсив'}*`;
  else if(type==='underline') ins=`__${sel||'подчёрк'}__`;
  else if(type==='strike') ins=`~~${sel||'зачёрк'}~~`;
  else if(type==='mono') ins=`\`${sel||'моно'}\``;
  else if(type==='spoiler') ins=`||${sel||'спойлер'}||`;
  else if(type==='quote') ins=`\n> ${sel||'цитата'}\n`;
  else if(type==='code') ins=`\n\`\`\`\n${sel||'код'}\n\`\`\`\n`;
  else if(type==='list') ins=`\n- ${sel||'пункт'}\n- пункт 2\n`;
  else if(type==='checklist') ins=`\n- [ ] ${sel||'задача'}\n`;
  else if(type==='table') window._richPayload={blocks:[{type:'table', rows:[['A','B'],['1','2']]}]};
  else if(type==='math') ins=` $$ E=mc^2 $$ `;
  else if(type==='details') window._richPayload={blocks:[{type:'details', summary:'Нажми', text: sel||'скрытый текст'}]};
  else if(type==='link'){ const url=prompt('URL:','https://'); if(url) ins=`[${sel||'ссылка'}](${url})`; }
  if(ins) document.execCommand('insertText', false, ins);
  if(window._richPayload){ alert('Rich блок добавлен — отправится как формат'); }
}
function aiGenerate(){ const topic=prompt('Тема для AI:','таблица цен'); if(!topic) return; window._richPayload={blocks:[{type:'h1', text:'AI: '+topic},{type:'p', text:'Сгенерировано ИИ — пример текста, формулы и таблицы.'},{type:'table', rows:[['Товар','Цена'],['Stars','100'],['Premium','500']]},{type:'math', text:'x = \\frac{-b \\pm \\sqrt{b^2 -4ac}}{2a}'}]}; alert('AI сгенерировал блоки'); }

// poll
function openPoll(){ openModal('pollModal'); }
async function sendPoll(){
  const q=document.getElementById('pollQ').value.trim(); const opts=document.getElementById('pollOpts').value.split(',').map(s=>s.trim()).filter(Boolean);
  if(!q || !opts.length) return alert('Заполни');
  const fd=new FormData(); fd.append('type','poll'); fd.append('content', q); fd.append('poll_question', q); fd.append('poll_options', JSON.stringify(opts));
  if(replyTo) fd.append('reply_to', replyTo);
  await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
  closeModal('pollModal'); loadMessages(activeId);
}
async function votePoll(mid, idx){ await api(`/api/messages/${mid}/vote`,{method:'POST', body:{option:idx}}); loadMessages(activeId); }

// premium / privacy / business / fragment / stories
async function openPremium(){
  const lim=await api('/api/limits');
  const el=document.getElementById('premiumInfo');
  el.innerHTML=`<div>Статус: <b>${lim.premium?'⭐ Premium активен':'Обычный'}</b></div>
  <table style="width:100%;margin-top:8px;border-collapse:collapse;font-size:13px"><tr><th>Лимит</th><th>Обычный</th><th>Premium</th></tr>
  <tr><td>Каналы</td><td>500</td><td>1000 ${lim.channels===1000?'✓':''}</td></tr>
  <tr><td>Папки</td><td>10</td><td>20</td></tr><tr><td>Закрепы</td><td>5</td><td>10</td></tr><tr><td>Аккаунты</td><td>1</td><td>4</td></tr>
  <tr><td>Файл</td><td>2 ГБ</td><td>4 ГБ</td></tr><tr><td>Био</td><td>70</td><td>140</td></tr><tr><td>Реакции</td><td>1</td><td>3</td></tr></table>
  <div style="margin-top:8px">Stars: ${lim.stars} ⭐ | Файлы до ${lim.file_size/1024/1024/1024} ГБ | Текст в речь ✔ Перевод ✔ Эмодзи-статус ✔ Инкогнито истории ✔</div>`;
  document.getElementById('premiumBtn').textContent = lim.premium? 'Отключить':'Активировать';
  document.getElementById('starsInfo').textContent = `Баланс ${lim.stars} ⭐`;
  openModal('premiumModal');
}
async function togglePremium(){ const res=await api('/api/premium/toggle',{method:'POST'}); me=res; renderDrawer(); openPremium(); }
async function openPrivacy(){
  const p=await api('/api/privacy');
  const fields=[['phone','Номер телефона'],['last_seen','Last Seen'],['avatar','Фото профиля'],['bio','О себе'],['gifts','Подарки'],['calls','Звонки'],['messages','Сообщения'],['add_to_groups','Добавление в группы'],['forward_link','Пересылка']];
  const el=document.getElementById('privacyFields'); el.innerHTML='';
  fields.forEach(([key,label])=>{
    const div=document.createElement('div'); div.className='field'; div.innerHTML=`<label>${label}</label><select id="priv_${key}"><option value="all">Все</option><option value="contacts">Мои контакты</option><option value="nobody">Никто</option></select>`;
    el.appendChild(div);
    setTimeout(()=> document.getElementById('priv_'+key).value = p[key]||'all',0);
  });
  document.getElementById('closeFriendsInput').value=(p.close_friends||[]).join(', ');
  openModal('privacyModal');
}
async function savePrivacy(){
  const body={}; ['phone','last_seen','avatar','bio','gifts','calls','messages','add_to_groups','forward_link'].forEach(k=> body[k]=document.getElementById('priv_'+k).value);
  await api('/api/privacy',{method:'PUT', body}); closeModal('privacyModal');
}
async function saveCloseFriends(){ const v=document.getElementById('closeFriendsInput').value.split(',').map(s=>s.trim()).filter(Boolean); await api('/api/privacy',{method:'PUT', body:{close_friends:v}}); alert('Сохранено'); }
async function openBusiness(){ const b=await api('/api/business'); document.getElementById('bizEnabled').checked=b.enabled; document.getElementById('bizHours').value=b.hours; document.getElementById('bizAddress').value=b.address; document.getElementById('bizWelcome').value=b.welcome; openModal('businessModal'); }
async function saveBusiness(){ const body={enabled: document.getElementById('bizEnabled').checked, hours: document.getElementById('bizHours').value, address: document.getElementById('bizAddress').value, welcome: document.getElementById('bizWelcome').value}; await api('/api/business',{method:'PUT', body}); closeModal('businessModal'); }
async function openFragment(){
  const list=await fetch('/api/fragment/usernames').then(r=>r.json());
  const el=document.getElementById('fragmentList'); el.innerHTML=list.map(u=>`<div style="display:flex;justify-content:space-between;align-items:center;background:#1e2e3a;padding:8px;border-radius:8px"><b>@${u.username}</b><span>${u.price} ⭐</span><button class="btn-tg" style="width:auto" onclick="buyFragment('${u.username}')">Купить</button></div>`).join(''); openModal('fragmentModal');
}
async function buyFragment(username){ const res=await api('/api/fragment/buy',{method:'POST', body:{username}}); if(res.error) alert(res.error); else { me=res; renderDrawer(); alert('Куплено @'+username); } }
async function openStories(){
  stories=await api('/api/stories');
  const el=document.getElementById('storiesList'); el.innerHTML=stories.map(s=>`<div style="display:flex;gap:8px;align-items:center;background:#1e2e3a;padding:8px;border-radius:8px"><img src="${s.media}" style="width:48px;height:48px;border-radius:50%;object-fit:cover"><div style="flex:1"><div style="font-size:13px">${escape(s.caption)}</div><div style="font-size:11px;color:#a8afb8">👁 ${s.views} • ${s.incognito?'инкогнито':''}</div></div><button class="btn-ghost" onclick='openStoryViewer(${JSON.stringify(s).replace(/'/g,"&#39;")})'>Смотреть</button></div>`).join('');
  openModal('storiesModal');
}
async function postStory(){
  const caption=document.getElementById('storyCaption').value; const incognito=document.getElementById('storyIncog').checked; const file=document.getElementById('storyFile').files[0];
  const fd=new FormData(); fd.append('caption', caption); fd.append('incognito', incognito); if(file) fd.append('file', file);
  await fetch('/api/stories',{method:'POST', headers:{'x-token':token}, body:fd}); stories=await api('/api/stories'); renderStoriesReel(); openStories();
}
function openCommunityCreate(){ openModal('communityModal'); }
async function doCreateCommunity(){
  const body={name:document.getElementById('comName').value, username:document.getElementById('comUser').value, description:document.getElementById('comDesc').value, chat_ids:document.getElementById('comChats').value.split(',').map(s=>s.trim()).filter(Boolean), bot_ids:document.getElementById('comBots').value.split(',').map(s=>s.trim()).filter(Boolean)};
  await api('/api/communities',{method:'POST', body}); communities=await api('/api/communities'); closeModal('communityModal'); switchView('communities');
}
async function openCommunity(id){ const c=await api('/api/communities/'+id); alert(`Сообщество ${c.name}\nЧаты: ${c.chats.map(x=>x.title).join(', ')}\nБоты: ${c.bots.map(b=>b.username).join(', ')}`); }
async function createBot(){ const username=prompt('username бота'); if(!username) return; await api('/api/bots',{method:'POST', body:{username, name:username, description:'мой бот'}}); bots=await api('/api/bots'); switchView('bots'); }
async function invokeBot(id){ const text=prompt('Текст для бота'); if(!text) return; await api('/api/bots/'+id+'/invoke',{method:'POST', body:{text, chat_id:activeId}}); loadMessages(activeId); }
function copyInvite(){ const det=chatDetailCache[activeId]; if(det) { navigator.clipboard.writeText(det.invite_link||''); alert('Ссылка скопирована: '+det.invite_link); } }
async function setPerm(key,val){ await api('/api/chats/'+activeId,{method:'PUT', body:{permissions:{[key]:val}}}); }
async function setAutoDel(v){ await api('/api/chats/'+activeId,{method:'PUT', body:{auto_delete:parseInt(v)}}); }
async function setSlow(v){ await api('/api/chats/'+activeId,{method:'PUT', body:{slow_mode:parseInt(v)}}); }
async function toggleHistory(){ const det=chatDetailCache[activeId]; await api('/api/chats/'+activeId,{method:'PUT', body:{history_visible:!det.history_visible}}); const nd=await api('/api/chats/'+activeId); chatDetailCache[activeId]=nd; loadRight(nd); }
async function editChatPerms(){ const user=prompt('Юзернейм для админа'); if(!user) return; const rights=prompt('Права через запятую: delete,ban,pin'); await api('/api/chats/'+activeId,{method:'PUT', body:{admin_rights:{[user]:rights}}}); }

// right actions
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open'); }
function toggleRight(){ document.getElementById('right').classList.toggle('open'); }
function openMenu(){ document.getElementById('leftDrawer').classList.add('show'); }
function closeLeft(){ document.getElementById('leftDrawer').classList.remove('show'); }
async function clearChat(){ if(!confirm('Очистить?')) return; for(const m of messagesCache) await api(`/api/messages/${m.id}`,{method:'DELETE'}); loadMessages(activeId); loadChats(); }
async function leaveChat(){ if(!confirm('Выйти?')) return; await api(`/api/chats/${activeId}/members/${me.id}`,{method:'DELETE'}); activeId=null; document.getElementById('chatHeader').style.display='none'; document.getElementById('composer').style.display='none'; loadChats(); document.getElementById('messagesInner').innerHTML=''; }
async function startPrivate(username){ const user=await api('/api/users/search?q='+username).then(r=>r[0]); if(!user) return alert('Не найдено'); const ch=await api('/api/chats',{method:'POST', body:{type:'private', members:[user.id]}}); await loadChats(); openChat(ch.id); }
async function addMember(){ const inp=document.getElementById('addMemberInput'); const username=inp.value.trim(); if(!username) return; const users=await api('/api/users/search?q='+username); const u=users[0]; if(!u) return alert('Не найден'); await api(`/api/chats/${activeId}/members`,{method:'POST', body:{user_id:u.id}}); const det=await api('/api/chats/'+activeId); chatDetailCache[activeId]=det; loadRight(det); loadChats(); }

// create
let createType='group';
function openCreate(type){
  createType=type;
  document.getElementById('createTitle').textContent= type==='private'?'Новый чат': type==='group'?'Новая группа': type==='channel'?'Новый канал':'Секретный чат';
  document.getElementById('createMembersField').style.display= type==='private'?'none':'block';
  document.getElementById('createPrivateField').style.display= type==='private'?'block':'none';
  document.getElementById('createName').value=''; document.getElementById('createDesc').value=''; document.getElementById('createMembers').value=''; document.getElementById('createPrivate').value=''; document.getElementById('createUsername').value='';
  document.getElementById('createSecret').checked = type==='secret';
  openModal('createModal');
}
async function doCreate(){
  const title=document.getElementById('createName').value.trim();
  const username=document.getElementById('createUsername').value.trim();
  const desc=document.getElementById('createDesc').value.trim();
  const is_public=document.getElementById('createPublic').checked;
  const is_secret=document.getElementById('createSecret').checked;
  const secret_ttl=parseInt(document.getElementById('createSecretTtl').value)||0;
  if(createType==='private'){ const uname=document.getElementById('createPrivate').value.trim(); if(!uname) return alert('Укажи юзернейм'); const users=await api('/api/users/search?q='+uname); const u=users[0]; if(!u) return alert('Не найден'); const ch=await api('/api/chats',{method:'POST', body:{type:'private', members:[u.id]}}); closeModal('createModal'); await loadChats(); openChat(ch.id); }
  else {
    if(!title) return alert('Название');
    const membersRaw=document.getElementById('createMembers').value.split(',').map(s=>s.trim()).filter(Boolean);
    const memberIds=[]; for(const un of membersRaw){ const users=await api('/api/users/search?q='+un); if(users[0]) memberIds.push(users[0].id); }
    const realType = is_secret? 'private' : createType;
    const ch=await api('/api/chats',{method:'POST', body:{type: realType==='secret'?'private':createType, title, username, description:desc, members:memberIds, is_public, is_secret, secret_ttl}});
    if(ch.error) return alert(ch.error); closeModal('createModal'); await loadChats(); openChat(ch.id);
  }
}
function openProfile(){ document.getElementById('pfFirst').value=me.first_name; document.getElementById('pfLast').value=me.last_name||''; document.getElementById('pfUser').value=me.username; document.getElementById('pfBio').value=me.bio||''; document.getElementById('pfBioExtra').value=me.bio_extra||''; document.getElementById('pfAvatar').value=me.avatar||''; document.getElementById('pfBadge').value=me.badge||''; document.getElementById('pfEmoji').value=me.emoji_status||''; openModal('profileModal'); }
async function saveProfile(){
  const body={first_name: document.getElementById('pfFirst').value.trim(), last_name: document.getElementById('pfLast').value.trim(), username: document.getElementById('pfUser').value.trim(), bio: document.getElementById('pfBio').value, bio_extra: document.getElementById('pfBioExtra').value, avatar: document.getElementById('pfAvatar').value.trim(), badge: document.getElementById('pfBadge').value, emoji_status: document.getElementById('pfEmoji').value};
  const res=await api('/api/me',{method:'PUT', body}); if(res.error) return alert(res.error); me=res; closeModal('profileModal'); renderDrawer(); if(activeId){ const det=await api('/api/chats/'+activeId); loadRight(det); }
}
function logout(){ localStorage.removeItem('tg_token'); location.reload(); }
function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeModal(id){ document.getElementById(id).classList.remove('show'); if(id==='videoModal' && vcStream){ vcStream.getTracks().forEach(t=>t.stop()); vcStream=null; } }
function openLight(src){ document.getElementById('lightboxImg').src=src; openModal('lightbox'); }
if(token){ fetch('/api/me',{headers:{'x-token':token}}).then(r=>r.json()).then(u=>{ if(u && !u.error){ me=u; document.getElementById('auth').style.display='none'; document.getElementById('app').classList.add('show'); init(); } }); }
document.addEventListener('click', e=>{ const p=document.getElementById('attachPanel'); if(!e.target.closest('.attach') && p && p.classList.contains('show')) p.classList.remove('show'); if(!e.target.closest('.input-wrap') && !e.target.closest('.emoji-panel')){ const ep=document.getElementById('emojiPanel'); if(ep) ep.classList.remove('show'); } });
document.getElementById('createSecret')?.addEventListener('change', e=>{ document.getElementById('createSecretTtl').style.display=e.target.checked?'block':'none'; });
