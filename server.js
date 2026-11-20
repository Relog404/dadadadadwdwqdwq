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
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: true }));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'db.json');
const upload = multer({ dest: UPLOAD_DIR });

function genId(){ return Math.random().toString(36).slice(2,10) }
function genToken(){ return Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2) }

let db = { users:[], chats:[], messages:[], sessions:{}, codes:{}, gifts:[], reactions:[], communities:[], bots:[], stories:[], stars_tx:[] };

function loadDB(){
  if(fs.existsSync(DB_FILE)){
    try{ db = JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }catch(e){ console.error(e)}
  }
  // migrate defaults
  if(!db.gifts) db.gifts=[];
  if(!db.reactions) db.reactions=[];
  if(!db.sessions) db.sessions={};
  if(!db.codes) db.codes={};
  if(!db.communities) db.communities=[];
  if(!db.bots) db.bots=[];
  if(!db.stories) db.stories=[];
  if(!db.stars_tx) db.stars_tx=[];
  // ensure user fields
  for(const u of db.users){
    if(u.premium===undefined) u.premium = ['premium','gold','green'].includes(u.badge) ? true : false; // backward
    if(u.premium_until===undefined) u.premium_until = u.premium ? Date.now()+30*864e5 : null;
    if(u.stars===undefined) u.stars = 500;
    if(u.business===undefined) u.business = { enabled:false, hours:'9:00-18:00', address:'', welcome:'Привет! Чем могу помочь?', quick_replies:[] };
    if(u.privacy===undefined) u.privacy = { phone:'nobody', last_seen:'contacts', avatar:'all', bio:'all', gifts:'all', calls:'all', messages:'all', add_to_groups:'all', forward_link:'all', close_friends:[] };
    if(u.limits===undefined) u.limits = null;
    if(u.bio_extra===undefined) u.bio_extra = ''; // premium longer bio
    if(u.emoji_status===undefined) u.emoji_status = '';
  }
  for(const c of db.chats){
    if(c.is_public===undefined) c.is_public = !!c.username;
    if(c.invite_link===undefined) c.invite_link='';
    if(c.history_visible===undefined) c.history_visible=true;
    if(c.permissions===undefined) c.permissions = { send_text:true, send_media:true, send_stickers:true, send_gifs:true, send_links:true, embed:true };
    if(c.admin_rights===undefined) c.admin_rights={}; // per user
    if(c.slow_mode===undefined) c.slow_mode=0;
    if(c.auto_delete===undefined) c.auto_delete=0;
    if(c.is_secret===undefined) c.is_secret=false;
    if(c.secret_ttl===undefined) c.secret_ttl=0;
  }
  saveDB();
}
function saveDB(){ fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2)); }

