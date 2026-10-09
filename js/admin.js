let AF=null,AT=null,ATab='lib';
async function adminView(){const root=h('main');
root.append(h('div',{class:'tabs'},...[['lib','Library'],['stu','Students'],['pub','Publish']].map(([k,l])=>h('button',{class:ATab===k?'on':'',onclick:()=>{ATab=k;AT=null;adminView()}},l))));
if(localStorage.dirty&&ATab!=='pub')root.append(h('div',{class:'card row'},h('span',{class:'grow'},'You have unpublished changes.'),h('button',{onclick:()=>{ATab='pub';AT=null;adminView()}},'Publish')));
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
ts.filter(t=>t.folder===AF).forEach(t=>box.append(h('div',{class:'card row'},h('div',{class:'grow'},h('b',{},t.title),h('div',{class:'muted'},(t.kind==='quiz'?'Quiz':t.mins+' min mock test')+', +'+t.pos+' / -'+t.neg)),h('button',{onclick:()=>{AT=t.id;adminView()}},'Questions'),h('button',{class:'del',onclick:()=>ask('Delete this test?',()=>delTest(t.id))},'Delete'))));
const ti=h('input',{placeholder:'Title (e.g. Algebra Mock 1)'}),kd=h('select',{},h('option',{value:'mock'},'Mock test: timed, result at the end'),h('option',{value:'quiz'},'Quiz: instant answer and explanation')),mi=h('input',{type:'number',placeholder:'Minutes (mock)',value:60}),pi=h('input',{type:'number',placeholder:'Marks per correct',value:4}),ni=h('input',{type:'number',placeholder:'Negative marks',value:1});
box.append(h('div',{class:'card'},h('h3',{},'Add mock test or quiz here'),ti,kd,h('div',{class:'row'},mi,pi,ni),h('button',{onclick:async()=>{if(ti.value.trim()){AT=(await DB.put('tests',{folder:AF,kind:kd.value,title:ti.value.trim(),mins:kd.value==='quiz'?0:+mi.value||60,pos:+pi.value,neg:+ni.value})).id;adminView()}}},'Create')));
ps.filter(p=>p.folder===AF).forEach(p=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},'📄 '+p.title),h('button',{class:'del',onclick:()=>ask('Delete paper?',()=>DB.del('papers',p.id))},'Delete'))));
const pt=h('input',{placeholder:'Question paper title'}),pf=h('input',{type:'file',accept:'application/pdf,image/*'});
box.append(h('div',{class:'card'},h('h3',{},'Publish question paper (PDF or image)'),pt,pf,h('button',{onclick:async()=>{if(pt.value.trim()&&pf.files[0]){await DB.put('papers',{folder:AF,title:pt.value.trim(),file:await fb(pf)});adminView()}}},'Publish')));
return box}
let FLASH='';
function fileField(label){const f=h('input',{type:'file',accept:'image/*'}),pv=h('div');f.onchange=()=>pv.replaceChildren(f.files[0]?pic(f.files[0]):'');
return{f,el:h('div',{},h('label',{},label),f,pv),clear(){f.value='';pv.replaceChildren()}}}
async function testEditor(){const t=await DB.get('tests',AT),qs=(await DB.all('questions')).filter(q=>q.test===AT).sort((a,b)=>a.n-b.n),box=h('div');
box.append(h('button',{class:'alt',onclick:()=>{AT=null;adminView()}},'← Back to folder'),h('h2',{},t.title),h('p',{class:'muted'},(t.kind==='quiz'?'Quiz':'Mock test')+' · '+qs.length+' questions · +'+t.pos+' / -'+t.neg));
if(FLASH){box.append(h('div',{class:'card',style:'border-color:#1f9d6b;background:#1f9d6b22'},'✓ '+FLASH));FLASH=''}
let type='mcq',cor=0;
const ty=h('select',{onchange:()=>{type=ty.value;cor=0;draw()}},h('option',{value:'mcq'},'MCQ (4 options)'),h('option',{value:'tf'},'True / False'));
const q=h('textarea',{placeholder:'Type the question (optional if you upload an image)',rows:3}),qf=fileField('Question image (for a long question, upload a photo instead of typing)');
const os=[0,1,2,3].map(i=>({t:h('input',{placeholder:'Option '+'ABCD'[i]+' text (optional if you upload an image)'}),f:fileField('Option '+'ABCD'[i]+' image')}));
const ob=h('div'),ex=h('textarea',{placeholder:'Explanation: why this is right and how to solve it',rows:3}),ef=fileField('Explanation image (photo of the worked solution)'),err=h('p',{class:'err'});
const radio=(i,l)=>h('label',{},h('input',{type:'radio',name:'cor',checked:cor===i,onchange:()=>cor=i}),' '+l+' is the correct answer');
function draw(){ob.replaceChildren(...(type==='mcq'?os.map((o,i)=>h('div',{class:'card'},h('b',{},'Option '+'ABCD'[i]),o.t,o.f.el,radio(i,'Option '+'ABCD'[i]))):['True','False'].map((l,i)=>h('div',{class:'card'},radio(i,l)))))}
const sv=h('button',{onclick:async()=>{const tf=type==='tf';err.textContent='';
if(!q.value.trim()&&!qf.f.files[0])return err.textContent='Add the question as text or an image.';
if(!tf){const bad=os.findIndex(o=>!o.t.value.trim()&&!o.f.f.files[0]);if(bad>=0)return err.textContent='Option '+'ABCD'[bad]+' needs text or an image.'}
sv.disabled=true;sv.textContent='Saving…';
await DB.put('questions',{test:AT,n:Date.now(),type,q:q.value.trim(),qImg:await fb(qf.f),opts:tf?[{t:'True',img:null},{t:'False',img:null}]:await Promise.all(os.map(async o=>({t:o.t.value.trim(),img:await fb(o.f.f)}))),ans:cor,exp:ex.value.trim(),expImg:await fb(ef.f)});
FLASH='Question '+(qs.length+1)+' saved. Add the next one below.';await adminView();scrollTo(0,0)}},'Save and add next question');
draw();
box.append(h('div',{class:'card'},h('h3',{},'Add question '+(qs.length+1)),ty,q,qf.el,h('h3',{},'Options'),ob,h('h3',{},'Explanation (shown after the test)'),ex,ef.el,err,sv));
if(qs.length)box.append(h('h3',{},'Questions in this set'));
qs.forEach((x,i)=>box.append(h('div',{class:'card'},h('b',{},'Q'+(i+1)+' ['+(x.type==='tf'?'True/False':'MCQ')+'] '),(x.q||'').slice(0,160),pic(x.qImg),h('div',{class:'muted'},'Correct: '+(x.type==='tf'?['True','False'][x.ans]:'ABCD'[x.ans])),h('button',{class:'del',onclick:()=>ask('Delete this question?',()=>DB.del('questions',x.id))},'Delete'))));
return box}
async function _oldStudents(){const us=await DB.all('users'),box=h('div');if(!us.length)box.append(h('p',{class:'muted'},'No students have signed up on this device yet.'));
us.forEach(u=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},u.name+' ('+u.username+')'),
h('button',{onclick:async()=>{const p=prompt('New password for '+u.username+' (6+ characters)');if(p&&p.length>=6){u.hash=await hashCred(u.username,p);await DB.put('users',u);alert('Password reset.')}}},'Reset password'),
h('button',{class:'del',onclick:()=>ask('Remove student?',()=>DB.del('users',u.id))},'Remove'))));return box}
async function results(){const [rs,ts]=await Promise.all([DB.all('results'),DB.all('tests')]),box=h('div');if(!rs.length)box.append(h('p',{class:'muted'},'No attempts yet.'));
rs.sort((a,b)=>b.at-a.at).forEach(r=>box.append(h('div',{class:'card'},h('b',{},r.name),' · ',(ts.find(t=>t.id===r.test)||{title:'(deleted test)'}).title,h('div',{},'Score '+r.score+' / '+r.total),h('div',{class:'muted'},new Date(r.at).toLocaleString()))));return box}
