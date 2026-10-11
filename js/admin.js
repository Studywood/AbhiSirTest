let AF=null,AT=null,ATab='lib',FLASH='',EDIT=null,MOVE=null;
async function adminView(){const root=h('main');
root.append(h('div',{class:'tabs'},...[['lib','Library'],['stu','Students'],['set','Site'],['pub','Publish']].map(([k,l])=>h('button',{class:ATab===k?'on':'',onclick:()=>{ATab=k;AT=null;EDIT=null;MOVE=null;adminView()}},l))));
if(localStorage.dirty&&ATab!=='pub')root.append(h('div',{class:'card row'},h('span',{class:'grow'},'You have unpublished changes.'),h('button',{onclick:()=>{ATab='pub';AT=null;adminView()}},'Publish')));
root.append(AT?await testEditor():ATab==='lib'?await library():ATab==='stu'?await students():ATab==='set'?await siteTab():await publishTab());shell('Admin panel','adm',root)}
async function delTest(id){for(const q of await DB.all('questions'))if(q.test===id)await DB.del('questions',q.id);await DB.del('tests',id)}
async function delFolder(id){for(const f of await DB.all('folders'))if(f.parent===id)await delFolder(f.id);
for(const t of await DB.all('tests'))if(t.folder===id)await delTest(t.id);for(const p of await DB.all('papers'))if(p.folder===id)await DB.del('papers',p.id);await DB.del('folders',id)}
const ask=(m,f)=>confirm(m)&&f().then(adminView);
function fileField(label,cur){const f=h('input',{type:'file',accept:'image/*'}),pv=h('div',{},cur?pic(cur):'');f.onchange=()=>pv.replaceChildren(f.files[0]?pic(f.files[0]):'');
return{f,el:h('div',{},h('label',{},label),f,cur?h('div',{class:'muted'},'Current image is kept unless you choose a new one.'):'',pv)}}
async function library(){const [fs,ts,ps]=await Promise.all(['folders','tests','papers'].map(s=>DB.all(s)));const box=h('div');
const trail=[];let c=AF;while(c){const f=fs.find(x=>x.id===c);if(!f)break;trail.unshift(f);c=f.parent}
box.append(h('div',{class:'row'},h('button',{class:'alt',onclick:()=>{AF=null;adminView()}},'All classes'),...trail.map(f=>h('button',{class:'alt',onclick:()=>{AF=f.id;adminView()}},f.name))));
if(MOVE)box.append(movePicker(fs,ts,ps));
const nm=h('input',{placeholder:AF?'New sub-folder (e.g. CBSE, Physics, Chapter 1)':'New folder (e.g. Class 10)'});
box.append(h('div',{class:'card row'},h('div',{class:'grow'},nm),h('button',{onclick:async()=>{if(nm.value.trim()){await DB.put('folders',{name:nm.value.trim(),parent:AF});adminView()}}},'Create folder')));
fs.filter(f=>(f.parent||null)===AF).forEach(f=>box.append(h('div',{class:'card row'},h('b',{class:'grow'},'📁 '+f.name),h('button',{onclick:()=>{AF=f.id;adminView()}},'Open'),h('button',{class:'alt',onclick:()=>{MOVE={k:'f',id:f.id};adminView();scrollTo(0,0)}},'Move'),h('button',{class:'del',onclick:()=>ask('Delete folder and everything inside?',()=>delFolder(f.id))},'Delete'))));
if(!AF)return box;
ts.filter(t=>t.folder===AF).forEach(t=>box.append(h('div',{class:'card row'},h('div',{class:'grow'},h('b',{},t.title),h('div',{class:'muted'},(t.kind==='quiz'?'Quiz':t.mins+' min mock test')+', +'+t.pos+' / -'+t.neg+(t.start?' · opens '+new Date(t.start).toLocaleString():''))),h('button',{onclick:()=>{AT=t.id;adminView()}},'Add / edit questions'),h('button',{class:'alt',onclick:()=>{MOVE={k:'t',id:t.id};adminView();scrollTo(0,0)}},'Move'),h('button',{class:'del',onclick:()=>ask('Delete this test?',()=>delTest(t.id))},'Delete'))));
const ti=h('input',{placeholder:'Title (e.g. JEE Mock 1)'}),kd=h('select',{},h('option',{value:'mock'},'Mock test (timed, like JEE): result at the end'),h('option',{value:'quiz'},'Quiz: instant answer after each question')),
mi=h('input',{type:'number',placeholder:'Minutes',value:180}),pi=h('input',{type:'number',placeholder:'Marks per correct',value:4}),ni=h('input',{type:'number',placeholder:'Negative marks',value:1}),
st=h('input',{type:'datetime-local'}),ins=h('textarea',{rows:3,placeholder:'Instructions shown before the test starts (optional)'}),shf=h('input',{type:'checkbox'});
box.append(h('div',{class:'card'},h('h3',{},'Step 1: create a mock test or quiz (you add the questions next)'),ti,kd,h('label',{},'Time in minutes, marks for a correct answer, marks lost for a wrong answer'),h('div',{class:'row'},mi,pi,ni),
h('label',{},'Opens on (optional; leave empty to open now)'),st,ins,h('label',{},shf,' Shuffle question order for each student'),h('br'),
h('button',{onclick:async()=>{if(!ti.value.trim())return alert('Type a title first.');AT=(await DB.put('tests',{folder:AF,kind:kd.value,title:ti.value.trim(),mins:kd.value==='quiz'?0:+mi.value||60,pos:+pi.value,neg:+ni.value,start:st.value?Date.parse(st.value):0,instr:ins.value.trim(),shuffle:shf.checked})).id;adminView()}},'Create and add questions')));
ps.filter(p=>p.folder===AF).forEach(p=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},'📄 '+p.title),h('button',{class:'alt',onclick:()=>{MOVE={k:'p',id:p.id};adminView();scrollTo(0,0)}},'Move'),h('button',{class:'del',onclick:()=>ask('Delete paper?',()=>DB.del('papers',p.id))},'Delete'))));
const pt=h('input',{placeholder:'Question paper title'}),pf=h('input',{type:'file',accept:'application/pdf,image/*'});
box.append(h('div',{class:'card'},h('h3',{},'Publish question paper (PDF or image)'),pt,pf,h('button',{onclick:async()=>{if(pt.value.trim()&&pf.files[0]){await DB.put('papers',{folder:AF,title:pt.value.trim(),file:await fb(pf)});adminView()}}},'Publish')));
return box}
function csv(t){const rows=[];let r=[],c='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];
if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
else if(ch=='"')q=true;else if(ch==','){r.push(c);c=''}else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;r.push(c);c='';if(r.some(x=>x.trim()))rows.push(r);r=[]}else c+=ch}
r.push(c);if(r.some(x=>x.trim()))rows.push(r);return rows}
async function importCsv(file){const rows=csv((await file.text()).replace(/^\uFEFF/,''));if(rows.length&&rows[0][0].trim().toLowerCase()==='type')rows.shift();let ok=0,bad=0,n=Date.now();
for(const r of rows){const [ty,tp,q,a,b,c,d,an,ex,tol]=Array.from({length:10},(_,i)=>(r[i]||'').trim());const type=(ty||'mcq').toLowerCase();let ans;
if(!q||!TYPES[type]){bad++;continue}
if(type==='mcq'||type==='multi'){if(![a,b,c,d].every(Boolean)){bad++;continue}
if(type==='mcq'){ans='ABCD'.indexOf(an.toUpperCase());if(ans<0){bad++;continue}}else{ans=[...new Set(an.toUpperCase().replace(/[^A-D]/g,'').split('').map(x=>'ABCD'.indexOf(x)))].sort();if(!ans.length){bad++;continue}}}
else if(type==='tf'){ans=/^t/i.test(an)?0:/^f/i.test(an)?1:-1;if(ans<0){bad++;continue}}
else{if(isNaN(parseFloat(an))){bad++;continue}ans=an}
await DB.put('questions',{test:AT,n:n++,type,topic:tp,q,qImg:null,exp:ex,expImg:null,tol:+tol||0,opts:type==='tf'?[{t:'True',img:null},{t:'False',img:null}]:type==='num'?[]:[a,b,c,d].map(t=>({t,img:null})),ans});ok++}
FLASH='Imported '+ok+' questions'+(bad?', skipped '+bad+' invalid rows':'')+'.';adminView()}
function csvCard(){const f=h('input',{type:'file',accept:'.csv,text/csv'});
const tpl='type,topic,question,A,B,C,D,answer,explanation,tolerance\nmcq,Algebra,"What is $2+2$?",3,4,5,6,B,"2+2=4",\nmulti,Mechanics,"Which are vectors?",Force,Mass,Velocity,Time,"A,C","Force and velocity have direction",\ntf,Geometry,"A triangle has 3 sides.",,,,,True,"By definition",\nnum,Algebra,"Value of $3\\times 4$?",,,,,12,"3 times 4",0\n';
return h('div',{class:'card'},h('h3',{},'Bulk upload from a spreadsheet'),h('p',{class:'muted'},'Save your Excel sheet as CSV. Text questions only; add images later with Edit.'),f,
h('button',{onclick:()=>f.files[0]?importCsv(f.files[0]):alert('Choose a CSV file first.')},'Import questions'),' ',
h('button',{class:'alt',onclick:()=>{const a=h('a',{href:URL.createObjectURL(new Blob([tpl],{type:'text/csv'})),download:'questions-template.csv'});document.body.append(a);a.click();a.remove()}},'Download template'))}
async function testEditor(){const t=await DB.get('tests',AT),qs=(await DB.all('questions')).filter(q=>q.test===AT).sort((a,b)=>a.n-b.n),ed=EDIT?qs.find(x=>x.id===EDIT):null,box=h('div');
box.append(h('button',{class:'alt',onclick:()=>{AT=null;EDIT=null;adminView()}},'← Back to folder'),h('h2',{},t.title),h('p',{class:'muted'},(t.kind==='quiz'?'Quiz':'Mock test')+' · '+qs.length+' questions · +'+t.pos+' / -'+t.neg));
if(FLASH){box.append(h('div',{class:'card',style:'border-color:#1f9d6b;background:#1f9d6b22'},'✓ '+FLASH));FLASH=''}
let type=ed?(ed.type||'mcq'):'mcq',cor=ed&&typeof ed.ans==='number'?ed.ans:0;const cs=new Set(ed&&Array.isArray(ed.ans)?ed.ans:[]);
const ty=h('select',{onchange:()=>{type=ty.value;cor=0;cs.clear();draw()}},...Object.entries(TYPES).map(([k,l])=>h('option',{value:k,selected:k===type},l)));
const tp=h('input',{placeholder:'Topic / chapter (e.g. Kinematics) for result analysis',value:ed?ed.topic||'':''});
const q=h('textarea',{rows:3,placeholder:'Type the question. Put formulas between $ signs, e.g. $x^2+1$ (optional if you upload an image)'});q.value=ed?ed.q:'';
const qf=fileField('Question image (for a long question, upload a photo instead of typing)',ed&&ed.qImg);
const os=[0,1,2,3].map(i=>{const o=ed&&ed.type!=='tf'&&ed.opts&&ed.opts[i]||null,tx=h('input',{placeholder:'Option '+'ABCD'[i]+' text (optional if you upload an image)'});tx.value=o?o.t:'';return{t:tx,f:fileField('Option '+'ABCD'[i]+' image',o&&o.img),old:o}});
const nu=h('input',{type:'text',inputmode:'decimal',placeholder:'Correct numerical answer, e.g. 12.5'}),tl=h('input',{type:'number',step:'any',placeholder:'Allowed error, e.g. 0.01 (optional)'});if(ed&&ed.type==='num'){nu.value=ed.ans;tl.value=ed.tol||''}
const ob=h('div'),ex=h('textarea',{rows:3,placeholder:'Explanation: why this is right and how to solve it (formulas between $ signs)'}),ef=fileField('Explanation image (photo of the worked solution)',ed&&ed.expImg),err=h('p',{class:'err'});ex.value=ed?ed.exp:'';
const pick=(i,l)=>h('label',{},type==='multi'?h('input',{type:'checkbox',checked:cs.has(i),onchange:e=>e.target.checked?cs.add(i):cs.delete(i)}):h('input',{type:'radio',name:'cor',checked:cor===i,onchange:()=>cor=i}),' '+l+(type==='multi'?' is correct':' is the correct answer'));
function draw(){ob.replaceChildren(...(type==='num'?[h('div',{class:'card'},nu,tl)]:type==='tf'?['True','False'].map((l,i)=>h('div',{class:'card'},pick(i,l))):os.map((o,i)=>h('div',{class:'card'},h('b',{},'Option '+'ABCD'[i]),o.t,o.f.el,pick(i,'Option '+'ABCD'[i])))))}
const sv=h('button',{onclick:async()=>{err.textContent='';const two=type==='mcq'||type==='multi';
if(!q.value.trim()&&!qf.f.files[0]&&!(ed&&ed.qImg))return err.textContent='Add the question as text or an image.';
if(two){const bad=os.findIndex(o=>!o.t.value.trim()&&!o.f.f.files[0]&&!(o.old&&o.old.img));if(bad>=0)return err.textContent='Option '+'ABCD'[bad]+' needs text or an image.'}
if(type==='multi'&&!cs.size)return err.textContent='Tick at least one correct option.';
if(type==='num'&&isNaN(parseFloat(nu.value)))return err.textContent='Enter the correct number.';
sv.disabled=true;sv.textContent='Saving…';const rec=ed?{...ed}:{test:AT,n:Date.now()};
Object.assign(rec,{type,topic:tp.value.trim(),q:q.value.trim(),qImg:(await fb(qf.f))||(ed&&ed.qImg)||null,exp:ex.value.trim(),expImg:(await fb(ef.f))||(ed&&ed.expImg)||null,tol:type==='num'?+tl.value||0:0,
opts:type==='tf'?[{t:'True',img:null},{t:'False',img:null}]:type==='num'?[]:await Promise.all(os.map(async o=>({t:o.t.value.trim(),img:(await fb(o.f.f))||(o.old&&o.old.img)||null}))),
ans:type==='multi'?[...cs].sort():type==='num'?nu.value.trim():cor});
await DB.put('questions',rec);FLASH=ed?'Question updated.':'Question '+(qs.length+1)+' saved. Add the next one below.';EDIT=null;await adminView();scrollTo(0,0)}},ed?'Save changes':'Save and add next question');
draw();
if(!ed)box.append(csvCard());
box.append(h('div',{class:'card'},h('h3',{},ed?'Edit question':'Add question '+(qs.length+1)),ty,tp,q,qf.el,h('h3',{},'Answer and options'),ob,h('h3',{},'Explanation (shown after the test)'),ex,ef.el,err,sv,ed?h('button',{class:'alt',onclick:()=>{EDIT=null;adminView()}},'Cancel'):''));
if(qs.length)box.append(h('h3',{},'Questions in this set'));
const swap=async(i,j)=>{const a=qs[i],b=qs[j];[a.n,b.n]=[b.n,a.n];await DB.put('questions',a);await DB.put('questions',b);adminView()};
qs.forEach((x,i)=>box.append(h('div',{class:'card'},h('b',{},'Q'+(i+1)+' ['+TYPES[x.type||'mcq']+']'+(x.topic?' · '+x.topic:'')+' '),rich(x.q),pic(x.qImg),h('div',{class:'muted'},'Correct: '+corTxt(x)),
h('div',{class:'row'},h('button',{class:'alt',onclick:()=>{EDIT=x.id;adminView();scrollTo(0,0)}},'Edit'),h('button',{class:'alt',onclick:async()=>{await DB.put('questions',{...x,id:undefined,n:Date.now()});FLASH='Question duplicated.';adminView()}},'Duplicate'),
h('button',{class:'alt',disabled:i===0,onclick:()=>swap(i,i-1)},'↑'),h('button',{class:'alt',disabled:i===qs.length-1,onclick:()=>swap(i,i+1)},'↓'),h('button',{class:'del',onclick:()=>ask('Delete this question?',()=>DB.del('questions',x.id))},'Delete')))));
return box}
async function siteTab(){const s=(await DB.get('settings','main'))||{id:'main',notices:[]},box=h('div');
const nm=h('input',{placeholder:'Institute name',value:s.name||''}),tg=h('input',{placeholder:'Tagline',value:s.tag||''}),wa=h('input',{placeholder:'WhatsApp number with country code, e.g. 919876543210',value:s.wa||''}),lg=fileField('Logo (shown on the login screen and home page)',s.logo);
box.append(h('div',{class:'card'},h('h3',{},'Institute details'),nm,tg,wa,lg.el,h('button',{onclick:async()=>{await DB.put('settings',{...s,id:'main',name:nm.value.trim(),tag:tg.value.trim(),wa:wa.value.replace(/\D/g,''),logo:(await fb(lg.f))||s.logo||null});alert('Saved. Press Publish to show it to students.');adminView()}},'Save')));
const nt=h('textarea',{rows:2,placeholder:'Write an announcement'});
box.append(h('div',{class:'card'},h('h3',{},'Notice board'),nt,h('button',{onclick:async()=>{if(!nt.value.trim())return;await DB.put('settings',{...s,id:'main',notices:[{id:uid(),text:nt.value.trim(),at:Date.now()},...(s.notices||[])]});adminView()}},'Post notice')));
(s.notices||[]).forEach(n=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},n.text,h('div',{class:'muted'},new Date(n.at).toLocaleString())),h('button',{class:'del',onclick:()=>ask('Delete this notice?',()=>DB.put('settings',{...s,id:'main',notices:s.notices.filter(x=>x.id!==n.id)}))},'Delete'))));return box}