function seed(){
  if(db.users.length) return;
  db.users=[
    {id:'u1', phone:'+79990000001', first_name:'Алексей', last_name:'Волков', username:'alex', bio:'Люблю код и кофе', bio_extra:'', avatar:'', badge:'blue', online:1, last_seen:Date.now(), premium:false, premium_until:null, stars:1200, business:{enabled:false,hours:'9:00-18:00',address:'',welcome:'',quick_replies:[]}, privacy:{phone:'nobody',last_seen:'contacts',avatar:'all',bio:'all',gifts:'all',calls:'all',messages:'all',add_to_groups:'all',forward_link:'all',close_friends:[]}, emoji_status:'', limits:null},
    {id:'u2', phone:'+79990000002', first_name:'Мария', last_name:'Ковалева', username:'maria', bio:'Дизайнер · Figma ♥', bio_extra:'Premium дизайнер', avatar:'', badge:'premium', online:1, last_seen:Date.now(), premium:true, premium_until:Date.now()+30*864e5, stars:2500, business:{enabled:true,hours:'10:00-19:00',address:'Москва, Тверская 1',welcome:'Привет! Рада помочь с дизайном',quick_replies:[]}, privacy:{phone:'nobody',last_seen:'all',avatar:'all',bio:'all',gifts:'all',calls:'all',messages:'all',add_to_groups:'all',forward_link:'all',close_friends:[]}, emoji_status:'✨', limits:null},
    {id:'u3', phone:'+79990000003', first_name:'Дима', last_name:'Стартап', username:'dima', bio:'Канал про стартапы', bio_extra:'', avatar:'', badge:'gold', online:1, last_seen:Date.now(), premium:true, premium_until:Date.now()+30*864e5, stars:800, business:{enabled:false,hours:'',address:'',welcome:'',quick_replies:[]}, privacy:{phone:'contacts',last_seen:'all',avatar:'all',bio:'all',gifts:'all',calls:'all',messages:'all',add_to_groups:'all',forward_link:'all',close_friends:[]}, emoji_status:'', limits:null},
    {id:'u4', phone:'+79990000004', first_name:'Tele', last_name:'Поддержка', username:'support', bio:'Официальная поддержка Tele', bio_extra:'', avatar:'', badge:'green', online:1, last_seen:Date.now(), premium:false, premium_until:null, stars:9999, business:{enabled:true,hours:'24/7',address:'',welcome:'',quick_replies:[]}, privacy:{phone:'nobody',last_seen:'nobody',avatar:'all',bio:'all',gifts:'all',calls:'all',messages:'all',add_to_groups:'all',forward_link:'all',close_friends:[]}, emoji_status:'', limits:null},
    {id:'u5', phone:'+79990000005', first_name:'Анна', last_name:'', username:'anna', bio:'', bio_extra:'', avatar:'', badge:'', online:1, last_seen:Date.now(), premium:false, premium_until:null, stars:500, business:{enabled:false,hours:'',address:'',welcome:'',quick_replies:[]}, privacy:{phone:'nobody',last_seen:'contacts',avatar:'all',bio:'all',gifts:'all',calls:'all',messages:'all',add_to_groups:'all',forward_link:'all',close_friends:[]}, emoji_status:'', limits:null},
    {id:'u6', phone:'+79990000006', first_name:'Иван', last_name:'Петров', username:'ivan', bio:'', bio_extra:'', avatar:'', badge:'blue', online:1, last_seen:Date.now(), premium:false, premium_until:null, stars:300, business:{enabled:false,hours:'',address:'',welcome:'',quick_replies:[]}, privacy:{phone:'nobody',last_seen:'contacts',avatar:'all',bio:'all',gifts:'all',calls:'all',messages:'all',add_to_groups:'all',forward_link:'all',close_friends:[]}, emoji_status:'', limits:null},
  ];
  db.chats=[
    {id:'c1', type:'private', title:'', username:'', avatar:'', description:'', owner_id:'u1', created:Date.now(), members:[{user_id:'u1',role:'member'},{user_id:'u2',role:'member'}], pinned_msg:null, is_public:false, invite_link:'', history_visible:true, permissions:{send_text:true,send_media:true,send_stickers:true,send_gifs:true,send_links:true,embed:true}, admin_rights:{}, slow_mode:0, auto_delete:0, is_secret:false, secret_ttl:0},
    {id:'c2', type:'group', title:'Дизайн-чат', username:'designchat', avatar:'', description:'Обсуждаем UI', owner_id:'u1', created:Date.now(), members:[{user_id:'u1',role:'admin'},{user_id:'u2',role:'member'},{user_id:'u3',role:'member'},{user_id:'u6',role:'member'}], pinned_msg:null, is_public:true, invite_link:'t.me/designchat', history_visible:true, permissions:{send_text:true,send_media:true,send_stickers:true,send_gifs:true,send_links:true,embed:true}, admin_rights:{}, slow_mode:0, auto_delete:0, is_secret:false, secret_ttl:0},
    {id:'c3', type:'channel', title:'Новости Tele', username:'telenews', avatar:'', description:'Официальный канал Tele', owner_id:'u4', created:Date.now(), members:[{user_id:'u1',role:'member'},{user_id:'u2',role:'member'},{user_id:'u3',role:'member'},{user_id:'u4',role:'admin'},{user_id:'u6',role:'member'}], pinned_msg:null, is_public:true, invite_link:'t.me/telenews', history_visible:true, permissions:{send_text:true,send_media:true,send_stickers:true,send_gifs:true,send_links:true,embed:true}, admin_rights:{}, slow_mode:0, auto_delete:0, is_secret:false, secret_ttl:0},
    {id:'c4', type:'private', title:'', username:'', avatar:'', description:'', owner_id:'u1', created:Date.now(), members:[{user_id:'u1',role:'member'},{user_id:'u4',role:'member'}], pinned_msg:null, is_public:false, invite_link:'', history_visible:true, permissions:{send_text:true,send_media:true,send_stickers:true,send_gifs:true,send_links:true,embed:true}, admin_rights:{}, slow_mode:0, auto_delete:0, is_secret:false, secret_ttl:0},
  ];
  db.messages=[
    {id:'m1', chat_id:'c1', sender_id:'u2', type:'text', content:'Привет! Как тебе новый Tele?', caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, poll:null, rich:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now()-1000000, views:0, ttl:null},
    {id:'m2', chat_id:'c1', sender_id:'u1', type:'text', content:'Очень круто 😍 Прям как в оригинале', caption:'', reply_to:'m1', forwarded_from:null, forwarded_name:'', gift_id:null, poll:null, rich:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now()-900000, views:0, ttl:null},
    {id:'m3', chat_id:'c2', sender_id:'u3', type:'text', content:'Ребята, зацените концепт', caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, poll:null, rich:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now()-800000, views:0, ttl:null},
    {id:'m4', chat_id:'c3', sender_id:'u4', type:'text', content:'Добро пожаловать в Tele! Подписывайтесь на обновления.', caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, poll:null, rich:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:1, edited:0, created:Date.now()-700000, views:1234, ttl:null},
  ];
  db.gifts=[
    {id:'g1', name:'Сердце', emoji:'💖', price:500, color:'#ff3b5c', animation:'pulse', collectible:false},
    {id:'g2', name:'Роза', emoji:'🌹', price:250, color:'#e11d48', animation:'rotate', collectible:false},
    {id:'g3', name:'Кубок', emoji:'🏆', price:1000, color:'#eab308', animation:'bounce', collectible:true},
    {id:'g4', name:'Ракета', emoji:'🚀', price:750, color:'#6366f1', animation:'fly', collectible:false},
    {id:'g5', name:'Огонь', emoji:'🔥', price:300, color:'#f97316', animation:'flicker', collectible:false},
    {id:'g6', name:'Алмаз', emoji:'💎', price:2000, color:'#06b6d4', animation:'shine', collectible:true},
    {id:'g7', name:'Клоун', emoji:'🤡', price:150, color:'#a855f7', animation:'wobble', collectible:false},
    {id:'g8', name:'Торт', emoji:'🎂', price:400, color:'#ec4899', animation:'pop', collectible:false},
    {id:'g9', name:'Медведь', emoji:'🧸', price:600, color:'#f59e0b', animation:'hug', collectible:false},
    {id:'g10', name:'Звезда', emoji:'⭐', price:350, color:'#facc15', animation:'twinkle', collectible:true},
    {id:'g11', name:'Подарок', emoji:'🎁', price:200, color:'#22c55e', animation:'box', collectible:false},
    {id:'g12', name:'Кольцо', emoji:'💍', price:1500, color:'#e879f9', animation:'sparkle', collectible:true},
  ];
  db.communities=[
    {id:'com1', name:'Tele Ecosystem', username:'tele_eco', description:'Каналы + группы + боты Tele в одном месте', owner_id:'u4', chat_ids:['c2','c3'], bot_ids:[], hidden_chat_ids:[], member_ids:['u1','u2','u3','u4','u6'], created:Date.now()}
  ];
  db.bots=[
    {id:'b1', username:'gpt_helper', name:'GPT Helper', description:'AI-бот отвечает в любом чате через @gpt_helper', type:'ai', inline:true, ai:true, streaming:true, owner_id:'u4', avatar:''},
    {id:'b2', username:'weather_bot', name:'Погода', description:'Прогноз погоды', type:'content', inline:true, ai:false, streaming:false, owner_id:'u4', avatar:''},
    {id:'b3', username:'pay_bot', name:'Платежи', description:'Приём донатов через Stars', type:'payment', inline:false, ai:false, streaming:false, owner_id:'u4', avatar:''},
    {id:'b4', username:'reminder_bot', name:'Напоминания', description:'Таймеры и уведомления', type:'reminder', inline:false, ai:false, streaming:false, owner_id:'u4', avatar:''},
  ];
  db.stories=[
    {id:'s1', user_id:'u2', media:'/uploads/story_demo.jpg', caption:'Новый дизайн 🎨', created:Date.now()-3600000, expires:Date.now()+23*3600000, views:124, incognito:false},
  ];
  saveDB();
}
loadDB(); seed();
// seed missing collections if DB existed before
if(!db.communities.length){
  db.communities=[
    {id:'com1', name:'Tele Ecosystem', username:'tele_eco', description:'Каналы + группы + боты Tele в одном месте', owner_id:'u4', chat_ids:['c2','c3'], bot_ids:['b1'], hidden_chat_ids:[], member_ids:['u1','u2','u3','u4','u6'], created:Date.now()}
  ];
}
if(!db.bots.length){
  db.bots=[
    {id:'b1', username:'gpt_helper', name:'GPT Helper', description:'AI-бот отвечает в любом чате через @gpt_helper', type:'ai', inline:true, ai:true, streaming:true, owner_id:'u4', avatar:''},
    {id:'b2', username:'weather_bot', name:'Погода', description:'Прогноз погоды', type:'content', inline:true, ai:false, streaming:false, owner_id:'u4', avatar:''},
    {id:'b3', username:'pay_bot', name:'Платежи', description:'Приём донатов через Stars', type:'payment', inline:false, ai:false, streaming:false, owner_id:'u4', avatar:''},
    {id:'b4', username:'reminder_bot', name:'Напоминания', description:'Таймеры', type:'reminder', inline:false, ai:false, streaming:false, owner_id:'u4', avatar:''},
  ];
}
if(!db.stories.length){
  db.stories=[
    {id:'s1', user_id:'u2', media:'', caption:'Новый дизайн 🎨', created:Date.now()-3600000, expires:Date.now()+23*3600000, views:124, incognito:false},
  ];
}
if(!db.users[0].stars){
  for(const u of db.users){ if(u.stars===undefined) u.stars=500; }
}
saveDB();


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

