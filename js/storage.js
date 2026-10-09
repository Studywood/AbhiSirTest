// IndexedDB wrapper (per-device storage, far larger than localStorage; holds images as Blobs)
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const DB={p:null,
init(){return this.p=this.p||new Promise((ok,no)=>{const q=indexedDB.open('abhi-coaching',1);
q.onupgradeneeded=()=>['users','folders','tests','questions','papers','results'].forEach(s=>q.result.createObjectStore(s,{keyPath:'id'}));
q.onsuccess=()=>ok(q.result);q.onerror=no})},
async tx(s,m,f){const d=await this.init();return new Promise((ok,no)=>{const t=d.transaction(s,m),r=f(t.objectStore(s));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)})},
all:function(s){return this.tx(s,'readonly',o=>o.getAll())},get:function(s,id){return this.tx(s,'readonly',o=>o.get(id))},
put:function(s,v){v.id=v.id||uid();return this.tx(s,'readwrite',o=>o.put(v)).then(()=>v)},del:function(s,id){return this.tx(s,'readwrite',o=>o.delete(id))}};
const STORES=['users','folders','tests','questions','papers'];
// Read-only view of the published content (content/data.json in the GitHub repo). Students read from here.
const PUB={d:null,async load(){if(!this.d){try{const r=await fetch('content/data.json?v='+Date.now(),{cache:'no-store'});this.d=r.ok?await r.json():{}}catch(e){this.d={}}}return this.d},
async all(s){return (await this.load())[s]||[]},async get(s,id){return (await this.all(s)).find(r=>r.id===id)}};
