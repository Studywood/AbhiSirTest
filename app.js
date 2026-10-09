const $=s=>document.querySelector(s);
function h(t,a={},...k){const e=document.createElement(t);for(const[n,v]of Object.entries(a)){if(n.startsWith('on'))e[n]=v;else if(n==='class')e.className=v;else if(v!==undefined&&v!==false)e.setAttribute(n,v)}
k.flat().forEach(c=>e.append(c instanceof Node?c:document.createTextNode(c??'')));return e}
const pic=b=>b?h('img',{class:'q',src:typeof b==='string'?b:URL.createObjectURL(b)}):'';
let timer=null;
function shell(title,cls,body){clearInterval(timer);const s=Session.get();
$('#app').replaceChildren(h('header',{class:cls},h('b',{},title),h('span',{},s.name),h('button',{class:'alt',onclick:()=>{Session.clear();boot()}},'Log out')),body)}
function boot(){const s=Session.get();if(s)return s.role==='admin'?adminView():studentView();loginView()}
function loginView(){const msg=h('p',{class:'err'});
const u=h('input',{placeholder:'Username',autocomplete:'username',required:true,value:localStorage.getItem('rememberUser')||''});
const p=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password',required:true});
const rm=h('input',{type:'checkbox'});rm.checked=!!localStorage.getItem('rememberUser');
const show=h('input',{type:'checkbox',onchange:()=>p.type=show.checked?'text':'password'});
const f=h('form',{onsubmit:async e=>{e.preventDefault();msg.textContent='';
if(await login(u.value,p.value)){rm.checked?localStorage.setItem('rememberUser',u.value.trim()):localStorage.removeItem('rememberUser');boot()}else msg.textContent='Wrong username or password.'}},
h('h2',{},'Log in'),u,p,h('label',{},show,' Show password'),h('br'),h('label',{},rm,' Remember my username'),msg,h('button',{type:'submit'},'Log in'),
h('p',{class:'muted'},'Accounts are created by Abhi Sir. Forgot your password? Ask him to reset it.'));
$('#app').replaceChildren(h('main',{style:'max-width:420px;margin-top:8vh'},h('h1',{},'Abhi Sir Classes'),h('p',{class:'muted'},'Mock tests, question papers and worked solutions.'),h('div',{class:'card'},f)))}
DB.init().then(boot);