// AUTH
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
    user={id, phone, first_name: first_name||'Новый', last_name: last_name||'пользователь', username:uname, bio:'', bio_extra:'', avatar:'', badge:'', online:1, last_seen:Date.now(), premium:false, premium_until:null, stars:500, business:{enabled:false,hours:'',address:'',welcome:'',quick_replies:[]}, privacy:{phone:'nobody',last_seen:'contacts',avatar:'all',bio:'all',gifts:'all',calls:'all',messages:'all',add_to_groups:'all',forward_link:'all',close_friends:[]}, emoji_status:'', limits:null};
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
  const {first_name,last_name,username,bio,bio_extra,avatar,badge,emoji_status}=req.body;
  if(username && username!==u.username && db.users.some(x=>x.username===username && x.id!==u.id)) return res.status(400).json({error:'username taken'});
  if(first_name!==undefined) u.first_name=first_name;
  if(last_name!==undefined) u.last_name=last_name;
  if(username!==undefined) u.username=username;
  if(bio!==undefined) u.bio=bio;
  if(bio_extra!==undefined) u.bio_extra=bio_extra;
  if(avatar!==undefined) u.avatar=avatar;
  if(badge!==undefined) u.badge=badge;
  if(emoji_status!==undefined) u.emoji_status=emoji_status;
  saveDB(); res.json(u);
});
app.get('/api/users/search', auth, (req,res)=>{
  const q=(req.query.q||'').toLowerCase();
  if(!q) return res.json([]);
  res.json(db.users.filter(u=> u.username.toLowerCase().includes(q) || u.first_name.toLowerCase().includes(q) || u.phone.includes(q)).slice(0,20));
});
app.get('/api/gifts', (req,res)=> res.json(db.gifts));

