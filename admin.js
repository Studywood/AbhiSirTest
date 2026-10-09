let AF=null,AT=null,ATab='lib';
async function adminView(){const root=h('main');
root.append(h('div',{class:'tabs'},...[['lib','Library'],['stu','Students'],['pub','Publish']].map(([k,l])=>h('button',{class:ATab===k?'on':'',onclick:()=>{ATab=k;AT=null;adminView()}},l))));
root.append(AT?await testEditor():ATab==='lib'?await library():ATab==='stu'?await students():await publishTab());shell('Admin panel','adm',root)}
async function delTest(id){for(const q of await DB.all('questions'))if(q.test===id)await DB.del('questions',q.id);await DB.del('tests',id)}
async function delFolder(id){for(const f of await DB.all('folders'))if(f.parent===id)await delFolder(f.id);
for(const t of await DB.all('tests'))if(t.folder===id)await delTest(t.id);for(const p of await DB.all('papers'))if(p.folder===id)await DB.del('papers',p.id);await DB.del('folders',id)}
const ask=(m,f)=>confirm(m)&&f().then(adminView);
async function library(){const [fs,ts,ps]=await Promise.all(['folders','tests','papers'].map(s=>DB.all(s)));const box=h('div');
const trail=[];let c=AF;while(c){const f=fs.find(x=>x.id===c);trail.unshift(f);c=f.parent}
box.append(h('div',{class:'row'},h('button',{class:'alt',onclick:()=>{AF=null;adminView()}},'All classes'),...trail.map(f=>h('button',{class:'alt',onclick:()=>{AF=f.id;adminView()}},f.name))));
const nm=h('input',{placeholder:AF?'New sub-folder (e.g. CBSE, Physics, Chapter 1)':'New folder (e.g. Class 10)'});
box.append(h('div',{class:'card row'},h('div',{class:'grow'},nm),h('button',{onclick:async()=>{if(nm.value.trim()){await DB.put('folders',{name:nm.value.trim(),parent:AF});adminView()}}},'Create folder')));
fs.filter(f=>(f.parent||null)===AF).forEach(f=>box.append(h('div',{class:'card row'},h('b',{class:'grow'},'📁 '+f.name),h('button',{onclick:()=>{AF=f.id;adminView()}},'Open'),h('button',{class:'del',onclick:()=>ask('Delete folder and everything inside?',()=>delFolder(f.id))},'Delete'))));
if(!AF)return box;
ts.filter(t=>t.folder===AF).forEach(t=>box.append(h('div',{class:'card row'},h('div',{class:'grow'},h('b',{},t.title),h('div',{class:'muted'},t.mins+' min, +'+t.pos+' / -'+t.neg)),h('button',{onclick:()=>{AT=t.id;adminView()}},'Questions'),h('button',{class:'del',onclick:()=>ask('Delete this test?',()=>delTest(t.id))},'Delete'))));
const ti=h('input',{placeholder:'Mock test title'}),mi=h('input',{type:'number',placeholder:'Minutes',value:60}),pi=h('input',{type:'number',placeholder:'Marks per correct',value:4}),ni=h('input',{type:'number',placeholder:'Negative marks',value:1});
box.append(h('div',{class:'card'},h('h3',{},'Add mock test here'),ti,h('div',{class:'row'},mi,pi,ni),h('button',{onclick:async()=>{if(ti.value.trim()){await DB.put('tests',{folder:AF,title:ti.value.trim(),mins:+mi.value||60,pos:+pi.value,neg:+ni.value});adminView()}}},'Create test')));
ps.filter(p=>p.folder===AF).forEach(p=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},'📄 '+p.title),h('button',{class:'del',onclick:()=>ask('Delete paper?',()=>DB.del('papers',p.id))},'Delete'))));
const pt=h('input',{placeholder:'Question paper title'}),pf=h('input',{type:'file',accept:'application/pdf,image/*'});
box.append(h('div',{class:'card'},h('h3',{},'Publish question paper (PDF or image)'),pt,pf,h('button',{onclick:async()=>{if(pt.value.trim()&&pf.files[0]){await DB.put('papers',{folder:AF,title:pt.value.trim(),file:await fb(pf)});adminView()}}},'Publish')));
return box}
async function testEditor(){const t=await DB.get('tests',AT),qs=(await DB.all('questions')).filter(q=>q.test===AT).sort((a,b)=>a.n-b.n);const box=h('div');
box.append(h('button',{class:'alt',onclick:()=>{AT=null;adminView()}},'← Back'),h('h2',{},t.title+' ('+qs.length+' questions)'));
qs.forEach((q,i)=>box.append(h('div',{class:'card'},h('b',{},'Q'+(i+1)+'. '),q.q,pic(q.qImg),h('div',{class:'muted'},'Correct: '+'ABCD'[q.ans]),h('button',{class:'del',onclick:()=>ask('Delete question?',()=>DB.del('questions',q.id))},'Delete'))));
const q=h('textarea',{placeholder:'Question text (optional if you attach an image)',rows:3}),qi=h('input',{type:'file',accept:'image/*'});
const os=[0,1,2,3].map(i=>({t:h('input',{placeholder:'Option '+'ABCD'[i]+' text'}),f:h('input',{type:'file',accept:'image/*'})}));
const ans=h('select',{},...'ABCD'.split('').map((l,i)=>h('option',{value:i},'Correct answer: '+l)));
const ex=h('textarea',{placeholder:'Explanation: why right/wrong and how to solve',rows:3}),ei=h('input',{type:'file',accept:'image/*'}),err=h('p',{class:'err'});
box.append(h('div',{class:'card'},h('h3',{},'Add question'),q,h('label',{},'Question image (for long or diagram questions)'),qi,...os.flatMap((o,i)=>[h('label',{},'Option '+'ABCD'[i]),o.t,o.f]),ans,ex,h('label',{},'Explanation image'),ei,err,
h('button',{onclick:async()=>{if(!q.value.trim()&&!qi.files[0])return err.textContent='Add question text or image.';
if(os.some(o=>!o.t.value.trim()&&!o.f.files[0]))return err.textContent='Every option needs text or an image.';
await DB.put('questions',{test:AT,n:Date.now(),q:q.value.trim(),qImg:await fb(qi),opts:await Promise.all(os.map(async o=>({t:o.t.value.trim(),img:await fb(o.f)}))),ans:+ans.value,exp:ex.value.trim(),expImg:await fb(ei)});adminView()}},'Save question')));
return box}
async function _oldStudents(){const us=await DB.all('users'),box=h('div');if(!us.length)box.append(h('p',{class:'muted'},'No students have signed up on this device yet.'));
us.forEach(u=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},u.name+' ('+u.username+')'),
h('button',{onclick:async()=>{const p=prompt('New password for '+u.username+' (6+ characters)');if(p&&p.length>=6){u.hash=await hashCred(u.username,p);await DB.put('users',u);alert('Password reset.')}}},'Reset password'),
h('button',{class:'del',onclick:()=>ask('Remove student?',()=>DB.del('users',u.id))},'Remove'))));return box}
async function results(){const [rs,ts]=await Promise.all([DB.all('results'),DB.all('tests')]),box=h('div');if(!rs.length)box.append(h('p',{class:'muted'},'No attempts yet.'));
rs.sort((a,b)=>b.at-a.at).forEach(r=>box.append(h('div',{class:'card'},h('b',{},r.name),' · ',(ts.find(t=>t.id===r.test)||{title:'(deleted test)'}).title,h('div',{},'Score '+r.score+' / '+r.total),h('div',{class:'muted'},new Date(r.at).toLocaleString()))));return box}
