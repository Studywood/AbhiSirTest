// Credentials are never stored in plain text. Admin = salted PBKDF2 hash only.
const SALT=new TextEncoder().encode('abhi-coaching-v1-9f2c');
const ADMIN_HASH='a2de1811af8faf963027848fb9d75cf9397ccfb013d3057d981d0acd0555fded';
async function hashCred(u,p){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(u.trim().toLowerCase()+':'+p),'PBKDF2',false,['deriveBits']);
const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:SALT,iterations:150000,hash:'SHA-256'},k,256);
return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const Session={get:()=>JSON.parse(sessionStorage.getItem('sess')||'null'),set:s=>sessionStorage.setItem('sess',JSON.stringify(s)),clear:()=>sessionStorage.removeItem('sess')};
const allUsers=async()=>[...await PUB.all('users'),...await DB.all('users')];
async function login(u,p){const h=await hashCred(u,p),n=u.trim().toLowerCase();
if(h===ADMIN_HASH){Session.set({role:'admin',name:'Abhi Sir'});return true}
const m=(await allUsers()).find(x=>x.username===n&&x.hash===h);
if(m){Session.set({role:'student',id:m.id||m.username,name:m.name});return true}return false}
async function signup(name,u,p){u=u.trim().toLowerCase();if(u.length<3||p.length<6)return{err:'Username needs 3+ and password 6+ characters.'};
if(u==='abhi sir'||(await allUsers()).some(x=>x.username===u))return{err:'That username is taken.'};
const r=await DB.put('users',{name:name.trim()||u,username:u,hash:await hashCred(u,p)});return{code:btoa(unescape(encodeURIComponent(JSON.stringify(r))))}}
