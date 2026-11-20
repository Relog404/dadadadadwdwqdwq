let me=null, token=localStorage.getItem('tg_token'), chats=[], activeId=null, replyTo=null, editId=null, pinnedId=null;
let gifts=[], isRecording=false, mediaRecorder=null, audioChunks=[], recStart=0, recTimer=null;
let vcStream=null, vcRecorder=null, vcChunks=[], vcRecording=false;
let emojiCats={
  '😊':['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🤩','😍','🥰','😘','😋','🤗','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😰','😥','😳','🤪','😵','🥴','😠','😡','🤬','😷','🤒','🤕','🤢','🤮','🥳','🥺','🤠','🤡','🥸','😎','🤓','🧐'],
  '❤️':['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💝','💘','💟','♥️','💋','🩷','🩵','🩶'],
  '🎉':['🎉','🎊','🎂','🎁','🎈','🎀','🪅','🥳','🎇','🎆','✨','⭐','🌟','💫','🔥','💥','🎵','🎶','🎤','🎧','🎸'],
  '🐻':['🐻','🐶','🐱','🐭','🐹','🐰','🦊','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🦈','🐊','🐅'],
  '🍔':['🍔','🍕','🌭','🥪','🌮','🌯','🥙','🧆','🥚','🍳','🥘','🍲','🥗','🍿','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🥂','🥃','🧃','🧉','🧊'],
  '⚽':['⚽','⚾','🥎','🏀','🏐','🏈','🏉','🎾','🥏','🎳','🏏','🏑','🏒','🥍','🏓','🏸','🥊','🥋','🥅','⛳','⛸️','🎣','🤿','🎽','🎿','🛷','🥌','🎯','🪀','🪁','🎱','🔮','🧿','🎮','🕹️','🎰','🎲','🧩','🧸','♠️','♥️','♦️','♣️','♟️','🃏','🀄','🎴'],
  '🚀':['🚀','✈️','🚁','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚌','🚎','🚐','🚑','🚒','🚓','🚕','🚗','🚙','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢']
};
let recentEmoji = JSON.parse(localStorage.getItem('recentEmoji')||'[]');
let socket=null;

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
  const res= await fetch('/api/auth/send-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})}).then(r=>r.json());
  if(res.ok){
    document.getElementById('authStep1').style.display='none';
    document.getElementById('authStep2').style.display='block';
    document.getElementById('devCode').style.display='block';
    document.getElementById('devCode').textContent='Код (dev): '+res.dev_code;
    document.getElementById('phone').dataset.phone=phone;
    // detect if new user -> show reg fields
    // we show after fail? simpler show always if not in demo list
  } else alert(res.error||'ошибка');
}
function backToPhone(){
  document.getElementById('authStep1').style.display='block';
  document.getElementById('authStep2').style.display='none';
}
async function verifyCode(){
  const phone=document.getElementById('phone').dataset.phone || document.getElementById('phone').value.trim();
  const code=document.getElementById('code').value.trim();
  if(!code) return;
  const body={phone, code};
  // if reg fields visible
  const rf=document.getElementById('regFields');
  if(rf.style.display!=='none'){
    body.first_name=document.getElementById('regFirst').value;
    body.last_name=document.getElementById('regLast').value;
    body.username=document.getElementById('regUser').value;
  }
  const res= await fetch('/api/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
  if(res.error){
    if(res.error==='username taken'){ document.getElementById('regFields').style.display='block'; document.getElementById('verifyErr').textContent='Юзернейм занят — укажи другой'; return; }
    // if user not found, show reg
    if(!res.token){ document.getElementById('regFields').style.display='block'; document.getElementById('verifyErr').textContent=res.error; return; }
  }
  if(res.token){
    token=res.token; localStorage.setItem('tg_token', token); me=res.user;
    document.getElementById('auth').style.display='none';
    document.getElementById('app').classList.add('show');
    init();
  }
}

async function init(){
  me = await api('/api/me');
  if(!me || me.error){ localStorage.removeItem('tg_token'); location.reload(); return; }
  gifts = await api('/api/gifts');
  buildEmoji();
  buildGifts();
  await loadChats();
  connectSocket();
  renderDrawer();
  // open first chat
  if(chats[0]) openChat(chats[0].id);
}
function connectSocket(){
  socket=io();
  socket.on('new_message', m=>{
    // reload messages if active
    if(m.chat_id===activeId) loadMessages(activeId);
    loadChats();
  });
  socket.on('update_message', m=>{ if(m.chat_id===activeId) loadMessages(activeId); });
  socket.on('delete_message', d=>{ if(d.chat_id===activeId) loadMessages(activeId); loadChats(); });
  socket.on('reaction', d=>{ if(document.querySelector(`[data-mid="${d.message_id}"]`)) loadMessages(activeId); });
  socket.on('pin', ()=> loadChats());
  socket.on('typing', ({chatId, userId, isTyping})=>{
    if(chatId===activeId){
      document.getElementById('typingHint').style.display = isTyping? 'block':'none';
      document.getElementById('typingHint').textContent = isTyping? 'печатает...':'';
    }
  });
}
function renderDrawer(){
  document.getElementById('drawerName').textContent = (me.first_name+' '+(me.last_name||'')).trim();
  document.getElementById('drawerPhone').textContent = me.phone + ' @'+me.username;
  document.getElementById('drawerAvatar').textContent = (me.first_name[0]||'U');
}

async function loadChats(){
  const data=await api('/api/chats');
  if(Array.isArray(data)) chats=data;
  renderChats();
}
function renderChats(){
  const q=(document.getElementById('search').value||'').toLowerCase();
  const el=document.getElementById('chatList'); el.innerHTML='';
  let list=[...chats];
  if(q) list=list.filter(c=>{
    const title=(c.title|| getPrivateName(c) || '').toLowerCase();
    const last=(c.last_message?.content||'').toLowerCase();
    return title.includes(q)|| last.includes(q) || (c.username||'').toLowerCase().includes(q);
  });
  list.sort((a,b)=> (b.last_message?.created||b.created) - (a.last_message?.created||a.created));
  // pinned on top
  // simple
  if(!list.length){ el.innerHTML=`<div style="padding:24px;text-align:center;color:#a8afb8">Чатов нет</div>`; return; }
  list.forEach(c=>{
    const isPrivate=c.type==='private';
    let title=c.title;
    let avatarLetter=(c.title||'')[0]||'?';
    let avatarUrl=c.avatar||'';
    let sub=c.description||'';
    let online=false;
    if(isPrivate){
      const other = c.members?.find(m=>m.user_id!==me.id);
      // need fetch full chat? use members already? we have user list from chats endpoint not detailed
      // fallback: find user from members
      // we will fetch chat detail for private name via title empty, need to derive from last_message sender?
      // Better: load chat detail on demand - but we can use placeholder
      title = getPrivateName(c) || c.username || 'Сохранённые';
      avatarLetter = title[0]||'?';
      // try find member user
      // members array in chats has user_id + role
    }
    const last = c.last_message;
    const unread = c.unread||0;
    const time = last? fmtTime(last.created):'';
    const item=document.createElement('div');
    item.className='chat-item'+(c.id===activeId?' active':'') + (c.pinned_msg?' pinned':'');
    item.onclick=()=>openChat(c.id);
    const verified = c.type==='channel'? badgeHtml('blue'):''; // simplified
    item.innerHTML=`
      <div class="avatar">${avatarUrl?`<img src="${avatarUrl}">`:avatarLetter}</div>
      <div class="chat-main">
        <div class="chat-head"><div class="chat-name">${escape(title)} ${verified} ${c.type==='channel'?'📢': c.type==='group'?'👥':''}</div><div class="chat-time">${time}</div></div>
        <div class="chat-last"><span style="flex:1;overflow:hidden;text-overflow:ellipsis">${last? (last.sender_id===me.id?'Вы: ':'') + preview(last) : sub}</span>
          ${c.pinned_msg?`<span class="pin-icon">📌</span>`:''}
          ${unread?`<span class="unread">${unread>99?'99+':unread}</span>`:''}
        </div>
      </div>
    `;
    el.appendChild(item);
  });
}
function getPrivateName(c){
  // if we have detailed members with names, use it
  if(c.membersDetailed){
    const o=c.membersDetailed.find(m=>m.user_id!==me.id);
    if(o) return (o.first_name+' '+(o.last_name||'')).trim();
  }
  // fallback from cached detail
  return c._privateName||'';
}
function preview(m){
  if(m.type==='photo') return '🖼️ Фото';
  if(m.type==='voice') return '🎤 Голосовое';
  if(m.type==='video_note') return '⭕ Видео';
  if(m.type==='gift') return '🎁 Подарок';
  if(m.type==='location') return '📍 Геопозиция';
  if(m.type==='file') return '📎 Файл';
  return (m.content||m.caption||'').slice(0,40);
}
function fmtTime(ts){
  const d=new Date(ts);
  const now=new Date();
  const sameDay = d.toDateString()===now.toDateString();
  if(sameDay) return d.toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('ru',{day:'numeric',month:'short'});
}
function fmtDate(ts){ return new Date(ts).toLocaleDateString('ru',{day:'numeric',month:'long', year:'numeric'});}
function escape(s){ return String(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

let chatDetailCache={};
async function openChat(id){
  activeId=id;
  renderChats();
  document.getElementById('chatHeader').style.display='flex';
  document.getElementById('composer').style.display='flex';
  document.getElementById('sidebar').classList.remove('open');
  socket.emit('join', id);
  // fetch chat detail
  const det=await api('/api/chats/'+id);
  chatDetailCache[id]=det;
  // enrich private name
  const c=chats.find(x=>x.id===id);
  if(c && det.members){
    c.membersDetailed=det.members;
    const other=det.members.find(m=>m.user_id!==me.id);
    if(other) c._privateName = (other.first_name+' '+(other.last_name||'')).trim();
  }
  renderHeader(det);
  renderPinned(det);
  await loadMessages(id);
  loadRight(det);
}
function renderHeader(det){
  const el=document.getElementById('chatHeader');
  const isPrivate=det.type==='private';
  let title=det.title;
  let sub=det.description||'';
  let avatarLetter=(det.title||'?')[0]||'?';
  let avatarUrl=det.avatar||'';
  if(isPrivate){
    const other=det.members.find(m=>m.user_id!==me.id);
    if(other){ title=(other.first_name+' '+(other.last_name||'')).trim(); sub='@'+other.username+' • '+(other.online?'в сети':'был(а) недавно'); avatarLetter=other.first_name[0]||'?'; avatarUrl=other.avatar||''; }
    else { title='Избранное'; sub=''; }
  } else {
    sub = det.type==='channel'? `${det.members.length} подписчиков • ${det.description||''}` : `${det.members.length} участников`;
  }
  const canPost = det.type!=='channel' || det.owner_id===me.id || det.members.some(m=>m.user_id===me.id && m.role==='admin');
  el.innerHTML=`
    <div class="avatar" style="width:40px;height:40px;font-size:16px">${avatarUrl?`<img src="${avatarUrl}">`:avatarLetter}</div>
    <div class="info"><div class="title">${escape(title)} ${det.type==='channel'?'📢': det.type==='group'?'👥':''}</div><div class="sub">${escape(sub)}</div></div>
    <button class="icon-btn" onclick="toggleMute()">🔔</button>
    <button class="icon-btn" onclick="toggleRight()">⋯</button>
  `;
  // hide composer if channel no rights
  document.getElementById('composer').style.display = canPost? 'flex':'none';
}
function renderPinned(det){
  const el=document.getElementById('pinned');
  if(det.pinned_msg){
    // we need pinned message content - fetch via? we have in chats list pinned_msg_obj
    const c=chats.find(x=>x.id===det.id);
    const pinObj = c?.pinned_msg_obj;
    el.style.display='flex';
    el.innerHTML=`<div class="line"></div><div style="flex:1"><div style="color:#5288c1;font-size:13px;font-weight:600">Закреплённое сообщение</div><div style="color:#a8afb8;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escape(pinObj? (pinObj.content||pinObj.caption||'') : 'сообщение')}</div></div><span>📌</span>`;
    pinnedId=det.pinned_msg;
  } else { el.style.display='none'; pinnedId=null; }
}
function scrollPinned(){ if(!pinnedId) return; const e=document.querySelector(`[data-mid="${pinnedId}"]`); if(e) e.scrollIntoView({behavior:'smooth',block:'center'}); }

let messagesCache=[];
async function loadMessages(chatId){
  const data=await api(`/api/chats/${chatId}/messages`);
  messagesCache=data||[];
  renderMessages();
}
function renderMessages(){
  const inner=document.getElementById('messagesInner'); inner.innerHTML='';
  if(!messagesCache.length){
    inner.innerHTML=`<div class="empty"><div class="empty-card"><div style="font-size:32px">✈️</div><h3>Нет сообщений</h3><p style="color:#a8afb8;font-size:13px;margin-top:6px">Отправьте первое сообщение</p></div></div>`;
    return;
  }
  let lastDate='';
  messagesCache.forEach(m=>{
    const d=fmtDate(m.created);
    if(d!==lastDate){ const sep=document.createElement('div'); sep.className='date-sep'; sep.textContent=d; inner.appendChild(sep); lastDate=d; }
    inner.appendChild(msgEl(m));
  });
  const cont=document.getElementById('messages');
  cont.scrollTop=cont.scrollHeight;
}
function msgEl(m){
  const isOut=m.sender_id===me.id;
  const row=document.createElement('div');
  row.className='msg-row'+(isOut?' out':'');
  row.dataset.mid=m.id;
  const sender = m.sender || {first_name:'', last_name:'', username:''};
  const name = (sender.first_name+' '+(sender.last_name||'')).trim() || sender.username || 'User';
  let content='';
  if(m.forwarded_from){
    content+=`<div class="forward">↪ Переслано от ${escape(m.forwarded_name||'пользователя')}</div>`;
  }
  if(m.reply_to){
    const rep=messagesCache.find(x=>x.id===m.reply_to);
    if(rep) content+=`<div class="reply"><b>${escape(rep.sender?.first_name||'Сообщение')}</b><div>${escape(rep.content||rep.caption||'[медиа]')}</div></div>`;
  }
  if(m.type==='text'){
    const txt = linkify(escape(m.content));
    content+=`<div class="bubble-text">${txt} ${m.edited?'<span style="opacity:.6;font-size:11px">(изменено)</span>':''}</div>`;
  } else if(m.type==='photo'){
    content+=`<div class="photo" onclick="openLight('${m.content}')"><img src="${m.content}" loading="lazy"></div>${m.caption?`<div class="bubble-text">${escape(m.caption)}</div>`:''}`;
  } else if(m.type==='voice'){
    const dur=m.duration||0;
    const wf = m.waveform ? JSON.parse(m.waveform) : Array.from({length:24},()=>8+Math.random()*18);
    content+=`<div class="voice"><button class="voice-play" onclick="playVoice(this,'${m.content}')">▶</button><div class="wave">${wf.map(h=>`<i style="height:${h}px"></i>`).join('')}</div><span style="font-size:12px;opacity:.8">${dur}″</span></div>`;
  } else if(m.type==='video_note'){
    content+=`<div class="video-circle"><video src="${m.content}" autoplay loop muted playsinline onclick="this.paused?this.play():this.pause()"></video></div>`;
  } else if(m.type==='location'){
    content+=`<div class="loc"><div class="loc-map">📍<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:#0e1621;padding:4px 8px;border-radius:999px;font-size:11px">${Number(m.location_lat).toFixed(4)}, ${Number(m.location_lon).toFixed(4)}</div></div><a href="https://maps.google.com/?q=${m.location_lat},${m.location_lon}" target="_blank">Открыть карты</a></div>`;
  } else if(m.type==='gift'){
    const g=gifts.find(x=>x.id===m.gift_id);
    content+=`<div class="gift-msg"><div class="gift-icon" style="background:${g?.color||'#2b5278'}">${g?.emoji||'🎁'}</div><div><b>${escape(g?.name||'Подарок')}</b><div style="font-size:12px;color:#a8afb8">Подарок от ${escape(name)}</div></div></div>`;
  } else if(m.type==='file'){
    content+=`<div class="file-msg"><div class="file-icon">📄</div><div><b>${escape(m.file_name||'файл')}</b><div style="font-size:12px;color:#a8afb8">${formatSize(m.file_size)}</div></div><a href="${m.content}" target="_blank" style="margin-left:auto;color:#5288c1">⬇</a></div>${m.caption?`<div class="bubble-text">${escape(m.caption)}</div>`:''}`;
  } else if(m.type==='system'){
    content+=`<div class="bubble-text" style="font-style:italic;opacity:.8;font-size:13px">${escape(m.content)}</div>`;
  }
  // reactions
  const reacts = m.reactions||[];
  const reactsHtml = reacts.length? `<div class="reacts">${reacts.map(r=>`<span class="react">${r.emoji} ${r.count}</span>`).join('')}</div>`:'';
  const time = new Date(m.created).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
  const views = m.views? `👁 ${m.views}`:'';
  const ticks = isOut? (m.pinned?'📌': views? views : '✓✓') : views;

  row.innerHTML=`
    ${!isOut?`<div class="avatar" style="width:32px;height:32px;font-size:12px">${(sender.first_name||'?')[0]}</div>`:''}
    <div class="bubble">
      ${!isOut && messagesCache.filter(x=>x.chat_id===m.chat_id).length>2? `<div class="bubble-name" style="color:${colorFor(sender.id||sender.username)}">${escape(name)}</div>`:''}
      ${content}
      ${reactsHtml}
      <div class="bubble-footer"><span class="time">${time}</span><span class="ticks">${ticks}</span></div>
      <div class="actions">
        <button class="act" onclick="setReply('${m.id}')">↩️</button>
        <button class="act" onclick="quickReact('${m.id}')">❤️</button>
        <button class="act" onclick="pinMsg('${m.id}')">📌</button>
        <button class="act" onclick="forwardMsg('${m.id}')">↪</button>
        ${isOut?`<button class="act" onclick="startEdit('${m.id}')">✎</button><button class="act" onclick="deleteMsg('${m.id}')">🗑️</button>`:''}
      </div>
    </div>
  `;
  return row;
}
function colorFor(s){ const colors=['#5288c1','#e17076','#a47cf3','#45b983','#e8a44c','#6ec9cb']; let h=0; for(let i=0;i<String(s).length;i++) h+=String(s).charCodeAt(i); return colors[h%colors.length]; }
function linkify(s){ return s.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank">$1</a>'); }
function formatSize(b){ if(!b) return ''; if(b<1024) return b+' B'; if(b<1024*1024) return (b/1024).toFixed(1)+' KB'; return (b/1024/1024).toFixed(1)+' MB'; }

function loadRight(det){
  const el=document.getElementById('rightBody');
  const isPrivate=det.type==='private';
  let html='';
  if(isPrivate){
    const other=det.members.find(m=>m.user_id!==me.id);
    if(other){
      html+=`<div class="profile-hero"><div class="big">${other.avatar?`<img src="${other.avatar}">`: (other.first_name[0]||'?')}</div><div style="font-weight:600">${escape(other.first_name+' '+(other.last_name||''))} ${badge(other.badge)}</div><div style="color:#a8afb8;font-size:13px">@${escape(other.username)} • ${other.phone||''}</div><div style="color:#a8afb8;font-size:13px">${escape(other.bio||'')}</div><div style="color:${other.online?'#0ac630':'#a8afb8'};font-size:12px">${other.online?'в сети':'не в сети'}</div></div>`;
      html+=`<div class="card"><h4>Информация</h4><div style="font-size:13px"><div><b>Телефон:</b> ${escape(other.phone||'')}</div><div><b>Юзернейм:</b> @${escape(other.username)}</div><div><b>О себе:</b> ${escape(other.bio||'—')}</div></div></div>`;
    }
  } else {
    html+=`<div class="profile-hero"><div class="big">${det.avatar?`<img src="${det.avatar}">`: (det.title[0]||'C')}</div><div style="font-weight:600">${escape(det.title)} ${det.type==='channel'?'📢':'👥'}</div><div style="color:#a8afb8;font-size:13px">${escape(det.description||'')}</div><div style="color:#a8afb8;font-size:12px">${det.username?'@'+det.username+' • ':''}${det.members.length} участников</div></div>`;
    html+=`<div class="card"><h4>Участники</h4><div class="members">${det.members.map(m=>`
      <div class="member">
        <div class="avatar" style="width:36px;height:36px;font-size:14px">${m.avatar?`<img src="${m.avatar}">`: (m.first_name[0]||'?')}</div>
        <div style="flex:1"><div style="font-weight:500;font-size:14px">${escape(m.first_name+' '+(m.last_name||''))} ${badge(m.badge)}</div><div style="font-size:12px;color:#a8afb8">@${escape(m.username)} ${det.owner_id===m.user_id?'• владелец': m.role==='admin'?'• админ':''}</div></div>
        ${m.user_id!==me.id?`<button class="btn-ghost" onclick="startPrivate('${m.username}')">Написать</button>`:''}
      </div>`).join('')}</div>
      <div style="margin-top:8px;display:flex;gap:6px"><input id="addMemberInput" placeholder="юзернейм" style="flex:1;padding:8px;border-radius:8px;border:1px solid #243447;background:#242f3d;color:#fff"><button class="btn-tg" style="width:auto;padding:8px 12px" onclick="addMember()">Добавить</button></div>
    </div>`;
  }
  const photos=messagesCache.filter(m=>m.type==='photo').slice(-9);
  if(photos.length) html+=`<div class="card"><h4>Медиа</h4><div class="media-grid">${photos.map(p=>`<img src="${p.content}" onclick="openLight('${p.content}')">`).join('')}</div></div>`;
  html+=`<div class="card"><h4>Действия</h4><button class="btn-ghost" style="width:100%" onclick="clearChat()">🧹 Очистить</button><button class="btn-ghost" style="width:100%;color:#ff6b6b" onclick="leaveChat()">🚪 Выйти</button></div>`;
  el.innerHTML=html;
  document.getElementById('rightTitle').textContent = isPrivate? 'Профиль' : det.title;
}
function badge(b){ if(!b) return ''; return `<span class="badge-verified ${b==='gold'?'gold': b==='green'?'green': b==='premium'?'premium':''}">✓</span>`; }

// composer actions
function autoGrow(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'; }
function onKey(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } }
function onTyping(){
  if(!activeId) return;
  socket.emit('typing', {chatId:activeId, userId:me.id, isTyping:true});
  clearTimeout(onTyping.t);
  onTyping.t=setTimeout(()=> socket.emit('typing',{chatId:activeId, userId:me.id, isTyping:false}), 1000);
}
async function sendMessage(){
  const inp=document.getElementById('msgInput');
  const text=inp.value.trim();
  if(!text && !editId) return;
  if(editId){
    await api(`/api/messages/${editId}`,{method:'PATCH', body:{content:text}});
    editId=null; document.getElementById('editBar').classList.remove('show');
  } else {
    const fd=new FormData();
    fd.append('type','text'); fd.append('content', text);
    if(replyTo) fd.append('reply_to', replyTo);
    await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
    replyTo=null; document.getElementById('replyBar').classList.remove('show');
  }
  inp.value=''; autoGrow(inp);
  await loadMessages(activeId); loadChats();
}
function setReply(id){
  replyTo=id;
  const m=messagesCache.find(x=>x.id===id);
  document.getElementById('replyBar').classList.add('show');
  document.getElementById('replyName').textContent=m.sender.first_name;
  document.getElementById('replyText').textContent=m.content||m.caption||'[медиа]';
  document.getElementById('msgInput').focus();
}
function cancelReply(){ replyTo=null; document.getElementById('replyBar').classList.remove('show'); }
function startEdit(id){
  const m=messagesCache.find(x=>x.id===id);
  editId=id;
  document.getElementById('editBar').classList.add('show');
  document.getElementById('editText').textContent=m.content.slice(0,40);
  document.getElementById('msgInput').value=m.content; document.getElementById('msgInput').focus();
}
function cancelEdit(){ editId=null; document.getElementById('editBar').classList.remove('show'); document.getElementById('msgInput').value=''; }
async function deleteMsg(id){ if(!confirm('Удалить?')) return; await api(`/api/messages/${id}`,{method:'DELETE'}); loadMessages(activeId); loadChats(); }
async function pinMsg(id){ await api(`/api/messages/${id}/pin`,{method:'POST'}); const det=chatDetailCache[activeId]; if(det){ det.pinned_msg = det.pinned_msg===id? null: id; renderPinned(det);} loadMessages(activeId); }
async function quickReact(id){
  const emojis=['❤️','🔥','👍','😂','🎉','😍'];
  const e=prompt('Реакция: '+emojis.join(' '),'❤️'); if(!e) return;
  await api(`/api/messages/${id}/react`,{method:'POST', body:{emoji:e}});
  loadMessages(activeId);
}
async function forwardMsg(id){
  const chatList=chats.map(c=> `${c.id}: ${c.title||c.username||c._privateName||'чат'}`).join('\n');
  const target=prompt('ID чата для пересылки:\n'+chatList); if(!target) return;
  const m=messagesCache.find(x=>x.id===target?false:x.id===id);
  if(!m) return;
  const fd=new FormData();
  fd.append('type', m.type); fd.append('content', m.content); if(m.caption) fd.append('caption', m.caption);
  fd.append('forwarded_from', m.sender_id);
  await fetch(`/api/chats/${target}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
  alert('Переслано');
}

// attach
function toggleAttach(){ document.getElementById('attachPanel').classList.toggle('show'); }
function triggerPhoto(){ document.getElementById('photoInput').click(); toggleAttach(); }
function triggerFile(){ document.getElementById('fileInput').click(); toggleAttach(); }
async function handlePhoto(inp){
  const file=inp.files[0]; if(!file) return;
  const fd=new FormData();
  const type=file.type.startsWith('video')?'video_note':'photo';
  fd.append('file', file); fd.append('type', type); fd.append('content','');
  if(replyTo) fd.append('reply_to', replyTo);
  await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
  replyTo=null; document.getElementById('replyBar').classList.remove('show');
  inp.value=''; loadMessages(activeId); loadChats();
}
async function handleFile(inp){
  const file=inp.files[0]; if(!file) return;
  const fd=new FormData(); fd.append('file', file); fd.append('type','file'); fd.append('content', file.name);
  if(replyTo) fd.append('reply_to', replyTo);
  await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
  inp.value=''; loadMessages(activeId);
}
async function sendLocation(){
  toggleAttach();
  const doSend=(lat,lon)=>{
    const fd=new FormData(); fd.append('type','location'); fd.append('content','');
    fd.append('location_lat', lat); fd.append('location_lon', lon);
    if(replyTo) fd.append('reply_to', replyTo);
    fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd}).then(()=>{ loadMessages(activeId); });
  };
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(p=> doSend(p.coords.latitude, p.coords.longitude), ()=> doSend(55.7558,37.6173));
  } else doSend(55.7558,37.6173);
}

// emoji
function buildEmoji(){
  const head=document.getElementById('emojiHead');
  const cats=Object.keys(emojiCats);
  // add recent
  head.innerHTML=`<button class="emoji-cat active" data-cat="recent">🕒</button>`+ cats.map(c=>`<button class="emoji-cat" data-cat="${c}">${c}</button>`).join('');
  head.querySelectorAll('button').forEach(b=> b.onclick=()=>{ head.querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderEmojiGrid(b.dataset.cat); });
  renderEmojiGrid('recent');
}
function renderEmojiGrid(cat){
  const grid=document.getElementById('emojiGrid'); grid.innerHTML='';
  let list=[];
  if(cat==='recent') list = recentEmoji.length? recentEmoji : emojiCats['😊'].slice(0,16);
  else list = emojiCats[cat]||[];
  list.forEach(e=>{
    const btn=document.createElement('button'); btn.textContent=e; btn.onclick=()=> insertEmoji(e);
    grid.appendChild(btn);
  });
}
function toggleEmoji(){ document.getElementById('emojiPanel').classList.toggle('show'); document.getElementById('giftsPanel').classList.remove('show'); }
function insertEmoji(e){
  const inp=document.getElementById('msgInput'); inp.value+=e; inp.focus();
  recentEmoji = [e, ...recentEmoji.filter(x=>x!==e)].slice(0,32);
  localStorage.setItem('recentEmoji', JSON.stringify(recentEmoji));
}
function buildGifts(){
  const grid=document.getElementById('giftsGrid'); grid.innerHTML='';
  gifts.forEach(g=>{
    const div=document.createElement('div'); div.className='gift-card'; div.innerHTML=`<div class="emo">${g.emoji}</div><b>${escape(g.name)}</b><small>${g.price} ⭐</small>`;
    div.onclick=()=> sendGift(g.id);
    grid.appendChild(div);
  });
}
function openGifts(){ document.getElementById('giftsPanel').classList.add('show'); toggleAttach(); }
function toggleGifts(){ document.getElementById('giftsPanel').classList.toggle('show'); }
async function sendGift(giftId){
  const fd=new FormData(); fd.append('type','gift'); fd.append('gift_id', giftId); fd.append('content','');
  if(replyTo) fd.append('reply_to', replyTo);
  await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
  document.getElementById('giftsPanel').classList.remove('show');
  loadMessages(activeId); loadChats();
}

// voice - real MediaRecorder
async function startVoice(e){
  e.preventDefault();
  if(isRecording) return;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRecorder=new MediaRecorder(stream);
    audioChunks=[];
    mediaRecorder.ondataavailable=ev=> audioChunks.push(ev.data);
    mediaRecorder.onstop= async ()=>{
      const blob=new Blob(audioChunks,{type:'audio/webm'});
      const dur=Math.max(1, Math.round((Date.now()-recStart)/1000));
      // waveform fake
      const wave=JSON.stringify(Array.from({length:30},()=> 6+Math.random()*18|0));
      const fd=new FormData(); fd.append('file', blob, 'voice.webm'); fd.append('type','voice'); fd.append('duration', dur); fd.append('waveform', wave);
      if(replyTo) fd.append('reply_to', replyTo);
      await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
      replyTo=null; document.getElementById('replyBar').classList.remove('show');
      stream.getTracks().forEach(t=>t.stop());
      loadMessages(activeId); loadChats();
    };
    mediaRecorder.start();
    isRecording=true; recStart=Date.now();
    document.getElementById('recordBtn').classList.add('recording');
    document.getElementById('recordBtn').textContent='⏹';
    document.getElementById('typingHint').style.display='block';
    document.getElementById('typingHint').textContent='● Запись... отпусти чтобы отправить';
    }catch{ // fallback
      isRecording=true; recStart=Date.now();
      document.getElementById('recordBtn').classList.add('recording');
      document.getElementById('typingHint').style.display='block';
      document.getElementById('typingHint').textContent='● Запись (демо)';
    }
  }catch(err){ alert('Микрофон недоступен: '+err.message); }
}
async function stopVoice(e){
  e.preventDefault();
  if(!isRecording) return;
  isRecording=false;
  document.getElementById('recordBtn').classList.remove('recording');
  document.getElementById('recordBtn').textContent='🎙️';
  document.getElementById('typingHint').style.display='none';
  if(mediaRecorder && mediaRecorder.state!=='inactive'){
    mediaRecorder.stop();
  } else {
    // demo voice
    const dur=Math.max(1, Math.round((Date.now()-recStart)/1000));
    const fd=new FormData(); fd.append('type','voice'); fd.append('content',''); fd.append('duration', dur); fd.append('waveform', JSON.stringify(Array.from({length:30},()=>6+Math.random()*18|0)));
    if(replyTo) fd.append('reply_to', replyTo);
    await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
    loadMessages(activeId);
  }
}
function playVoice(btn, src){
  if(btn._audio){
    if(!btn._audio.paused){ btn._audio.pause(); btn.textContent='▶'; return; }
    else { btn._audio.play(); btn.textContent='⏸'; return; }
  }
  if(!src || src===''){
    btn.textContent='▶'; setTimeout(()=>btn.textContent='▶',1200); return;
  }
  const a=new Audio(src); btn._audio=a;
  a.play(); btn.textContent='⏸';
  a.onended=()=> btn.textContent='▶';
  a.onerror=()=> btn.textContent='▶';
}

// video circle - real camera
async function startVideoCircle(){
  toggleAttach();
  openModal('videoModal');
  document.getElementById('vcStatus').textContent='Запрашиваем камеру...';
  try{
    vcStream=await navigator.mediaDevices.getUserMedia({video:{width:320,height:320}, audio:true});
    const v=document.getElementById('vcPreview'); v.srcObject=vcStream; await v.play();
    document.getElementById('vcStatus').textContent='Камера готова. Нажми ● Запись';
  }catch(e){ document.getElementById('vcStatus').textContent='Камера недоступна: '+e.message; }
}
function toggleVcRec(){
  if(vcRecording){ stopVcRec(); } else { startVcRec(); }
}
function startVcRec(){
  if(!vcStream) return alert('Камера не готова');
  vcChunks=[]; vcRecorder=new MediaRecorder(vcStream, {mimeType:'video/webm'});
  vcRecorder.ondataavailable=e=> vcChunks.push(e.data);
  vcRecorder.onstop=()=> document.getElementById('vcStatus').textContent='Готово к отправке';
  vcRecorder.start();
  vcRecording=true; document.getElementById('vcRecBtn').textContent='■ Стоп'; document.getElementById('vcRecBtn').style.background='#e53935';
  document.getElementById('vcStatus').textContent='● Запись кружка...';
}
function stopVcRec(){
  if(vcRecorder && vcRecorder.state!=='inactive') vcRecorder.stop();
  vcRecording=false; document.getElementById('vcRecBtn').textContent='● Запись'; document.getElementById('vcRecBtn').style.background='';
}
async function sendVc(){
  let blob=null;
  if(vcChunks.length){ blob=new Blob(vcChunks,{type:'video/webm'}); }
  else {
    // demo if no cam
    const fd=new FormData(); fd.append('type','video_note'); fd.append('content',''); if(replyTo) fd.append('reply_to', replyTo);
    await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
    closeModal('videoModal'); if(vcStream) vcStream.getTracks().forEach(t=>t.stop());
    loadMessages(activeId); return;
  }
  const fd=new FormData(); fd.append('file', blob, 'videonote.webm'); fd.append('type','video_note');
  if(replyTo) fd.append('reply_to', replyTo);
  await fetch(`/api/chats/${activeId}/messages`,{method:'POST', headers:{'x-token':token}, body:fd});
  closeModal('videoModal'); if(vcStream) vcStream.getTracks().forEach(t=>t.stop());
  vcChunks=[]; loadMessages(activeId);
}

// right actions
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open'); }
function toggleRight(){ document.getElementById('right').classList.toggle('open'); }
function openMenu(){ document.getElementById('leftDrawer').classList.add('show'); }
function closeLeft(){ document.getElementById('leftDrawer').classList.remove('show'); }
async function toggleMute(){}
async function clearChat(){ if(!confirm('Очистить чат?')) return; // delete all messages for this chat
  for(const m of messagesCache){ await api(`/api/messages/${m.id}`,{method:'DELETE'}); }
  loadMessages(activeId); loadChats();
}
async function leaveChat(){ if(!confirm('Выйти?')) return; await api(`/api/chats/${activeId}/members/${me.id}`,{method:'DELETE'}); activeId=null; document.getElementById('chatHeader').style.display='none'; document.getElementById('composer').style.display='none'; loadChats(); document.getElementById('messagesInner').innerHTML=''; }
async function startPrivate(username){
  // find or create
  const existing=chats.find(c=> c.type==='private' && c.membersDetailed?.some(m=>m.username===username));
  if(existing) return openChat(existing.id);
  // create
  const user = await api('/api/users/search?q='+username).then(r=>r[0]);
  if(!user) return alert('Не найдено');
  const ch=await api('/api/chats',{method:'POST', body:{type:'private', title:'', members:[user.id]}});
  await loadChats(); openChat(ch.id);
}
async function addMember(){
  const inp=document.getElementById('addMemberInput'); const username=inp.value.trim(); if(!username) return;
  const users=await api('/api/users/search?q='+username); const u=users[0]; if(!u) return alert('Не найден');
  await api(`/api/chats/${activeId}/members`,{method:'POST', body:{user_id:u.id}});
  const det=await api('/api/chats/'+activeId); chatDetailCache[activeId]=det; loadRight(det); loadChats();
}

// create
let createType='group';
function openCreate(type){
  createType=type;
  document.getElementById('createTitle').textContent= type==='private'?'Новый чат': type==='group'?'Новая группа':'Новый канал';
  document.getElementById('createMembersField').style.display= type==='private'?'none':'block';
  document.getElementById('createPrivateField').style.display= type==='private'?'block':'none';
  document.getElementById('createName').value=''; document.getElementById('createDesc').value=''; document.getElementById('createMembers').value=''; document.getElementById('createPrivate').value=''; document.getElementById('createUsername').value='';
  openModal('createModal');
}
async function doCreate(){
  const title=document.getElementById('createName').value.trim();
  const username=document.getElementById('createUsername').value.trim();
  const desc=document.getElementById('createDesc').value.trim();
  if(createType==='private'){
    const uname=document.getElementById('createPrivate').value.trim();
    if(!uname) return alert('Укажи юзернейм');
    const users=await api('/api/users/search?q='+uname); const u=users[0]; if(!u) return alert('Не найден');
    const ch=await api('/api/chats',{method:'POST', body:{type:'private', members:[u.id]}});
    closeModal('createModal'); await loadChats(); openChat(ch.id);
  } else {
    if(!title) return alert('Название');
    const membersRaw=document.getElementById('createMembers').value.split(',').map(s=>s.trim()).filter(Boolean);
    const memberIds=[];
    for(const un of membersRaw){ const users=await api('/api/users/search?q='+un); if(users[0]) memberIds.push(users[0].id); }
    const ch=await api('/api/chats',{method:'POST', body:{type:createType, title, username, description:desc, members:memberIds}});
    if(ch.error) return alert(ch.error);
    closeModal('createModal'); await loadChats(); openChat(ch.id);
  }
}

// profile
function openProfile(){
  document.getElementById('pfFirst').value=me.first_name;
  document.getElementById('pfLast').value=me.last_name||'';
  document.getElementById('pfUser').value=me.username;
  document.getElementById('pfBio').value=me.bio||'';
  document.getElementById('pfAvatar').value=me.avatar||'';
  document.getElementById('pfBadge').value=me.badge||'';
  openModal('profileModal');
}
async function saveProfile(){
  const body={
    first_name: document.getElementById('pfFirst').value.trim(),
    last_name: document.getElementById('pfLast').value.trim(),
    username: document.getElementById('pfUser').value.trim(),
    bio: document.getElementById('pfBio').value,
    avatar: document.getElementById('pfAvatar').value.trim(),
    badge: document.getElementById('pfBadge').value
  };
  const res=await api('/api/me',{method:'PUT', body});
  if(res.error) return alert(res.error);
  me=res; closeModal('profileModal'); renderDrawer(); if(activeId) { const det=await api('/api/chats/'+activeId); loadRight(det); }
}
function logout(){ localStorage.removeItem('tg_token'); location.reload(); }

// modals
function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeModal(id){ document.getElementById(id).classList.remove('show'); if(id==='videoModal' && vcStream){ vcStream.getTracks().forEach(t=>t.stop()); vcStream=null; } }
function openLight(src){ document.getElementById('lightboxImg').src=src; openModal('lightbox'); }

// auth restore
if(token){
  fetch('/api/me',{headers:{'x-token':token}}).then(r=>r.json()).then(u=>{
    if(u && !u.error){ me=u; document.getElementById('auth').style.display='none'; document.getElementById('app').classList.add('show'); init(); }
  });
}
// close attach on outside
document.addEventListener('click', e=>{
  const p=document.getElementById('attachPanel'); if(!e.target.closest('.attach') && p.classList.contains('show')) p.classList.remove('show');
  if(!e.target.closest('.input-wrap') && !e.target.closest('.emoji-panel')) document.getElementById('emojiPanel').classList.remove('show');
});