// PREMIUM
app.post('/api/premium/toggle', auth, (req,res)=>{
  const u=getUser(req.userId);
  u.premium=!u.premium;
  u.premium_until = u.premium ? Date.now()+30*864e5 : null;
  if(u.premium){ u.stars+=500; db.stars_tx.push({id:genId(), user_id:u.id, type:'premium_bonus', amount:500, created:Date.now()}); }
  saveDB(); res.json(u);
});
app.get('/api/limits', auth, (req,res)=>{
  const u=getUser(req.userId);
  const isPrem=u.premium;
  res.json({
    premium:isPrem,
    channels: isPrem?1000:500,
    folders: isPrem?20:10,
    pinned: isPrem?10:5,
    accounts: isPrem?4:1,
    file_size: isPrem? 4*1024*1024*1024 : 2*1024*1024*1024,
    bio_len: isPrem?140:70,
    reactions: isPrem?3:1,
    stars: u.stars
  });
});

// STARS
app.post('/api/stars/topup', auth, (req,res)=>{
  const u=getUser(req.userId);
  const amount=parseInt(req.body.amount)||100;
  u.stars+=amount; db.stars_tx.push({id:genId(), user_id:u.id, type:'topup', amount, created:Date.now()}); saveDB(); res.json({stars:u.stars});
});
app.post('/api/stars/send', auth, (req,res)=>{
  const {to_user_id, amount}=req.body;
  const from=getUser(req.userId); const to=getUser(to_user_id);
  if(!to) return res.status(404).json({error:'user not found'});
  if(from.stars < amount) return res.status(400).json({error:'недостаточно Stars'});
  from.stars-=amount; to.stars+=amount; db.stars_tx.push({id:genId(), user_id:from.id, to:to.id, type:'donate', amount, created:Date.now()}); saveDB(); res.json({ok:true});
});

