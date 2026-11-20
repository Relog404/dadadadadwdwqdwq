import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'db.json');
const upload = multer({ dest: UPLOAD_DIR });

function genId(){ return Math.random().toString(36).slice(2,10) }
function genToken(){ return Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2) }

let db = { users:[], chats:[], messages:[], sessions:{}, codes:{}, gifts:[], reactions:[] };

function loadDB(){
  if(fs.existsSync(DB_FILE)){
    try{ db = JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }catch{}
  }
  if(!db.gifts) db.gifts=[];
  if(!db.reactions) db.reactions=[];
  if(!db.sessions) db.sessions={};
  if(!db.codes) db.codes={};
  saveDB();
}
function saveDB(){ fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2)); }

function seed(){
  if(db.users.length) return;
  db.users=[
    {id:'u1', phone:'+79990000001', first_name:'Алексей', last_name:'Волков', username:'alex', bio:'Люблю код и кофе', avatar:'', badge:'blue', online:1, last_seen:Date.now()},
    {id:'u2', phone:'+79990000002', first_name:'Мария', last_name:'Ковалева', username:'maria', bio:'Дизайнер · Figma ♥', avatar:'', badge:'premium', online:1, last_seen:Date.now()},
    {id:'u3', phone:'+79990000003', first_name:'Дима', last_name:'Стартап', username:'dima', bio:'Канал про стартапы', avatar:'', badge:'gold', online:1, last_seen:Date.now()},
    {id:'u4', phone:'+79990000004', first_name:'Tele', last_name:'Поддержка', username:'support', bio:'Официальная поддержка Tele', avatar:'', badge:'green', online:1, last_seen:Date.now()},
    {id:'u5', phone:'+79990000005', first_name:'Анна', last_name:'', username:'anna', bio:'', avatar:'', badge:'', online:1, last_seen:Date.now()},
    {id:'u6', phone:'+79990000006', first_name:'Иван', last_name:'Петров', username:'ivan', bio:'', avatar:'', badge:'blue', online:1, last_seen:Date.now()},
  ];
  db.chats=[
    {id:'c1', type:'private', title:'', username:'', avatar:'', description:'', owner_id:'u1', created:Date.now(), members:[{user_id:'u1',role:'member'},{user_id:'u2',role:'member'}], pinned_msg:null},
    {id:'c2', type:'group', title:'Дизайн-чат', username:'designchat', avatar:'', description:'Обсуждаем UI', owner_id:'u1', created:Date.now(), members:[{user_id:'u1',role:'admin'},{user_id:'u2',role:'member'},{user_id:'u3',role:'member'},{user_id:'u6',role:'member'}], pinned_msg:null},
    {id:'c3', type:'channel', title:'Новости Tele', username:'telenews', avatar:'', description:'Официальный канал Tele', owner_id:'u4', created:Date.now(), members:[{user_id:'u1',role:'member'},{user_id:'u2',role:'member'},{user_id:'u3',role:'member'},{user_id:'u4',role:'admin'},{user_id:'u6',role:'member'}], pinned_msg:null},
    {id:'c4', type:'private', title:'', username:'', avatar:'', description:'', owner_id:'u1', created:Date.now(), members:[{user_id:'u1',role:'member'},{user_id:'u4',role:'member'}], pinned_msg:null},
  ];
  db.messages=[
    {id:'m1', chat_id:'c1', sender_id:'u2', type:'text', content:'Привет! Как тебе новый Tele?', caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now()-1000000, views:0},
    {id:'m2', chat_id:'c1', sender_id:'u1', type:'text', content:'Очень круто 😍 Прям как в оригинале', caption:'', reply_to:'m1', forwarded_from:null, forwarded_name:'', gift_id:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now()-900000, views:0},
    {id:'m3', chat_id:'c2', sender_id:'u3', type:'text', content:'Ребята, зацените концепт', caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now()-800000, views:0},
    {id:'m4', chat_id:'c3', sender_id:'u4', type:'text', content:'Добро пожаловать в Tele! Подписывайтесь на обновления.', caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:1, edited:0, created:Date.now()-700000, views:1234},
  ];
  db.gifts=[
    {id:'g1', name:'Сердце', emoji:'💖', price:500, color:'#ff3b5c', animation:'pulse'},
    {id:'g2', name:'Роза', emoji:'🌹', price:250, color:'#e11d48', animation:'rotate'},
    {id:'g3', name:'Кубок', emoji:'🏆', price:1000, color:'#eab308', animation:'bounce'},
    {id:'g4', name:'Ракета', emoji:'🚀', price:750, color:'#6366f1', animation:'fly'},
    {id:'g5', name:'Огонь', emoji:'🔥', price:300, color:'#f97316', animation:'flicker'},
    {id:'g6', name:'Алмаз', emoji:'💎', price:2000, color:'#06b6d4', animation:'shine'},
    {id:'g7', name:'Клоун', emoji:'🤡', price:150, color:'#a855f7', animation:'wobble'},
    {id:'g8', name:'Торт', emoji:'🎂', price:400, color:'#ec4899', animation:'pop'},
    {id:'g9', name:'Медведь', emoji:'🧸', price:600, color:'#f59e0b', animation:'hug'},
    {id:'g10', name:'Звезда', emoji:'⭐', price:350, color:'#facc15', animation:'twinkle'},
    {id:'g11', name:'Подарок', emoji:'🎁', price:200, color:'#22c55e', animation:'box'},
    {id:'g12', name:'Кольцо', emoji:'💍', price:1500, color:'#e879f9', animation:'sparkle'},
  ];
  saveDB();
}
loadDB(); seed();