function movePicker(fs,ts,ps){const m=MOVE,item=(m.k==='f'?fs:m.k==='t'?ts:ps).find(x=>x.id===m.id)||{},store={f:'folders',t:'tests',p:'papers'}[m.k];
const path=id=>{const n=[];let c=id;while(c){const f=fs.find(x=>x.id===c);if(!f)break;n.unshift(f.name);c=f.parent}return n.join(' › ')};
const bad=new Set();if(m.k==='f'){const add=id=>{bad.add(id);fs.filter(x=>x.parent===id).forEach(x=>add(x.id))};add(m.id)}
const opts=fs.filter(f=>!bad.has(f.id)).map(f=>({id:f.id,p:path(f.id)})).sort((a,b)=>a.p.localeCompare(b.p));
const sel=h('select',{},...(m.k==='f'?[h('option',{value:''},'Top level (All classes)')]:[]),...opts.map(o=>h('option',{value:o.id},o.p)));
return h('div',{class:'card',style:'border-color:#f5a31a'},h('h3',{},'Move "'+(item.name||item.title||'')+'" to…'),sel,h('div',{class:'row'},
h('button',{onclick:async()=>{if(!opts.length&&m.k!=='f')return alert('Create a folder first.');const x=await DB.get(store,m.id);if(m.k==='f')x.parent=sel.value||null;else x.folder=sel.value;await DB.put(store,x);MOVE=null;AF=sel.value||null;adminView();scrollTo(0,0)}},'Move here'),
h('button',{class:'alt',onclick:()=>{MOVE=null;adminView()}},'Cancel')))}
