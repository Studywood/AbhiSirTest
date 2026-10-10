let SF=null,STab='home';
async function studentView(){const root=h('main');
root.append(h('div',{class:'tabs'},...[['home','Home'],['lib','Tests & papers'],['my','My results']].map(([k,l])=>h('button',{class:STab===k?'on':'',onclick:()=>{STab=k;studentView()}},l))));
root.append(STab==='home'?await home():STab==='lib'?await browse():await mine());shell('Student panel','',root)}
async function home(){const s=(await PUB.get('settings','main'))||{},fs=await PUB.all('folders'),rs=(await DB.all('results')).filter(r=>r.student===Session.get().id),box=h('div');
box.append(h('div',{class:'card'},s.logo?h('img',{src:s.logo,style:'height:64px;border-radius:14px'}):'',h('h2',{},'Welcome, '+Session.get().name),h('div',{class:'muted'},s.tag||s.name||'')));
const avg=rs.length?Math.round(rs.reduce((a,r)=>a+(r.total?r.score/r.total*100:0),0)/rs.length):0;
box.append(h('div',{class:'card'},h('b',{},'Your progress'),h('div',{},rs.length+' attempts · average score '+avg+'%')));
if((s.notices||[]).length){box.append(h('h3',{},'Notice board'));s.notices.forEach(n=>box.append(h('div',{class:'card'},n.text,h('div',{class:'muted'},new Date(n.at).toLocaleDateString()))))}
const cs=fs.filter(f=>!f.parent);if(cs.length){box.append(h('h3',{},'Courses'));cs.forEach(f=>box.append(h('div',{class:'card row'},h('b',{class:'grow'},'📁 '+f.name),h('button',{onclick:()=>{SF=f.id;STab='lib';studentView()}},'Open'))))}
if(s.wa)box.append(h('a',{class:'btn',target:'_blank',href:'https://wa.me/'+s.wa},'Contact on WhatsApp'));return box}
const kindTxt=t=>(t.kind==='quiz'?'Quiz · instant feedback':t.mins+' min mock test')+' · +'+t.pos+' / -'+t.neg+(t.start&&t.start>Date.now()?' · opens '+new Date(t.start).toLocaleString():'');
async function browse(){const [fs,ts,ps]=await Promise.all(['folders','tests','papers'].map(s=>PUB.all(s))),box=h('div');
const trail=[];let c=SF;while(c){const f=fs.find(x=>x.id===c);if(!f)break;trail.unshift(f);c=f.parent}
box.append(h('div',{class:'row'},h('button',{class:'alt',onclick:()=>{SF=null;studentView()}},'All classes'),...trail.map(f=>h('button',{class:'alt',onclick:()=>{SF=f.id;studentView()}},f.name))));
const sub=fs.filter(f=>(f.parent||null)===SF);if(!sub.length&&!SF)box.append(h('p',{class:'muted'},'Nothing published yet. Check back soon.'));
sub.forEach(f=>box.append(h('div',{class:'card row'},h('b',{class:'grow'},'📁 '+f.name),h('button',{onclick:()=>{SF=f.id;studentView()}},'Open'))));
ts.filter(t=>t.folder===SF).forEach(t=>box.append(h('div',{class:'card row'},h('div',{class:'grow'},h('b',{},t.title),h('div',{class:'muted'},kindTxt(t))),h('button',{onclick:()=>showInstr(t)},'Open'))));
ps.filter(p=>p.folder===SF).forEach(p=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},'📄 '+p.title),h('a',{class:'btn',target:'_blank',href:p.file},'Open'))));return box}
const expl=q=>(q.exp||q.expImg)?h('div',{class:'card'},h('b',{},'How to solve'),h('p',{},rich(q.exp)),pic(q.expImg)):'';
async function showInstr(t){const n=(await PUB.all('questions')).filter(q=>q.test===t.id).length,wait=t.start&&t.start>Date.now(),box=h('main');
box.append(h('button',{class:'alt',onclick:studentView},'← Back'),h('div',{class:'card'},h('h2',{},t.title),h('p',{},n+' questions · '+(t.kind==='quiz'?'no time limit, instant feedback':t.mins+' minutes')),
h('p',{},'Correct answer +'+t.pos+' · wrong answer -'+t.neg+' · not attempted 0'),t.instr?h('p',{style:'white-space:pre-wrap'},t.instr):'',
wait?h('p',{class:'err'},'This test opens on '+new Date(t.start).toLocaleString()):h('button',{onclick:()=>startTest(t)},'Start now')));shell('Instructions','',box)}
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
async function startTest(t){if(t.start&&t.start>Date.now())return alert('This test is not open yet.');let qs=(await PUB.all('questions')).filter(q=>q.test===t.id).sort((a,b)=>a.n-b.n);
if(!qs.length)return alert('No questions have been added yet.');if(t.shuffle)qs=shuffle(qs);const z=v=>qs.map(()=>v);
drawExam({t,qs,a:z(null),m:z(false),v:z(false),k:z(false),tm:z(0),i:0,ts:Date.now(),end:Date.now()+(t.mins||0)*60000})}
function drawExam(S){const{t,qs}=S,q=qs[S.i],quiz=t.kind==='quiz',ty=q.type||'mcq',cur=S.a[S.i],lock=quiz&&S.k[S.i],last=S.i===qs.length-1,box=h('main'),clock=h('b');S.v[S.i]=true;
const go=i=>{const n=Date.now();S.tm[S.i]+=n-S.ts;S.ts=n;S.i=i;drawExam(S)};
const draw=()=>{const left=Math.max(0,S.end-Date.now());clock.textContent='⏱ '+Math.floor(left/60000)+':'+String(Math.floor(left/1000)%60).padStart(2,'0');if(!left)submit()};
const submit=async()=>{if(S.done)return;S.done=true;clearInterval(timer);S.tm[S.i]+=Date.now()-S.ts;let sc=0;qs.forEach((x,i)=>{if(isAns(S.a[i]))sc+=right(x,S.a[i])?t.pos:-t.neg});
showResult(await DB.put('results',{test:t.id,student:Session.get().id,name:Session.get().name,score:sc,total:qs.length*t.pos,qids:qs.map(x=>x.id),a:S.a,tm:S.tm,at:Date.now()}))};
const col=i=>S.m[i]?'background:#8e6cf0;color:#fff':isAns(S.a[i])?'background:#2bb57e;color:#fff':S.v[i]?'background:#e5555a;color:#fff':'';
box.append(h('div',{class:'row'},h('b',{class:'grow'},t.title),quiz?'':clock),h('div',{class:'pal'},...qs.map((_,i)=>h('button',{class:i===S.i?'cur':'',style:col(i),onclick:()=>go(i)},i+1))));
if(!quiz)box.append(h('div',{class:'muted'},'Green answered · Red not answered · Purple marked for review'));
const set=i=>ty==='multi'?(cur||[]).includes(i):cur===i,ok=i=>ty==='multi'?q.ans.includes(i):q.ans===i;
const numIn=h('input',{type:'text',inputmode:'decimal',placeholder:'Type your answer',value:cur||'',disabled:lock,oninput:()=>{S.a[S.i]=numIn.value.trim()||null}});
const body=ty==='num'?[numIn]:q.opts.map((o,i)=>h('button',{class:'opt'+(lock?(ok(i)?' ok':set(i)?' no':''):set(i)?' sel':''),onclick:()=>{if(lock)return;
if(ty==='multi'){const a=[...(cur||[])],p=a.indexOf(i);p<0?a.push(i):a.splice(p,1);S.a[S.i]=a.length?a:null}else{S.a[S.i]=i;if(quiz)S.k[S.i]=true}drawExam(S)}},lab(q,i),rich(o.t),pic(o.img)));
box.append(h('div',{class:'card'},h('b',{},'Q'+(S.i+1)+'. '),rich(q.q),pic(q.qImg),ty==='multi'?h('div',{class:'muted'},'More than one option may be correct.'):'',...body,
lock&&ty==='num'?h('p',{class:right(q,cur)?'':'err'},(right(q,cur)?'Correct':'Wrong')+' · answer: '+corTxt(q)):'',
quiz&&!lock&&(ty==='multi'||ty==='num')?h('button',{onclick:()=>{S.k[S.i]=true;drawExam(S)}},'Check answer'):''),lock?expl(q):'',
h('div',{class:'row'},quiz?'':h('button',{class:'alt',onclick:()=>{S.a[S.i]=null;drawExam(S)}},'Clear'),quiz?'':h('button',{class:'alt',onclick:()=>{S.m[S.i]=!S.m[S.i];drawExam(S)}},S.m[S.i]?'Unmark review':'Mark for review'),
h('button',{class:'alt',disabled:S.i===0,onclick:()=>go(S.i-1)},'Previous'),last?'':h('button',{onclick:()=>go(S.i+1)},'Next'),h('span',{class:'grow'}),h('button',{class:'del',onclick:()=>confirm(quiz?'Finish the quiz?':'Submit the test now?')&&submit()},quiz?'Finish':'Submit')));
shell(quiz?'Quiz':'Mock test','',box);if(!quiz){timer=setInterval(draw,1000);draw()}}
async function showResult(r){const qs=await Promise.all(r.qids.map(id=>PUB.get('questions',id))),box=h('main'),tm=r.tm||[];let c=0,w=0,k=0;const tops={};
qs.forEach((q,i)=>{if(!q)return;const a=r.a[i],tp=q.topic||'General',o=tops[tp]||(tops[tp]={c:0,w:0,k:0,t:0});o.t+=tm[i]||0;if(!isAns(a)){k++;o.k++}else if(right(q,a)){c++;o.c++}else{w++;o.w++}});
const n=c+w+k||1,seg=(v,cl)=>h('div',{style:'width:'+v/n*100+'%;background:'+cl}),sec=ms=>Math.round(ms/1000),tt=tm.reduce((a,b)=>a+b,0);
box.append(h('button',{class:'alt',onclick:studentView},'← Back'),h('div',{class:'card'},h('div',{class:'big'},r.score+' / '+r.total),h('div',{},c+' correct · '+w+' wrong · '+k+' skipped'),
h('div',{style:'display:flex;height:14px;border-radius:8px;overflow:hidden;margin:10px 0'},seg(c,'#2bb57e'),seg(w,'#e5555a'),seg(k,'#9aa6c4')),tt?h('div',{class:'muted'},'Total time '+Math.floor(sec(tt)/60)+'m '+sec(tt)%60+'s'):''));
const tk=Object.entries(tops);if(tk.length>1||(tk[0]&&tk[0][0]!=='General'))box.append(h('div',{class:'card'},h('b',{},'Topic analysis'),...tk.map(([nm,o])=>{const att=o.c+o.w,pc=att?Math.round(o.c/att*100):0;
return h('div',{style:'margin:10px 0'},h('div',{class:'row'},h('span',{class:'grow'},nm),h('span',{class:'muted'},o.c+'/'+(o.c+o.w+o.k)+' correct · '+pc+'% accuracy'+(o.t?' · '+sec(o.t)+'s':''))),
h('div',{style:'height:10px;border-radius:6px;background:#9aa6c433;overflow:hidden'},h('div',{style:'height:100%;width:'+pc+'%;background:'+(pc>=60?'#2bb57e':pc>=35?'#f5a31a':'#e5555a')})))})));
qs.forEach((q,i)=>{if(!q)return;const a=r.a[i],ty=q.type||'mcq',st=!isAns(a)?'Not attempted':right(q,a)?'Correct':'Wrong',chosen=j=>Array.isArray(a)?a.includes(j):a===j,corr=j=>Array.isArray(q.ans)?q.ans.includes(j):q.ans===j;
box.append(h('div',{class:'card'},h('div',{class:'row'},h('b',{class:'grow'},'Q'+(i+1)+' · '+TYPES[ty]+(q.topic?' · '+q.topic:'')),h('b',{class:st==='Correct'?'':'err'},st)),tm[i]?h('div',{class:'muted'},'Time: '+sec(tm[i])+'s'):'',rich(q.q),pic(q.qImg),
ty==='num'?h('p',{},'Your answer: '+(isAns(a)?a:'none')+' · Correct answer: '+corTxt(q)):q.opts.map((o,j)=>h('div',{class:'opt '+(corr(j)?'ok':chosen(j)?'no':'')},lab(q,j),rich(o.t),pic(o.img),corr(j)?' ✓':'',chosen(j)?' (your answer)':'')),expl(q)))});
shell('Result & explanations','',box)}
async function mine(){const rs=(await DB.all('results')).filter(r=>r.student===Session.get().id).sort((a,b)=>b.at-a.at),ts=await PUB.all('tests'),box=h('div');
if(!rs.length)box.append(h('p',{class:'muted'},'Finish a test or quiz and your results will appear here.'));
rs.forEach(r=>box.append(h('div',{class:'card row'},h('div',{class:'grow'},h('b',{},(ts.find(t=>t.id===r.test)||{title:'(removed)'}).title),h('div',{class:'muted'},new Date(r.at).toLocaleString())),h('b',{},r.score+'/'+r.total),h('button',{onclick:()=>showResult(r)},'Review'))));return box}
