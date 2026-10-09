let SF=null,STab='lib';
async function studentView(){const root=h('main');
root.append(h('div',{class:'tabs'},...[['lib','Tests & papers'],['my','My results']].map(([k,l])=>h('button',{class:STab===k?'on':'',onclick:()=>{STab=k;studentView()}},l))));
root.append(STab==='lib'?await browse():await mine());shell('Student panel','',root)}
async function browse(){const [fs,ts,ps]=await Promise.all(['folders','tests','papers'].map(s=>PUB.all(s))),box=h('div');
const trail=[];let c=SF;while(c){const f=fs.find(x=>x.id===c);trail.unshift(f);c=f.parent}
box.append(h('div',{class:'row'},h('button',{class:'alt',onclick:()=>{SF=null;studentView()}},'All classes'),...trail.map(f=>h('button',{class:'alt',onclick:()=>{SF=f.id;studentView()}},f.name))));
const sub=fs.filter(f=>(f.parent||null)===SF);if(!sub.length&&!SF)box.append(h('p',{class:'muted'},'Nothing published yet. Check back soon.'));
sub.forEach(f=>box.append(h('div',{class:'card row'},h('b',{class:'grow'},'📁 '+f.name),h('button',{onclick:()=>{SF=f.id;studentView()}},'Open'))));
ts.filter(t=>t.folder===SF).forEach(t=>box.append(h('div',{class:'card row'},h('div',{class:'grow'},h('b',{},t.title),h('div',{class:'muted'},t.mins+' min · +'+t.pos+' / -'+t.neg+' marking')),h('button',{onclick:()=>startTest(t)},'Start test'))));
ps.filter(p=>p.folder===SF).forEach(p=>box.append(h('div',{class:'card row'},h('span',{class:'grow'},'📄 '+p.title),h('a',{class:'btn',target:'_blank',href:p.file},'Open'))));return box}
async function startTest(t){const qs=(await PUB.all('questions')).filter(q=>q.test===t.id).sort((a,b)=>a.n-b.n);if(!qs.length)return alert('This test has no questions yet.');
const S={t,qs,a:qs.map(()=>null),i:0,end:Date.now()+t.mins*60000};drawExam(S)}
function drawExam(S){const q=S.qs[S.i],box=h('main'),clock=h('b',{}),draw=()=>{const left=Math.max(0,S.end-Date.now());clock.textContent='⏱ '+Math.floor(left/60000)+':'+String(Math.floor(left/1000)%60).padStart(2,'0');if(!left)submit()};
const submit=async()=>{clearInterval(timer);let sc=0;S.qs.forEach((q,i)=>{if(S.a[i]!==null)sc+=S.a[i]===q.ans?S.t.pos:-S.t.neg});
const r=await DB.put('results',{test:S.t.id,student:Session.get().id,name:Session.get().name,score:sc,total:S.qs.length*S.t.pos,qids:S.qs.map(q=>q.id),a:S.a,at:Date.now()});showResult(r)};
box.append(h('div',{class:'row'},h('b',{class:'grow'},S.t.title),clock),h('div',{class:'pal'},...S.qs.map((_,i)=>h('button',{class:(S.a[i]!==null?'done ':'')+(i===S.i?'cur':''),onclick:()=>{S.i=i;drawExam(S)}},i+1))));
box.append(h('div',{class:'card'},h('b',{},'Q'+(S.i+1)+'. '),q.q,pic(q.qImg),...q.opts.map((o,i)=>h('button',{class:'opt'+(S.a[S.i]===i?' sel':''),onclick:()=>{S.a[S.i]=i;drawExam(S)}},'ABCD'[i]+'. '+o.t,pic(o.img)))),
h('div',{class:'row'},h('button',{class:'alt',onclick:()=>{S.a[S.i]=null;drawExam(S)}},'Clear'),h('button',{class:'alt',disabled:S.i===0,onclick:()=>{S.i--;drawExam(S)}},'Previous'),h('button',{disabled:S.i===S.qs.length-1,onclick:()=>{S.i++;drawExam(S)}},'Next'),h('span',{class:'grow'}),h('button',{class:'del',onclick:()=>confirm('Submit the test now?')&&submit()},'Submit')));
shell('Mock test','',box);clearInterval(timer);timer=setInterval(draw,1000);draw()}
async function showResult(r){const qs=await Promise.all(r.qids.map(id=>PUB.get('questions',id))),box=h('main');
box.append(h('button',{class:'alt',onclick:studentView},'← Back'),h('div',{class:'card'},h('div',{class:'big'},r.score+' / '+r.total),h('div',{class:'muted'},r.a.filter(x=>x!==null).length+' attempted of '+qs.length)));
qs.forEach((q,i)=>{if(!q)return;const a=r.a[i],st=a===null?'Not attempted':a===q.ans?'Correct':'Wrong';
box.append(h('div',{class:'card'},h('b',{},'Q'+(i+1)+'. '),q.q,pic(q.qImg),h('b',{class:a===q.ans?'':'err'},st),
...q.opts.map((o,j)=>h('div',{class:'opt '+(j===q.ans?'ok':j===a?'no':'')},'ABCD'[j]+'. '+o.t,pic(o.img))),
(q.exp||q.expImg)?h('div',{},h('b',{},'How to solve'),h('p',{},q.exp),pic(q.expImg)):''))});
shell('Result & explanations','',box)}
async function mine(){const rs=(await DB.all('results')).filter(r=>r.student===Session.get().id).sort((a,b)=>b.at-a.at),ts=await PUB.all('tests'),box=h('div');
if(!rs.length)box.append(h('p',{class:'muted'},'Take a mock test and your results will appear here.'));
rs.forEach(r=>box.append(h('div',{class:'card row'},h('div',{class:'grow'},h('b',{},(ts.find(t=>t.id===r.test)||{title:'(deleted test)'}).title),h('div',{class:'muted'},new Date(r.at).toLocaleString())),h('b',{},r.score+'/'+r.total),h('button',{onclick:()=>showResult(r)},'Review'))));return box}