// PRIVACY
app.get('/api/privacy', auth, (req,res)=> res.json(getUser(req.userId).privacy));
app.put('/api/privacy', auth, (req,res)=>{
  const u=getUser(req.userId); u.privacy={...u.privacy, ...req.body}; saveDB(); res.json(u.privacy);
});

// BUSINESS
app.get('/api/business', auth, (req,res)=> res.json(getUser(req.userId).business));
app.put('/api/business', auth, (req,res)=>{
  const u=getUser(req.userId); u.business={...u.business, ...req.body}; saveDB(); res.json(u.business);
});

// COMMUNITIES
app.get('/api/communities', auth, (req,res)=> res.json(db.communities));
app.post('/api/communities', auth, (req,res)=>{
  const {name, username, description, chat_ids, bot_ids}=req.body;
  const com={id:genId(), name:name||'Community', username:username||'', description:description||'', owner_id:req.userId, chat_ids:chat_ids||[], bot_ids:bot_ids||[], hidden_chat_ids:[], member_ids:[req.userId], created:Date.now()};
  db.communities.push(com); saveDB(); res.json(com);
});
app.get('/api/communities/:id', auth, (req,res)=>{
  const com=db.communities.find(c=>c.id===req.params.id);
  if(!com) return res.status(404).json({error:'not found'});
  const chats=com.chat_ids.map(id=> db.chats.find(c=>c.id===id)).filter(Boolean);
  const bots=com.bot_ids.map(id=> db.bots.find(b=>b.id===id)).filter(Boolean);
  res.json({...com, chats, bots});
});

// BOTS
app.get('/api/bots', (req,res)=> res.json(db.bots));
app.post('/api/bots', auth, (req,res)=>{
  const {username,name,description,type}=req.body;
  const bot={id:genId(), username:username||'mybot', name:name||'Бот', description:description||'', type:type||'chat', inline:true, ai:false, streaming:false, owner_id:req.userId, avatar:''};
  db.bots.push(bot); saveDB(); res.json(bot);
});
app.post('/api/bots/:id/invoke', auth, (req,res)=>{
  const bot=db.bots.find(b=>b.id===req.params.id);
  if(!bot) return res.status(404).json({error:'not found'});
  const {text, chat_id}=req.body;
  // simulate streaming reply
  const replyText = bot.ai ? `🤖 ${bot.name}: понял "${text||'привет'}" — отвечаю как AI (стриминг...)` : `Бот ${bot.name} отвечает: ${text}`;
  // create message as bot
  if(chat_id){
    const mid=genId();
    db.messages.push({id:mid, chat_id, sender_id: bot.id, type:'text', content:replyText, caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, poll:null, rich:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now(), views:0, ttl:null, is_bot:true});
    saveDB();
    io.to(chat_id).emit('new_message', {...db.messages.find(m=>m.id===mid), sender:{first_name:bot.name, last_name:'', username:bot.username, avatar:''}, reactions:[]});
  }
  res.json({reply:replyText, bot});
});

