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
async function buildZip(){const media=[],data={};let n=0;
const reg=b=>{const e={'image/jpeg':'jpg','image/png':'png','application/pdf':'pdf','image/webp':'webp'}[b.type]||'bin',p='content/media/'+(++n)+'.'+e;media.push({name:p,blob:b});return p};
for(const s of STORES)data[s]=JSON.parse(JSON.stringify(await DB.all(s),(k,v)=>v instanceof Blob?reg(v):v));
return{blob:await zip([{name:'content/data.json',blob:new Blob([JSON.stringify(data)])},...media]),count:media.length}}
async function importSite(){const d=await(await fetch('content/data.json',{cache:'no-store'})).json(),cache={};
const get=async p=>cache[p]||(cache[p]=await(await fetch(p)).blob());
const fix=async v=>{if(typeof v==='string'&&v.startsWith('content/media/'))return get(v);if(Array.isArray(v))return Promise.all(v.map(fix));if(v&&typeof v==='object')for(const k in v)v[k]=await fix(v[k]);return v};
for(const s of STORES)for(const r of d[s]||[])await DB.put(s,await fix(r))}
async function publishTab(){const box=h('div'),st=h('p',{class:'muted'});
box.append(h('div',{class:'card'},h('h3',{},'Publish to students'),h('ol',{},h('li',{},'Download the bundle.'),h('li',{},'Unzip it and replace the content folder in your GitHub repo.'),h('li',{},'Commit. Students see the changes after GitHub Pages rebuilds (about a minute) and they refresh.')),
h('button',{onclick:async()=>{st.textContent='Building bundle…';const r=await buildZip(),a=h('a',{href:URL.createObjectURL(r.blob),download:'content.zip'});document.body.append(a);a.click();a.remove();st.textContent=r.count+' media files, '+(r.blob.size/1048576).toFixed(1)+' MB. Keep the whole site under 1 GB.'}},'Download content.zip'),st),
h('div',{class:'card'},h('h3',{},'Using a new device?'),h('p',{class:'muted'},'Load what is already published, then keep editing.'),h('button',{class:'alt',onclick:async()=>{try{await importSite();alert('Loaded.');adminView()}catch(e){alert('Nothing published yet.')}}},'Load from published site')));return box}
async function students(){const us=await DB.all('users'),box=h('div'),n=h('input',{placeholder:'Full name'}),u=h('input',{placeholder:'Username'}),p=h('input',{placeholder:'Password (6+ characters)'});
box.append(h('div',{class:'card'},h('h3',{},'Add student'),n,u,p,h('button',{onclick:async()=>{const un=u.value.trim().toLowerCase();if(un.length<3||p.value.length<6||un==='abhi sir'||us.some(x=>x.username===un))return alert('Username must be 3+ characters and unique; password 6+ characters.');await DB.put('users',{name:n.value.trim()||un,username:un,hash:await hashCred(un,p.value)});adminView()}},'Add student'),h('p',{class:'muted'},'Publish afterwards so the student can log in from any device.')));
us.forEach(x=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},x.name+' ('+x.username+')'),
h('button',{onclick:async()=>{const q=prompt('New password for '+x.username+' (6+ characters)');if(q&&q.length>=6){x.hash=await hashCred(x.username,q);await DB.put('users',x);alert('Reset. Publish to apply.')}}},'Reset password'),
h('button',{class:'del',onclick:()=>ask('Remove student?',()=>DB.del('users',x.id))},'Remove'))));return box}