function auth(req,res,next){
  const token = req.headers['x-token'] || req.query.token;
  if(!token) return res.status(401).json({error:'no token'});
  const uid = db.sessions[token];
  if(!uid) return res.status(401).json({error:'bad token'});
  req.userId = uid; req.token=token; next();
}
function getUser(id){ return db.users.find(u=>u.id===id); }

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname,'public')));

// auth
app.post('/api/auth/send-code', (req,res)=>{
  const {phone}=req.body;
  if(!phone) return res.status(400).json({error:'phone required'});
  const code=String(Math.floor(10000+Math.random()*90000));
  db.codes[phone]={code, created:Date.now()};
  saveDB();
  console.log(`[CODE] ${phone} -> ${code}`);
  res.json({ok:true, dev_code:code});
});
app.post('/api/auth/verify', (req,res)=>{
  const {phone, code, first_name, last_name, username}=req.body;
  if(!phone||!code) return res.status(400).json({error:'phone+code'});
  const row=db.codes[phone];
  if(!row) return res.status(400).json({error:'код не отправлен'});
  if(row.code!==code) return res.status(400).json({error:'неверный код'});
  let user=db.users.find(u=>u.phone===phone);
  if(!user){
    const id=genId();
    const uname=username || 'user'+Math.floor(Math.random()*10000);
    if(db.users.some(u=>u.username===uname)) return res.status(400).json({error:'username taken'});
    user={id, phone, first_name: first_name||'Новый', last_name: last_name||'пользователь', username:uname, bio:'', avatar:'', badge:'', online:1, last_seen:Date.now()};
    db.users.push(user);
  }
  const token=genToken();
  db.sessions[token]=user.id;
  delete db.codes[phone];
  saveDB();
  res.json({token, user});
});
app.get('/api/me', auth, (req,res)=> res.json(getUser(req.userId)));
app.put('/api/me', auth, (req,res)=>{
  const u=getUser(req.userId);
  const {first_name,last_name,username,bio,avatar,badge}=req.body;
  if(username && username!==u.username && db.users.some(x=>x.username===username && x.id!==u.id)) return res.status(400).json({error:'username taken'});
  if(first_name!==undefined) u.first_name=first_name;
  if(last_name!==undefined) u.last_name=last_name;
  if(username!==undefined) u.username=username;
  if(bio!==undefined) u.bio=bio;
  if(avatar!==undefined) u.avatar=avatar;
  if(badge!==undefined) u.badge=badge;
  saveDB(); res.json(u);
});
app.get('/api/users/search', auth, (req,res)=>{
  const q=(req.query.q||'').toLowerCase();
  if(!q) return res.json([]);
  res.json(db.users.filter(u=> u.username.toLowerCase().includes(q) || u.first_name.toLowerCase().includes(q) || u.phone.includes(q)).slice(0,10));
});
app.get('/api/gifts', (req,res)=> res.json(db.gifts));

