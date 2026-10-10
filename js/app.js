const $=s=>document.querySelector(s);
function h(t,a={},...k){const e=document.createElement(t);for(const[n,v]of Object.entries(a)){if(n.startsWith('on'))e[n]=v;else if(n==='class')e.className=v;else if(v!==undefined&&v!==false)e.setAttribute(n,v)}
k.flat().forEach(c=>e.append(c instanceof Node?c:document.createTextNode(c??'')));return e}
const pic=b=>b?h('img',{class:'q',src:typeof b==='string'?b:URL.createObjectURL(b)}):'';
let timer=null;
function shell(title,cls,body){clearInterval(timer);const s=Session.get();
$('#app').replaceChildren(h('header',{class:cls},h('b',{},title),h('span',{},s.name),h('button',{class:'alt',onclick:()=>{Session.clear();boot()}},'Log out')),body)}
function boot(){const s=Session.get();if(s)return s.role==='admin'?adminView():studentView();loginView()}
function loginView(up){const T=h('h1',{},'Abhi Sir Classes'),LG=h('div');PUB.get('settings','main').then(s=>{if(!s)return;if(s.name)T.textContent=s.name;if(s.logo)LG.append(h('img',{src:s.logo,style:'height:72px;border-radius:16px'}))});const msg=h('p',{class:'err'}),name=h('input',{placeholder:'Full name',autocomplete:'name'});
const u=h('input',{placeholder:'Username',autocomplete:'username',required:true,value:up?'':localStorage.getItem('rememberUser')||''});
const p=h('input',{type:'password',placeholder:up?'Choose a password (6+ characters)':'Password',autocomplete:up?'new-password':'current-password',required:true});
const rm=h('input',{type:'checkbox'});rm.checked=!!localStorage.getItem('rememberUser');
const show=h('input',{type:'checkbox',onchange:()=>p.type=show.checked?'text':'password'});
const done=()=>{rm.checked?localStorage.setItem('rememberUser',u.value.trim().toLowerCase()):localStorage.removeItem('rememberUser');boot()};
const f=h('form',{onsubmit:async e=>{e.preventDefault();msg.textContent='';
if(up){const r=await signup(name.value,u.value,p.value);if(r.err){msg.textContent=r.err;return}await login(u.value,p.value);
const wa='https://wa.me/?text='+encodeURIComponent('Please add my account to the coaching site. Code: '+r.code);
$('#app').replaceChildren(h('main',{style:'max-width:420px;margin-top:8vh'},h('div',{class:'card'},h('h2',{},'Account created'),h('p',{},'You can use the site on this phone now. To log in from other devices, send this code to Abhi Sir.'),h('textarea',{rows:4,readonly:true},r.code),h('div',{class:'row'},h('a',{class:'btn',href:wa,target:'_blank'},'Send on WhatsApp'),h('button',{class:'alt',type:'button',onclick:done},'Continue')))));return}
if(await login(u.value,p.value))done();else msg.textContent='Wrong username or password.'}},
h('h2',{},up?'Create student account':'Log in'),up?name:'',u,p,h('label',{},show,' Show password'),h('br'),h('label',{},rm,' Remember my username'),msg,h('button',{type:'submit'},up?'Sign up':'Log in'),' ',
h('button',{type:'button',class:'alt',onclick:()=>loginView(!up)},up?'I have an account':'New student? Sign up'),
h('p',{class:'muted'},'Forgot your password? Ask Abhi Sir to reset it.'));
$('#app').replaceChildren(h('main',{style:'max-width:420px;margin-top:8vh'},LG,T,h('p',{class:'muted'},'Mock tests, quizzes, question papers and worked solutions.'),h('div',{class:'card'},f)))}
DB.init().then(boot);

// Shared helpers: formulas ($...$ via KaTeX), answer checking, labels
function rich(t){if(!t)return '';const d=h('span',{style:'white-space:pre-wrap'});
t.split(/(\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/).forEach(p=>{const m=p.match(/^\\\[([\s\S]+)\\\]$|^\\\(([\s\S]+)\\\)$|^\$\$([\s\S]+)\$\$$|^\$([^$\n]+)\$$/);
if(m&&window.katex){const e=m[1]||m[2]||m[3]||m[4],s=h('span');try{s.innerHTML=katex.renderToString(e,{throwOnError:false,displayMode:!!(m[1]||m[3])})}catch(x){s.textContent=p}d.append(s)}else d.append(p)});return d}
const TYPES={mcq:'MCQ (one correct)',multi:'Multiple correct',num:'Numerical answer',tf:'True / False'};
const isAns=a=>a!==null&&a!==undefined&&a!==''&&!(Array.isArray(a)&&!a.length);
function right(q,a){if(!isAns(a))return false;if(q.type==='multi')return Array.isArray(a)&&JSON.stringify([...a].sort())===JSON.stringify([...q.ans].sort());
if(q.type==='num'){const x=parseFloat(a),y=parseFloat(q.ans);return !isNaN(x)&&Math.abs(x-y)<=(+q.tol||0)+1e-9}return a===q.ans}
const corTxt=q=>q.type==='multi'?q.ans.map(i=>'ABCD'[i]).join(', '):q.type==='num'?String(q.ans)+(q.tol?' ± '+q.tol:''):q.type==='tf'?['True','False'][q.ans]:'ABCD'[q.ans];
const lab=(q,i)=>q.type==='tf'?'':'ABCD'[i]+'. ';
