// Image compression, zip bundle for GitHub, and import of the published site (admin only)
const shrink=(f,max=1600)=>!f.type.startsWith('image/')?Promise.resolve(f):new Promise(ok=>{const i=new Image();i.onload=()=>{const k=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(i,0,0,c.width,c.height);c.toBlob(b=>ok(b&&b.size<f.size?b:f),'image/jpeg',.82)};i.onerror=()=>ok(f);i.src=URL.createObjectURL(f)});
const fb=i=>i.files[0]?shrink(i.files[0]):null;
function crc(u){const t=crc.t||(crc.t=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0}));let x=-1;for(const b of u)x=t[(x^b)&255]^(x>>>8);return(x^-1)>>>0}
async function zip(files){const parts=[],cd=[],e=new TextEncoder();let off=0,cs=0;
for(const f of files){const d=new Uint8Array(await f.blob.arrayBuffer()),n=e.encode(f.name),c=crc(d),L=new DataView(new ArrayBuffer(30));
L.setUint32(0,0x04034b50,true);L.setUint16(4,20,true);L.setUint32(14,c,true);L.setUint32(18,d.length,true);L.setUint32(22,d.length,true);L.setUint16(26,n.length,true);parts.push(L.buffer,n,d);
const C=new DataView(new ArrayBuffer(46));C.setUint32(0,0x02014b50,true);C.setUint16(4,20,true);C.setUint16(6,20,true);C.setUint32(16,c,true);C.setUint32(20,d.length,true);C.setUint32(24,d.length,true);C.setUint16(28,n.length,true);C.setUint32(42,off,true);
cd.push(C.buffer,n);cs+=46+n.length;off+=30+n.length+d.length}
const E=new DataView(new ArrayBuffer(22));E.setUint32(0,0x06054b50,true);E.setUint16(8,files.length,true);E.setUint16(10,files.length,true);E.setUint32(12,cs,true);E.setUint32(16,off,true);
return new Blob([...parts,...cd,E.buffer],{type:'application/zip'})}
async function collect(){const recs={},blobs=[];for(const k of STORES)recs[k]=await DB.all(k);
JSON.stringify(recs,(k,v)=>{if(v instanceof Blob&&!blobs.includes(v))blobs.push(v);return v});
const map=new Map(),media=[];
for(const b of blobs){const d=await crypto.subtle.digest('SHA-256',await b.arrayBuffer()),id=[...new Uint8Array(d)].slice(0,8).map(x=>x.toString(16).padStart(2,'0')).join(''),
e={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf','image/webp':'webp'}[b.type]||'bin',p='content/media/'+id+'.'+e;map.set(b,p);if(!media.some(m=>m.name===p))media.push({name:p,blob:b})}
return{json:JSON.stringify(recs,(k,v)=>v instanceof Blob?map.get(v):v),media}}
async function buildZip(){const{json,media}=await collect();return{blob:await zip([{name:'content/data.json',blob:new Blob([json])},...media]),count:media.length}}
async function gh(t,path,opt={}){const r=await fetch('https://api.github.com'+path,{...opt,headers:{Authorization:'Bearer '+t,Accept:'application/vnd.github+json','Content-Type':'application/json'}});
if(!r.ok)throw new Error(r.status+' '+(await r.text()).slice(0,140));return r.json()}
const b64=b=>new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(f.result.split(',')[1]);f.readAsDataURL(b)});
async function ghPublish(repo,t,say){say('Preparing…');const{json,media}=await collect(),R='/repos/'+repo;
const br=(await gh(t,R)).default_branch,ref=await gh(t,R+'/git/ref/heads/'+br),base=(await gh(t,R+'/git/commits/'+ref.object.sha)).tree.sha;
const old=(await gh(t,R+'/git/trees/'+base+'?recursive=1')).tree.filter(x=>x.type==='blob'&&x.path.startsWith('content/')).map(x=>x.path),keep=new Set(['content/data.json',...media.map(m=>m.name)]),tree=[];
const up=async(path,blob)=>{const s=await gh(t,R+'/git/blobs',{method:'POST',body:JSON.stringify({content:await b64(blob),encoding:'base64'})});tree.push({path,mode:'100644',type:'blob',sha:s.sha})};
await up('content/data.json',new Blob([json]));const fresh=media.filter(m=>!old.includes(m.name));let i=0;
for(const m of fresh){say('Uploading file '+(++i)+' of '+fresh.length+'…');await up(m.name,m.blob)}
old.filter(p=>!keep.has(p)).forEach(p=>tree.push({path:p,mode:'100644',type:'blob',sha:null}));say('Saving…');
const nt=await gh(t,R+'/git/trees',{method:'POST',body:JSON.stringify({base_tree:base,tree})}),c=await gh(t,R+'/git/commits',{method:'POST',body:JSON.stringify({message:'Update content',tree:nt.sha,parents:[ref.object.sha]})});
await gh(t,R+'/git/refs/heads/'+br,{method:'PATCH',body:JSON.stringify({sha:c.sha})});localStorage.removeItem('dirty')}
async function importSite(){const d=await(await fetch('content/data.json',{cache:'no-store'})).json(),cache={};
const get=async p=>cache[p]||(cache[p]=await(await fetch(p)).blob());
const fix=async v=>{if(typeof v==='string'&&v.startsWith('content/media/'))return get(v);if(Array.isArray(v))return Promise.all(v.map(fix));if(v&&typeof v==='object')for(const k in v)v[k]=await fix(v[k]);return v};
for(const s of STORES)for(const r of d[s]||[])await DB.put(s,await fix(r));localStorage.removeItem('dirty')}
const guess=()=>{const o=location.hostname.endsWith('.github.io')?location.hostname.split('.')[0]:'',r=location.pathname.split('/')[1];return o&&r&&!r.includes('.')?o+'/'+r:''};
async function publishTab(){const box=h('div'),st=h('p',{class:'muted'}),cfg=JSON.parse(localStorage.ghcfg||'{}'),
repo=h('input',{placeholder:'owner/repository',value:cfg.repo||guess()}),tok=h('input',{type:'password',placeholder:'GitHub token',value:cfg.tok||'',autocomplete:'off'});
box.append(h('div',{class:'card'},h('h3',{},'Publish to students'),h('p',{class:'muted'},'One tap uploads everything to GitHub. Students see it after about a minute and a refresh.'),repo,tok,
h('button',{onclick:async()=>{localStorage.ghcfg=JSON.stringify({repo:repo.value.trim(),tok:tok.value.trim()});try{await ghPublish(repo.value.trim(),tok.value.trim(),m=>st.textContent=m);st.textContent='Published. Students will see it shortly.'}catch(e){st.textContent='Failed: '+e.message}}},'Publish now'),st,
h('details',{},h('summary',{},'How to get the token (one time)'),h('ol',{},h('li',{},'GitHub → your photo → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.'),h('li',{},'Repository access: Only select repositories → choose this repo.'),h('li',{},'Permissions → Repository permissions → Contents: Read and write.'),h('li',{},'Generate, copy the token, paste it above. It stays in this browser only.')))));
box.append(h('div',{class:'card'},h('h3',{},'Other options'),h('button',{class:'alt',onclick:async()=>{const r=await buildZip(),a=h('a',{href:URL.createObjectURL(r.blob),download:'content.zip'});document.body.append(a);a.click();a.remove()}},'Download content.zip'),' ',
h('button',{class:'alt',onclick:async()=>{try{await importSite();alert('Loaded from the published site.');adminView()}catch(e){alert('Nothing published yet.')}}},'Load from published site')));return box}
async function students(){const us=await DB.all('users'),box=h('div'),n=h('input',{placeholder:'Full name'}),u=h('input',{placeholder:'Username'}),p=h('input',{placeholder:'Password (6+ characters)'}),cd=h('textarea',{rows:2,placeholder:'Paste a student sign-up code here'});
box.append(h('div',{class:'card'},h('h3',{},'Add student'),n,u,p,h('button',{onclick:async()=>{const un=u.value.trim().toLowerCase();if(un.length<3||p.value.length<6||un==='abhi sir'||us.some(x=>x.username===un))return alert('Username must be 3+ characters and unique; password 6+ characters.');await DB.put('users',{name:n.value.trim()||un,username:un,hash:await hashCred(un,p.value)});adminView()}},'Add student')),
h('div',{class:'card'},h('h3',{},'Approve a sign-up'),cd,h('button',{onclick:async()=>{try{const r=JSON.parse(decodeURIComponent(escape(atob(cd.value.trim()))));if(!r.username||!r.hash)throw 0;await DB.put('users',r);adminView()}catch(e){alert('That code is not valid.')}}},'Approve')),
h('p',{class:'muted'},'After adding or approving students, press Publish so they can log in from any device.'));
us.forEach(x=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},x.name+' ('+x.username+')'),
h('button',{onclick:async()=>{const q=prompt('New password for '+x.username+' (6+ characters)');if(q&&q.length>=6){x.hash=await hashCred(x.username,q);await DB.put('users',x);alert('Reset. Publish to apply.')}}},'Reset password'),
h('button',{class:'del',onclick:()=>ask('Remove student?',()=>DB.del('users',x.id))},'Remove'))));return box}