// chats
app.get('/api/chats', auth, (req,res)=>{
  const list=db.chats.filter(c=> c.members.some(m=>m.user_id===req.userId));
  const out=list.map(c=>{
    const last=[...db.messages].filter(m=>m.chat_id===c.id).sort((a,b)=>b.created-a.created)[0]||null;
    const unread=db.messages.filter(m=>m.chat_id===c.id && m.sender_id!==req.userId).length;
    let pinned_obj=null;
    if(c.pinned_msg) pinned_obj=db.messages.find(m=>m.id===c.pinned_msg)||null;
    return {...c, last_message:last, unread, pinned_msg_obj:pinned_obj};
  });
  res.json(out);
});
app.post('/api/chats', auth, (req,res)=>{
  const {type,title,username,avatar,description,members}=req.body;
  if(!type) return res.status(400).json({error:'type'});
  const id=genId();
  const chat={id,type,title:title||'', username:username||'', avatar:avatar||'', description:description||'', owner_id:req.userId, created:Date.now(), members:[{user_id:req.userId, role:'admin'}], pinned_msg:null};
  if(members && Array.isArray(members)) for(const uid of members) if(!chat.members.some(m=>m.user_id===uid)) chat.members.push({user_id:uid, role:'member'});
  db.chats.push(chat);
  db.messages.push({id:genId(), chat_id:id, sender_id:req.userId, type:'system', content: type==='channel'?`Канал "${title}" создан`:`Чат "${title||'приват'}" создан`, caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now(), views:0});
  saveDB(); res.json(chat);
});
app.get('/api/chats/:id', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  if(!c) return res.status(404).json({error:'not found'});
  const members=c.members.map(m=>{
    const u=getUser(m.user_id);
    return {...m, ...u};
  });
  res.json({...c, members});
});
app.put('/api/chats/:id', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  if(!c) return res.status(404).json({error:'not found'});
  const meMemb=c.members.find(m=>m.user_id===req.userId);
  if(!meMemb || (meMemb.role!=='admin' && c.owner_id!==req.userId)) return res.status(403).json({error:'forbidden'});
  const {title,username,avatar,description}=req.body;
  if(title!==undefined) c.title=title;
  if(username!==undefined) c.username=username;
  if(avatar!==undefined) c.avatar=avatar;
  if(description!==undefined) c.description=description;
  saveDB(); res.json(c);
});
app.post('/api/chats/:id/members', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  if(!c) return res.status(404).json({error:'not found'});
  const {user_id}=req.body;
  if(!c.members.some(m=>m.user_id===user_id)) c.members.push({user_id, role:'member'});
  db.messages.push({id:genId(), chat_id:c.id, sender_id:user_id, type:'system', content:'Пользователь добавлен', caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now(), views:0});
  saveDB(); res.json({ok:true});
});
app.delete('/api/chats/:id/members/:uid', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  if(!c) return res.status(404).json({error:'not found'});
  c.members=c.members.filter(m=>m.user_id!==req.params.uid);
  saveDB(); res.json({ok:true});
});
app.post('/api/chats/:id/pin', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  c.pinned_msg=req.body.message_id||null;
  if(req.body.message_id){ const m=db.messages.find(x=>x.id===req.body.message_id); if(m) m.pinned=1; }
  saveDB(); res.json({ok:true});
});