// STORIES
app.get('/api/stories', auth, (req,res)=>{
  const now=Date.now();
  // expire
  db.stories=db.stories.filter(s=> s.expires>now);
  res.json(db.stories);
});
app.post('/api/stories', auth, upload.single('file'), (req,res)=>{
  const {caption, incognito}=req.body;
  let media='/uploads/story_demo.jpg';
  if(req.file) media='/uploads/'+path.basename(req.file.path);
  const story={id:genId(), user_id:req.userId, media, caption:caption||'', created:Date.now(), expires:Date.now()+24*3600000, views:0, incognito: incognito==='true'};
  db.stories.push(story); saveDB(); res.json(story);
});
app.post('/api/stories/:id/view', auth, (req,res)=>{
  const s=db.stories.find(x=>x.id===req.params.id);
  if(s) s.views++; saveDB(); res.json({views:s.views});
});

// CHATS
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
  const {type,title,username,avatar,description,members, is_public, is_secret, secret_ttl}=req.body;
  if(!type) return res.status(400).json({error:'type'});
  const id=genId();
  const chat={id,type,title:title||'', username:username||'', avatar:avatar||'', description:description||'', owner_id:req.userId, created:Date.now(), members:[{user_id:req.userId, role:'admin'}], pinned_msg:null, is_public: is_public||!!username, invite_link: username? `t.me/${username}` : `t.me/join/${id}`, history_visible: req.body.history_visible!==false, permissions:{send_text:true,send_media:true,send_stickers:true,send_gifs:true,send_links:true,embed:true}, admin_rights:{}, slow_mode:0, auto_delete:0, is_secret: !!is_secret, secret_ttl: secret_ttl||0};
  if(members && Array.isArray(members)) for(const uid of members) if(!chat.members.some(m=>m.user_id===uid)) chat.members.push({user_id:uid, role:'member'});
  // auto add to community if specified
  db.chats.push(chat);
  db.messages.push({id:genId(), chat_id:id, sender_id:req.userId, type:'system', content: type==='channel'?`Канал "${title}" создан`:`Чат "${title||'приват'}" создан`, caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, poll:null, rich:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now(), views:0, ttl:null});
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
  const {title,username,avatar,description,is_public,permissions,admin_rights,slow_mode,auto_delete,history_visible}=req.body;
  if(title!==undefined) c.title=title;
  if(username!==undefined) c.username=username;
  if(avatar!==undefined) c.avatar=avatar;
  if(description!==undefined) c.description=description;
  if(is_public!==undefined) c.is_public=is_public;
  if(history_visible!==undefined) c.history_visible=history_visible;
  if(permissions) c.permissions={...c.permissions, ...permissions};
  if(admin_rights) c.admin_rights={...c.admin_rights, ...admin_rights};
  if(slow_mode!==undefined) c.slow_mode=slow_mode;
  if(auto_delete!==undefined) c.auto_delete=auto_delete;
  saveDB(); res.json(c);
});
app.post('/api/chats/:id/members', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  if(!c) return res.status(404).json({error:'not found'});
  // check permission add?
  const {user_id}=req.body;
  if(!c.members.some(m=>m.user_id===user_id)) c.members.push({user_id, role:'member'});
  db.messages.push({id:genId(), chat_id:c.id, sender_id:user_id, type:'system', content:'Пользователь добавлен', caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, poll:null, rich:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now(), views:0, ttl:null});
  saveDB(); res.json({ok:true});
});
app.delete('/api/chats/:id/members/:uid', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  if(!c) return res.status(404).json({error:'not found'});
  c.members=c.members.filter(m=>m.user_id!==req.params.uid);
  saveDB(); res.json({ok:true});
});
app.post('/api/chats/:id/invite', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  c.invite_link=`https://t.me/join/${genId()}`;
  saveDB(); res.json({invite:c.invite_link});
});
app.post('/api/chats/:id/pin', auth, (req,res)=>{
  const c=db.chats.find(x=>x.id===req.params.id);
  c.pinned_msg=req.body.message_id||null;
  if(req.body.message_id){ const m=db.messages.find(x=>x.id===req.body.message_id); if(m) m.pinned=1; }
  saveDB(); res.json({ok:true});
});

// MESSAGES ext
app.get('/api/chats/:id/messages', auth, (req,res)=>{
  let msgs=db.messages.filter(m=>m.chat_id===req.params.id);
  // filter auto-delete? secret ttl
  msgs=msgs.filter(m=> !m.ttl || Date.now()-m.created < m.ttl*1000);
  msgs.sort((a,b)=>a.created-b.created);
  // search
  if(req.query.q){
    const q=req.query.q.toLowerCase();
    msgs=msgs.filter(m=> (m.content&&m.content.toLowerCase().includes(q)) || (m.caption&&m.caption.toLowerCase().includes(q)));
  }
  if(req.query.from){
    msgs=msgs.filter(m=> m.sender_id===req.query.from);
  }
  const out=msgs.map(m=>{
    const reacts=db.reactions.filter(r=>r.message_id===m.id);
    const grouped={};
    for(const r of reacts){ if(!grouped[r.emoji]) grouped[r.emoji]=[]; grouped[r.emoji].push(r.user_id); }
    const reactions=Object.entries(grouped).map(([emoji,by])=>({emoji, count:by.length, by, mine:by.includes(req.userId)}));
    let sender=getUser(m.sender_id);
    if(!sender){ // bot?
      const bot=db.bots.find(b=>b.id===m.sender_id);
      if(bot) sender={id:bot.id, first_name:bot.name, last_name:'', username:bot.username, avatar:bot.avatar, badge:'bot', premium:false};
    }
    return {...m, reactions, sender};
  });
  res.json(out);
});
app.post('/api/chats/:id/messages', auth, upload.single('file'), (req,res)=>{
  const chat=db.chats.find(c=>c.id===req.params.id);
  if(!chat) return res.status(404).json({error:'not found'});
  if(chat.type==='channel'){
    const mem=chat.members.find(m=>m.user_id===req.userId);
    if(!mem || (mem.role!=='admin' && chat.owner_id!==req.userId)) return res.status(403).json({error:'only admins can post in channel'});
  }
  // permission check
  const meMem=chat.members.find(m=>m.user_id===req.userId);
  if(meMem && meMem.role!=='admin' && chat.owner_id!==req.userId){
    if(req.body.type==='text' && !chat.permissions.send_text) return res.status(403).json({error:'text forbidden'});
    if(['photo','file','voice','video_note'].includes(req.body.type) && !chat.permissions.send_media) return res.status(403).json({error:'media forbidden'});
  }
  const {type, content, caption, reply_to, forwarded_from, gift_id, location_lat, location_lon, duration, waveform, poll_question, poll_options, rich, ttl}=req.body;
  let fileContent=content||'';
  let file_name=null, file_size=null, mime=null;
  if(req.file){ fileContent='/uploads/'+path.basename(req.file.path); file_name=req.file.originalname; file_size=req.file.size; mime=req.file.mimetype; 
    // file size limit
    const u=getUser(req.userId);
    const max = u.premium? 4*1024*1024*1024 : 2*1024*1024*1024;
    if(file_size>max) return res.status(400).json({error:`файл превышает лимит ${max/1024/1024/1024} ГБ. Нужен Premium`});
  }
  // check text length
  if(type==='text' && content && content.length>32768) return res.status(400).json({error:'сообщение до 32768 символов'});
  // handle inline bot mention
  let finalContent=fileContent;
  let is_bot_reply=false;
  if(finalContent && finalContent.includes('@')){
    const botMatch=finalContent.match(/@(\w+)/);
    if(botMatch){
      const bot=db.bots.find(b=>b.username===botMatch[1]);
      if(bot){
        // will trigger bot reply async
        setTimeout(()=>{
          const botMsg={id:genId(), chat_id:req.params.id, sender_id:bot.id, type:'text', content:`🤖 ${bot.name} отвечает: получил "${finalContent}"`, caption:'', reply_to:null, forwarded_from:null, forwarded_name:'', gift_id:null, poll:null, rich:null, location_lat:null, location_lon:null, file_name:null, file_size:null, mime:null, duration:null, waveform:null, pinned:0, edited:0, created:Date.now()+500, views:0, ttl:null, is_bot:true, streaming: bot.streaming};
          db.messages.push(botMsg); saveDB(); io.to(chat.id).emit('new_message', {...botMsg, sender:{first_name:bot.name, last_name:'', username:bot.username, avatar:'', badge:'bot'}, reactions:[]});
        }, bot.streaming? 800:1200);
      }
    }
  }
  // deduct stars for gift
  if(gift_id){
    const gift=db.gifts.find(g=>g.id===gift_id);
    const u=getUser(req.userId);
    if(gift && u.stars < gift.price) return res.status(400).json({error:'недостаточно Stars'});
    if(gift) { u.stars-=gift.price; db.stars_tx.push({id:genId(), user_id:u.id, type:'gift', amount:gift.price, created:Date.now()}); }
  }
  const id=genId();
  let pollObj=null;
  if(poll_question){
    pollObj={question:poll_question, options: JSON.parse(poll_options||'[]'), votes: {}, total:0};
  }
  const autoTtl = ttl? parseInt(ttl) : (chat.auto_delete||0);
  const msg={id, chat_id:req.params.id, sender_id:req.userId, type:type||'text', content:finalContent, caption:caption||'', reply_to:reply_to||null, forwarded_from:forwarded_from||null, forwarded_name: forwarded_from? (getUser(forwarded_from)?.first_name||''):'', gift_id:gift_id||null, poll:pollObj, rich: rich? JSON.parse(rich):null, location_lat: location_lat? parseFloat(location_lat):null, location_lon: location_lon? parseFloat(location_lon):null, file_name, file_size, mime, duration: duration? parseInt(duration):null, waveform: waveform||null, pinned:0, edited:0, created:Date.now(), views: chat.type==='channel'? Math.floor(Math.random()*900+100):0, ttl: autoTtl||null};
  db.messages.push(msg);
  saveDB();
  let sender=getUser(req.userId);
  const enriched={...msg, sender, reactions:[]};
  io.to(chat.id).emit('new_message', enriched);
  res.json(enriched);
});
app.post('/api/messages/:id/vote', auth, (req,res)=>{
  const m=db.messages.find(x=>x.id===req.params.id);
  if(!m || !m.poll) return res.status(404).json({error:'no poll'});
  const idx=parseInt(req.body.option);
  if(!m.poll.votes) m.poll.votes={};
  m.poll.votes[req.userId]=idx;
  saveDB();
  io.to(m.chat_id).emit('update_message', m);
  res.json(m.poll);
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
  const u=getUser(req.userId);
  const maxReact = u.premium? 3 : 1;
  const myReacts=db.reactions.filter(r=> r.user_id===req.userId && r.message_id===m.id);
  if(myReacts.length>=maxReact && !myReacts.some(r=>r.emoji===req.body.emoji)) return res.status(400).json({error:`лимит реакций ${maxReact}. Нужен Premium для 3 реакций`});
  const {emoji}=req.body;
  const ex=db.reactions.find(r=>r.message_id===m.id && r.user_id===req.userId && r.emoji===emoji);
  if(ex){
    db.reactions=db.reactions.filter(r=> !(r.message_id===m.id && r.user_id===req.userId && r.emoji===emoji));
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

// FRAGMENT usernames marketplace
app.get('/api/fragment/usernames', (req,res)=>{
  const list=[{username:'crypto', price:5000},{username:'bank', price:12000},{username:'alex', price:700},{username:'maria', price:800},{username:'tele', price:2000}];
  res.json(list);
});
app.post('/api/fragment/buy', auth, (req,res)=>{
  const {username}=req.body;
  const u=getUser(req.userId);
  if(u.stars<1000) return res.status(400).json({error:'нужны Stars'});
  u.stars-=1000; u.username=username; saveDB(); res.json(u);
});

io.on('connection', socket=>{
  socket.on('join', id=> socket.join(id));
  socket.on('typing', ({chatId, userId, isTyping})=> socket.to(chatId).emit('typing', {chatId, userId, isTyping}));
  socket.on('bot_stream', ({chatId, botId, chunk})=> io.to(chatId).emit('bot_stream', {botId, chunk}));
});

const PORT=process.env.PORT||8000;
httpServer.listen(PORT,'0.0.0.0',()=> console.log(`Tele on ${PORT}`));