// messages
app.get('/api/chats/:id/messages', auth, (req,res)=>{
  const msgs=db.messages.filter(m=>m.chat_id===req.params.id).sort((a,b)=>a.created-b.created);
  const out=msgs.map(m=>{
    const reacts=db.reactions.filter(r=>r.message_id===m.id);
    const grouped={};
    for(const r of reacts){ if(!grouped[r.emoji]) grouped[r.emoji]=[]; grouped[r.emoji].push(r.user_id); }
    const reactions=Object.entries(grouped).map(([emoji,by])=>({emoji, count:by.length, by, mine:by.includes(req.userId)}));
    const sender=getUser(m.sender_id);
    return {...m, reactions, sender};
  });
  res.json(out);
});
app.post('/api/chats/:id/messages', auth, upload.single('file'), (req,res)=>{
  const chat=db.chats.find(c=>c.id===req.params.id);
  if(!chat) return res.status(404).json({error:'not found'});
  if(chat.type==='channel'){
    const mem=chat.members.find(m=>m.user_id===req.userId);
    if(!mem || (mem.role!=='admin' && chat.owner_id!==req.userId)) return res.status(403).json({error:'only admins can post'});
  }
  const {type, content, caption, reply_to, forwarded_from, gift_id, location_lat, location_lon, duration, waveform}=req.body;
  let fileContent=content||'';
  let file_name=null, file_size=null, mime=null;
  if(req.file){ fileContent='/uploads/'+path.basename(req.file.path); file_name=req.file.originalname; file_size=req.file.size; mime=req.file.mimetype; }
  const id=genId();
  const msg={id, chat_id:req.params.id, sender_id:req.userId, type:type||'text', content:fileContent, caption:caption||'', reply_to:reply_to||null, forwarded_from:forwarded_from||null, forwarded_name: forwarded_from? (getUser(forwarded_from)?.first_name||''):'', gift_id:gift_id||null, location_lat: location_lat? parseFloat(location_lat):null, location_lon: location_lon? parseFloat(location_lon):null, file_name, file_size, mime, duration: duration? parseInt(duration):null, waveform: waveform||null, pinned:0, edited:0, created:Date.now(), views: chat.type==='channel'? Math.floor(Math.random()*900+100):0};
  db.messages.push(msg);
  saveDB();
  const enriched={...msg, sender:getUser(req.userId), reactions:[]};
  io.to(chat.id).emit('new_message', enriched);
  res.json(enriched);
});
app.patch('/api/messages/:id', auth, (req,res)=>{
  const m=db.messages.find(x=>x.id===req.params.id);
  if(!m) return res.status(404).json({error:'not found'});
  if(m.sender_id!==req.userId) return res.status(403).json({error:'forbidden'});
  if(req.body.content!==undefined) m.content=req.body.content;
  if(req.body.caption!==undefined) m.caption=req.body.caption;
  m.edited=1; saveDB();
  io.to(m.chat_id).emit('update_message', m);
  res.json(m);
});
app.delete('/api/messages/:id', auth, (req,res)=>{
  const m=db.messages.find(x=>x.id===req.params.id);
  if(!m) return res.status(404).json({error:'not found'});
  if(m.sender_id!==req.userId){
    const chat=db.chats.find(c=>c.id===m.chat_id);
    const mem=chat.members.find(x=>x.user_id===req.userId);
    if(!mem || mem.role!=='admin') return res.status(403).json({error:'forbidden'});
  }
  db.messages=db.messages.filter(x=>x.id!==m.id);
  db.reactions=db.reactions.filter(r=>r.message_id!==m.id);
  saveDB();
  io.to(m.chat_id).emit('delete_message', {id:m.id, chat_id:m.chat_id});
  res.json({ok:true});
});
app.post('/api/messages/:id/react', auth, (req,res)=>{
  const m=db.messages.find(x=>x.id===req.params.id);
  if(!m) return res.status(404).json({error:'not found'});
  const {emoji}=req.body;
  const ex=db.reactions.find(r=>r.message_id===m.id && r.user_id===req.userId);
  if(ex){
    if(ex.emoji===emoji) db.reactions=db.reactions.filter(r=> !(r.message_id===m.id && r.user_id===req.userId));
    else ex.emoji=emoji;
  } else db.reactions.push({message_id:m.id, user_id:req.userId, emoji});
  saveDB();
  const reacts=db.reactions.filter(r=>r.message_id===m.id);
  io.to(m.chat_id).emit('reaction', {message_id:m.id, reacts});
  res.json({ok:true, reacts});
});
app.post('/api/messages/:id/pin', auth, (req,res)=>{
  const m=db.messages.find(x=>x.id===req.params.id);
  if(!m) return res.status(404).json({error:'not found'});
  m.pinned = m.pinned?0:1;
  const chat=db.chats.find(c=>c.id===m.chat_id);
  chat.pinned_msg = m.pinned? m.id : null;
  saveDB();
  io.to(m.chat_id).emit('pin', {message_id:m.id});
  res.json({ok:true});
});

io.on('connection', socket=>{
  socket.on('join', id=> socket.join(id));
  socket.on('typing', ({chatId, userId, isTyping})=> socket.to(chatId).emit('typing', {chatId, userId, isTyping}));
});

const PORT=process.env.PORT||8000;
httpServer.listen(PORT,'0.0.0.0',()=> console.log(`Tele on ${PORT}`));
