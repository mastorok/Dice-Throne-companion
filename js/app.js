const rack=document.getElementById('rack'), grid=document.getElementById('grid');
const count=document.getElementById('count'), reset=document.getElementById('reset');
const empty=document.getElementById('empty'), detail=document.getElementById('detail');
const browse=document.getElementById('browse'), rail=document.getElementById('rail');
const stage=document.getElementById('stage'), slides=document.getElementById('slides');
const caption=document.getElementById('caption'), panelbody=document.getElementById('panelbody');
const dname=document.getElementById('dname'), dmeta=document.getElementById('dmeta');
const dplate=document.getElementById('dplate');
const ddice=document.getElementById('ddice'), s1=document.getElementById('s1'), s2=document.getElementById('s2');
const FADE=250, SLIDE=520, ENTER=120, MORPH=560, SWIPE=440, TXT=180;
const SLOW='cubic-bezier(0.78,0,0.3,1.18)', MO='cubic-bezier(0.6,0.02,0.2,1)';
// arrondi : départ très lent à l'ouverture, rattrapage rapide à la fermeture
const RIN='cubic-bezier(0.92,0,0.32,1)', ROUT='cubic-bezier(0.22,0.72,0.3,1)';
const still=window.matchMedia('(prefers-reduced-motion: reduce)');
/* ---------- animations « de repos » (reflets, paillettes, lueurs…) : interrupteur global ----------
   Les animations CSS infinies sont mises à zéro itération (la page retrouve son état de repos) ;
   les boucles canvas (braises, paillettes, feux d'artifice) vérifient IDLE.off avant de démarrer. */
const IDLE={off:false,list:[],names:new Set(),keep:'.die.roll,.nh-reset.spin'};
try{ const sv=localStorage.getItem('dtdb.noidle'); IDLE.off= sv===null ? still.matches : sv==='1'; }catch(e){ IDLE.off=still.matches; }
function idleSweep(){
  if(!document.getAnimations) return;
  document.getAnimations().forEach(a=>{
    try{
      const ef=a.effect; if(!ef||a.idleKilled||a.animationName===undefined) return;
      const t=ef.target; if(t&&t.closest&&t.closest(IDLE.keep)) return;
      if(ef.getTiming().iterations!==Infinity) return;
      ef.updateTiming({iterations:0}); a.idleKilled=true; IDLE.list.push(a); IDLE.names.add(a.animationName);
    }catch(_){}
  });
}
function idleResume(){
  IDLE.list.forEach(a=>{ try{ const ef=a.effect; if(!ef||!ef.target||!ef.target.isConnected||a.playState==='idle') return;
    ef.updateTiming({iterations:Infinity}); a.idleKilled=false; a.currentTime=0; a.play(); }catch(_){} });
  IDLE.list=[];
}
(function(){
  let q=false;
  addEventListener('animationstart',()=>{ if(!IDLE.off||q) return; q=true; Promise.resolve().then(()=>{ q=false; idleSweep(); }); },true);
  addEventListener('animationend',e=>{ if(IDLE.names.has(e.animationName)&&e.elapsedTime===0) e.stopImmediatePropagation(); },true);
})();
document.body.classList.toggle('noidle',IDLE.off);
function idleUi(){
  const b=document.getElementById('idlebtn'); if(!b) return;
  b.setAttribute('aria-pressed',IDLE.off?'false':'true');
  const t=IDLE.off?UI('idle:off','Animations désactivées — cliquer pour les réactiver'):UI('idle:on','Animations activées — cliquer pour figer la page');
  b.title=t; b.setAttribute('aria-label',t);
}
function idleSet(off){
  IDLE.off=off; document.body.classList.toggle('noidle',off);
  try{ localStorage.setItem('dtdb.noidle',off?'1':'0'); }catch(e){}
  try{
    if(off){
      idleSweep();
      if(typeof EMB!=='undefined'&&EMB.running()) EMB.stop();
      [typeof tourBrFx!=='undefined'?tourBrFx:null, typeof tourPanelFx!=='undefined'?tourPanelFx:null, typeof tourVicFx!=='undefined'?tourVicFx:null, typeof tourVicSp!=='undefined'?tourVicSp:null].forEach(f=>{ if(f&&f.stop) f.stop(); });
    } else {
      idleResume();
      if(typeof naraOpen!=='undefined'&&naraOpen&&typeof EMB!=='undefined') EMB.start();
      if(typeof tourIsOpen!=='undefined'&&tourIsOpen&&tourS.phase==='run') tourBracketSparks();
    }
  }catch(e){}
  idleUi();
}
if(IDLE.off){ idleSweep(); addEventListener('load',idleSweep); }
const active=new Set(), timers=new Map();
const sets=new Set();        // collections retenues
const off=new Set();         // heros exclus a la main
const drawn=new Set();       // deja tires dans cette session
let current=null, busy=false, qty=1, picking=false;

for(let i=1;i<=6;i++){
  const b=document.createElement('button');
  b.className='slot'; b.dataset.level=i; b.setAttribute('aria-pressed','false');
  b.setAttribute('aria-label','Complexité '+i);
  b.innerHTML='<span class="face"><img class="rest" src="'+DICE[i+'-normal']+'" alt="">'+
              '<img class="lit" src="'+DICE[i+'-highlight']+'" alt=""></span>';
  rack.appendChild(b);
}
H.forEach(h=>{
  const li=document.createElement('li');
  li.className='hero'; li.dataset.level=h.complexity; li.dataset.id=h.id;
  li.dataset.set=h.set; li.dataset.state='in';
  li.innerHTML='<button class="hero-btn"><span class="disc"><img src="'+h.icon+'" alt=""></span>'+
               '<span class="nm">'+h.name+'</span></button><span class="pick">✓</span>';
  li.querySelector('button').setAttribute('aria-label',h.name+', complexité '+h.complexity);
  grid.appendChild(li);
  const b=document.createElement('button');
  b.dataset.id=h.id; b.dataset.k='hero'; b.title=h.name; b.setAttribute('aria-label',h.name);
  b.innerHTML='<img src="'+h.icon+'" alt="">';
  rail.appendChild(b);
});
const cards=[...grid.querySelectorAll('.hero')];
/* héros annoncés : section à part (hors tirage, tournoi, feuilles DTA) en attendant leurs données */
const soonGrid=document.getElementById('soongrid');
SOON.forEach(h=>{
  const li=document.createElement('li');
  li.className='hero soonli'; li.dataset.id=h.id; li.dataset.set=h.set; li.dataset.state='in';
  li.innerHTML='<button class="hero-btn"><span class="disc"><img src="'+h.icon+'" alt=""></span><span class="nm"></span><span class="kk" data-i18n="soon.tag">À venir</span></button>';
  li.querySelector('.nm').textContent=h.name;
  li.querySelector('button').setAttribute('aria-label',h.name);
  soonGrid.appendChild(li);
  const b=document.createElement('button');
  b.dataset.id=h.id; b.dataset.k='hero'; b.title=h.name; b.setAttribute('aria-label',h.name);
  b.innerHTML='<img src="'+h.icon+'" alt="">'; rail.appendChild(b);
});
document.getElementById('soon').hidden=!SOON.length;
soonGrid.addEventListener('click',e=>{ const li=e.target.closest('.hero'); if(li) open(li.dataset.id); });

/* ---------- filtre ---------- */
function clearLeave(el){
  if(timers.has(el)){clearTimeout(timers.get(el));timers.delete(el);}
  el.classList.remove('leaving');
  el.style.position=el.style.left=el.style.top=el.style.width='';
}
function legend(n){
  empty.hidden=n>0; reset.hidden=active.size===0;
  count.innerHTML=active.size===0?'<b>'+cards.length+'</b> '+UIs('cnt:all','héros, tous niveaux')+'.'
    :'<b>'+n+'</b> '+UIs('cnt:lvl','héros — niveau')+' '+[...active].sort().join(', ')+'.';
}
function keep(c){
  if(active.size && !active.has(c.dataset.level)) return false;
  if(sets.size && !sets.has(c.dataset.set)) return false;
  return true;
}
function apply(){
  const want=new Map(cards.map(c=>[c,keep(c)]));
  legend([...want.values()].filter(Boolean).length); poolInfo();
  if(still.matches){cards.forEach(c=>{clearLeave(c);c.classList.toggle('hidden',!want.get(c));
    c.dataset.state=want.get(c)?'in':'out';c.style.opacity='';});return;}
  const box=grid.getBoundingClientRect(), first=new Map();
  cards.forEach(c=>{if(c.dataset.state==='in'&&!c.classList.contains('leaving'))
    first.set(c,c.getBoundingClientRect());});
  const stay=[],enter=[];
  cards.forEach(c=>{
    const w=want.get(c);
    if(c.dataset.state==='in'&&!w){
      const r=first.get(c);
      c.dataset.state='out'; c.classList.add('leaving'); c.style.position='absolute';
      c.style.left=(r.left-box.left)+'px'; c.style.top=(r.top-box.top)+'px';
      c.style.width=r.width+'px'; c.style.transition='opacity '+FADE+'ms linear';
      requestAnimationFrame(()=>{c.style.opacity='0';});
      timers.set(c,setTimeout(()=>{timers.delete(c);c.classList.remove('leaving');
        c.style.position=c.style.left=c.style.top=c.style.width='';
        c.style.transition=''; c.classList.add('hidden');},FADE));
    } else if(c.dataset.state==='out'&&w){
      clearLeave(c); c.classList.remove('hidden');
      c.style.transition='none'; c.style.opacity='0'; c.dataset.state='in'; enter.push(c);
    } else if(w&&first.has(c)) stay.push(c);
  });
  const last=new Map(); stay.forEach(c=>last.set(c,c.getBoundingClientRect()));
  stay.forEach(c=>{const a=first.get(c),b=last.get(c);
    const dx=a.left-b.left,dy=a.top-b.top; if(!dx&&!dy)return;
    c.style.transition='none'; c.style.transform='translate('+dx+'px,'+dy+'px)';});
  requestAnimationFrame(()=>{
    stay.forEach(c=>{c.style.transition='transform '+SLIDE+'ms '+SLOW;c.style.transform='';});
    enter.forEach(c=>{c.style.transition='opacity '+FADE+'ms linear '+ENTER+'ms';c.style.opacity='1';});
  });
}
rack.addEventListener('click',e=>{const s=e.target.closest('.slot'); if(!s)return;
  const l=s.dataset.level; active.has(l)?active.delete(l):active.add(l);
  s.setAttribute('aria-pressed',active.has(l)?'true':'false'); apply();});
reset.addEventListener('click',()=>{active.clear();
  rack.querySelectorAll('.slot').forEach(s=>s.setAttribute('aria-pressed','false')); apply();});

/* ---------- contenu de la fiche ---------- */
/* ---------- contenu de la fiche : règles du héros + statuts ---------- */
const KIND={positive:'Positive',negative:'Negative',unique:'Unique',companion:'Companion',marker:'Marker'};
function mk(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
/* minerais : colorie Gold / Diamond / Ultimanium dans les zones concernées */
const GEM_SPLIT=/\b(Gold|Diamond|Ultimanium)\b/, GEMCLS={Gold:'mg-gold',Diamond:'mg-dia',Ultimanium:'mg-ulti'};
function tintGems(root){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){ if(GEM_SPLIT.test(n.nodeValue)&&!(n.parentNode.classList&&n.parentNode.classList.contains('mg'))) hits.push(n); }
  hits.forEach(n=>{
    const f=document.createDocumentFragment();
    n.nodeValue.split(/\b(Gold|Diamond|Ultimanium)\b/).forEach((p,i)=>{
      if(i%2){const sp=document.createElement('span'); sp.className='mg '+GEMCLS[p]; sp.textContent=p; f.appendChild(sp);}
      else if(p) f.appendChild(document.createTextNode(p));
    });
    n.parentNode.replaceChild(f,n);
  });
}
function armLines(lv){
  const box=document.createElement('div'); box.className='armlv';
  lv.forEach(g=>{
    const grp=document.createElement('div'); grp.className='armgrp';
    const h=document.createElement('div'); h.className='armh'; h.textContent=g.h+' :'; grp.appendChild(h);
    g.r.forEach(r=>{
      const row=document.createElement('div'); row.className='armrow';
      const k=document.createElement('span'); k.className='armk'; k.textContent=r[0];
      const v=document.createElement('span'); v.textContent=': '+r[1];
      row.appendChild(k); row.appendChild(v); grp.appendChild(row);
    });
    box.appendChild(grp);
  });
  tintGems(box); tintDmg(box); tintHeal(box); return box;
}
function tintForge(h){
  if(h.id==='forgemaster') tintGems(s1);
  s2.querySelectorAll('.tok[data-tid="armor"],.tok[data-tid="ore"]').forEach(tintGems);
}
const UNDEAD_SPLIT=/\b(Skeletal Warrior|Skeletal Mage|Bone Golem)\b/, UNDEADCLS={'Skeletal Warrior':'ud-warrior','Skeletal Mage':'ud-mage','Bone Golem':'ud-golem'};
function tintUndeadNames(root){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){ if(UNDEAD_SPLIT.test(n.nodeValue)&&!(n.parentNode.classList&&n.parentNode.classList.contains('ud'))) hits.push(n); }
  hits.forEach(n=>{
    const f=document.createDocumentFragment();
    n.nodeValue.split(/\b(Skeletal Warrior|Skeletal Mage|Bone Golem)\b/).forEach((p,i)=>{
      if(i%2){const sp=document.createElement('span'); sp.className='ud '+UNDEADCLS[p]; sp.textContent=p; f.appendChild(sp);}
      else if(p) f.appendChild(document.createTextNode(p));
    });
    n.parentNode.replaceChild(f,n);
  });
}
function tintUndead(h){
  if(h.id!=='necromancer') return;
  s2.querySelectorAll('.tok[data-tid="corpse"],.tok[data-tid="undead"]').forEach(tintUndeadNames);
}
function linkToks(root,ids,selfId){
  const cand=(ids||[]).filter(id=>TK[id]&&id!=='vaults').map(id=>({id,name:trTokName(id,TK[id])})).filter(x=>x.name).sort((a,b)=>b.name.length-a.name.length);
  if(!cand.length) return;
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const base=n=>n.endsWith('s')?n.slice(0,-1):n;
  const byName={}; cand.forEach(c=>{const b=base(c.name); byName[c.name]=c.id; byName[b]=c.id; byName[b+'s']=c.id;});
  const re=new RegExp('\\b('+cand.map(c=>esc(base(c.name))).join('|')+')s?\\b','g');
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){
    const par=n.parentNode; if(par&&par.closest&&par.closest('.toklink,.tokname,.tokbtn,.tagwrap,.dface')) continue;
    re.lastIndex=0; if(re.test(n.nodeValue)) hits.push(n);
  }
  hits.forEach(n=>{
    const txt=n.nodeValue, f=document.createDocumentFragment(); let last=0,m; re.lastIndex=0;
    while((m=re.exec(txt))){
      if(m.index>last) f.appendChild(document.createTextNode(txt.slice(last,m.index)));
      const full=m[0], id=byName[full]||byName[full.replace(/s$/,'')];
      if(!id){ f.appendChild(document.createTextNode(full)); last=m.index+full.length; continue; }
      const t=TK[id], btn=document.createElement('button'); btn.type='button'; btn.className='toklink';
      btn.setAttribute('aria-label',UI('lbl:opentoken','Voir le jeton')+' '+trTokName(id,t));
      const im=document.createElement('img'); im.src=t.icon; im.alt='';
      btn.appendChild(im); btn.appendChild(document.createTextNode(full));
      btn.addEventListener('click',ev=>{ev.stopPropagation(); openTok(id,im);});
      f.appendChild(btn);
      last=m.index+full.length;
    }
    if(last<txt.length) f.appendChild(document.createTextNode(txt.slice(last)));
    n.parentNode.replaceChild(f,n);
  });
}
function linkHeroToks(h){
  const ids=(h.tokens||[]).filter(id=>TK[id]); if(!ids.length) return;
  linkToks(s1,ids,null);
  s2.querySelectorAll('.tok').forEach(row=>{ const p=row.querySelector('.tokdesc'); if(p) linkToks(p,ids,row.dataset.tid); const nl=row.querySelector('.foldwrap ul'); if(nl) linkToks(nl,ids,row.dataset.tid); });
}
function renderTokDesc(el,id,txt){
  el.textContent='';
  const lines=(txt||'').split('\n');
  if(id==='footwork'&&lines.length===7){
    el.appendChild(document.createTextNode(lines[0]));
    const track=document.createElement('div'); track.className='fw-track';
    for(let i=1;i<=5;i++){
      const row=document.createElement('div'); row.className='fw-row';
      const dot=document.createElement('span'); dot.className='fw-dot'; dot.setAttribute('aria-hidden','true');
      row.appendChild(dot); row.appendChild(document.createTextNode(lines[i]));
      track.appendChild(row);
    }
    el.appendChild(track);
    el.appendChild(document.createTextNode(lines[6]));
  } else { el.textContent=txt||''; }
}
const CRAFT_ICN={
  'gold-ore':'data:image/webp;base64,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',
  'diamond-ore':'data:image/webp;base64,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',
  'ultimanium-ore':'data:image/webp;base64,UklGRowUAABXRUJQVlA4WAoAAAAQAAAAlQAAfAAAQUxQSAYFAAABoEXbtmnHWnFStm1Fz7Zt27Zt2y8o27Zt27ajqnvOXvPj7nuwcb4jYgJI/7wBb9eh6PlgBbDrr5YRI/13SDfVjxQdliLhlGoR4p6j8DihamT4Ht5nVIoG1cfA77QGUSB/Jfyvbm6/m0oR5JbOtntTINhD11gtqycAcBDgByxWaybCfMtaeesQ7n+pdnrQQdizqtnoAyg4r451UgsRzyFhTk3LVJsGRdd0jOtw64/PW+Hs9VD2wNtP/jz9BIBXLXBFCXS8y3gPn4LqzAA2VDPch1CfEf+b2QqgtJDIRY7Bqo5CQlaCvWFairFaLofWH5sqexOCZyXcK8x0zSFozYydjU10WwzBsxIQjN4GehphqiKA943zLsJkKOoyxFWG+QohMkMZF9hQzyi/IBTIOTyOMTDEJAUIkxOwAnBcAF8ZI6kPQmSGysIBwNeYohjGgCMA7GtuhLS+MKjrAMD4JBMMglEdBoBfDdAbqjIn4JDcODypW/pAhMnehJAwI1x2JKfO1St5KMJkHwxFXRGHtXV1Sh6AcKCFcCQYrVFyf4TJ0NVlCX7WZwDCZKENEuBxXbohRHGaoa8rZCfP1KMnwiwpQ6CsCMeEBBtq6tANYYoYB8EOVBWuDMM1KIBf9hYow3WVAVyW4D3liqG6I0QMCnMC3KpYN3hmJVxxSqgEZtnB9kr9B8+sBoQLtVlIMDVVoa7wyMxQUzBUd2IS/KtOXyQWQsDcMSHB26oUQy6EYBg9AR5Soyek7LoMS4oXVOgLqRACFn03vD6IZ2ZYkDkR/k0NJ6U/4hn2XX1PaghpI2BTdtgLUBRc5jDY1XXYE24Iqtp42JaFt2UZwdSeDBMyKwWwJ7wWzE8wA8Csks9DHQO51gxSBrMWWFsnCCowh8bz/xs57WpflztGY1YifmsdP9TbJCzYj8rjfXWsMIpwXVewFvjBD31nEADMwnGFYA3wjJ/m+40iFULoUHKWD3rHPLququWj8rqIgJ4+6LWogPd8pM6JCny1N7rSVkL4wd5m3qjIUq7rC9NSvGUftVOgf3qjDyIDnvBGIyKDe6m3ZnujAtbX8UQPRQYM8EZTIgNe9DYkOhxt4+nO6IBJntKXmoW12uaJHokO73lLm2YUva/yRrXWRIS5WT7orMORYGpN8n1LFBiTQQF+FVf+8gXFMWvNzaJA5wPltxPRVaWWmluNgj0PuJnirzxqpdl1KeCkv14k+dWnLbSiBin4iH1WNSIl/7TNomakZvJUuxxuQ6rmCiuU7d69Yf6ceTOuJnV/S3Rs5sDn3nXN1D+/XoN0UrzJLonzTLMUIrrzlIm+IS1/lOyqTNKrTpmnmPRsXAKcLsihhHcbZ1aGJvQLZuWS1w8Mc6Ad6dr6qzrkOWWYUZzryJhpI0zyEhk06zfHGD3IrNkLZeOy1+m1rKphiF4tBbCkDp27S6eDOWTe83cD5xJRy6XAkfnry7S4iUzcZEEBxT8EPEWZLZ78+v9Nqr1HZs6sLKGZm0he48pvlzgKFZHhW16QgIiSz/12hSrj00znO+3Mb9bGFFhbh+ybdPGfW8IqOZvsXP2KbnsCmVe8uDTuLrJ3lduKTvpaVIuoCMAHZPeztnvbcldNIvoZGEy277TN010U/z+WVLYenV3iYQJJC5FNEfCORKdyZO3yKBJ+luA3ipapUyVudsSg7KNxv1Lk/CTuseiRuQpYQRH0duDKKJI2+EtSHlZQOCAKDwAAEDsAnQEqlgB9AD6ROJZIJaMiITE3GwCwEgloAMdqRlx+h3rD6OV3bvv0vmS/Gd9X0Y7drzH+ez6Mv+1vn3RWerV/jukA//+wd/03t6/w/5Cedvm0+Zyr+g/Jf5TagXsLet7W+gR3l8+Oan976gHBeUBPE2z2/Uv7SfAd/Ov7v6ZXsb/cj2Uf24b0gchT+RBVt1QYO/NXzhvL+XPxB9mvgZuPGAaj6RYSgVvX0Ji2qhg82EXCxtATv9JeF3rX8GTC8d3tYIYjzq59ASImo0fZbwuPFagk/EtQinR/0PaJhzciKIyMcisiyn24I9mkXRp/SFsSYrILjMsy3BW0iu3iO6cF5bE/dtWMV7DzbPIhJ/tQ585j055b08b1DjIPlIUfaNKjt6H/5YtXUJi2+fPRoH3dC4ThT6KmTcCvebyw624ljIkiYnR4TBhUhSQbWVZWF1Rro2l9gh31Q1xyshOfHTVbdcDpoJEa+DaLeGyyGsCwnf4+FYI+iMgcqyQ2HBJSKoGyhRry7qPeSIiisek+pcOBSu1fqo5zp/1XXeVrJ0mG9m27QIvFOQmNWotDoN+8pJYcJgmt7QSp56hufrxBZE5okxFK7zuBA3J/cyvtcV/FKC12ZZOqwYYj0fSN2zPMCAD+/WOWNKF/AB4fPQUzXdHQIgFy0JVjKuGUlPua4F2bM3ko3Jf1C1UOc5OinL/SWefXkp7szxm9uNcsr4r43YTmvWpA/sZLspTJznhX0hyn1KjSV3R4jNNPi4DS3Viy8c/7cGIGAPhMjX41vRlSsjj0QnK3Wtvumcv1p/h9NBMmj93uGJIV22oYxjhD/CjiQthBVmbK3xNwwXGJz6zrcVBUrbL/ckYgyXLboWuwQmbugL5kSQAOcGJV2zBRcuO6Qirt0B5FJWpZ44ImWkgATP0RzEZPayBkhf0EO33pFmcFH/Lmobz8oaEPYXKEYemhqrPckyLsY2UaI2yVERbCtgAdULAGA4MJIQWPCkm8js9rFunFWgptCYC/g1n1ljSbKzL3NramJSKI4ukKCs1k0SHYykhLhO/l6nyKiCMEa2VBbEVeIF/93NfVrlfBu1E3/HGG1vEJEVgRbJVqI0bujVsU0Juacw8ayhtuc1/N/gx87+vDfNWuS7vl9ndzSAPUeF/CYR3j5WT61QVRo+4YEUSDtIe5PX26P5GSPi2+9GIjW4PZn48g5I9nF8+9w3neOlnFz3kmmzvzEB4llR67mxrZW+7+NCH4HGqVTw0DbWpMJXB8ePkbvS+DN2Cn/B3HSU5q2dDIMgJNRQUjdGuN+URTk4Vk4ChzGd7Xgoh3d8ADeGh9nX5r5zLn+b4UTvYn36vE53mvpX6TCaMWI0EwIzqVRB2grJRDl4rutqG1Dvi9QXCNmKytVi9osfNGW/0Zy//7K4TgYj3bdja21BaZeW3Le1eki9rC5O6C+7qmnq7GwDjVnnSDXO8yrOodnWn24aFk1+xWOmQaBtOCJFKgEwOusnlldjg8PQVsKNCbKRxb/yM1lj/6tz/v0VsJ+bVG3AIQo9Bu55YlSL/0SZMrhmgwyjY4FQ0miQ7PJZXE4qdrCqVyPPNG1rGrJZCE8+JtFWWT6aRxISHZoL6vrIxWAyCtvOOnBU3EmbZ29B0BMEXQoMD35XftmcsuIMzLcWDQwaay2rf3J7y68OyMkNEO46DlQ4OFgrqJ9IfcRU9ZB2ih9gu3JwsMZ68FfCC5TC0uw/dS5eKaG0xf2WBSK3I6nZdeVT97TRbnSK2a4zMZSi6BQPw6i+biSMi8x/+PYxhgTe1lXwgHu0ODY9UiLeecGJdd6cHizN3/jkjJFeb1qpfwAeXs0IVk7UUYAmEHZ9oNYB9ocuxVXEmGOrdm9O9fuZPLYgCxMER5kOWeP8LxeIb0neqgKzcPDBqbmlhOmt9XvOCR+C/GuKf9VQrkFbNYP0qHV3P66k1KlNPf9cvmC570h6F0GWiKRH5WpA0tx2h2B4bLC7Ik+c53z5MIEjmCEZaBhlpoqqEaRyZhGwuKDUjidE8TrcpS9R4YlgWayxineHbBvQOjR6YWrjV151AMC1gZRzPNzQYkAgseDtCCfddhjna2oxLeHpazMkMz7kto8fCnPWNSi700J6eVEgHNOSN7P3KfhXvQ2qkzc0/dIU4m2qtl2wFQ2NBi82F08ZYlc24LpxhJ3fMuBf9SI3qtcBqVLriwxvLdiJROR7QLGILjDR3DvJC14bjVWET4yjCkfX/5ibA/rca1kYzCFydkG01tcEpIWEer6Schh3LghnC3Ud0ORCxI/PUccOCIW9tZ6Ar9i9TVY5uv+ajBmZ673ILrGiDTNXsM5Uilrt7S7AwjEUM1rlXEHGgZnTQlecESIPgl7vRO62y38gqGyDWu/YfhEowftUMRcATr5E5DXlvu+n7wT67Nl4oB+rp1CnqdLly4n6MR16ZBLHs3Dh5KD1/DY1Mqlg5I2WRc8IhHhLDpdV+HANN0HNbHl4W0onhiCT2dMP5dMcaKamcCvRJEyNn+RkasC+NONDsyPA/UR/TBwAPTSlNX2LgXf7ktRp+N6qAqVnI7Q2YEYAovkTv6pQNiB+a/mtayPrfGvYwc78BKLQKjdg5R02ejGMwNli1QKnaD4PFwVRWYvc0RAWjJ5b5ePwdauDN8gvjIp0lnPc+Ap5Zc/OEoAZR+ii9xbADsumpM2YE3UQp7L7z/vAQRUV4ax3KKAnugliwOrtC0cCu9YrDuhv33SqL2JWkezyrB0+NB/k1b72UylZuhiErjCkEb0Km3YAhlxmmzJUNYJ6a99ayYtS9UQ0ejTZ+HFxAEkNhKtDltzsv7H6gvKq80UqlDzKLlYPJeulgK+iFnngYNSR1UKo7J1CXiirRfJtR5D+djeTy+RKBUWMsKFtz6SJpU4OkbJC7RBa8sd+Ye4p462SkcaJl808gYDXVe4Eo4RcYvNpcmyD0iMiRgpUbwiVNpJq6g2icCYuVbxdayBEfwoY+6P/hWgq5bZkrxixk44Nx66W1Ef7nnPqnareTAuGixEx2LTy1DV0FN0xx4HSjCq5vjbARkBFgLvO2XjHCo1fPsW2XI5Ic3hmBG+KRJYCTOY8gCa41NcuoObQx5pRbV1xGIcZxtm8z3PlBEmFvo9fQ2JGORMqrBOq88ZQtKKia1OqeBs0m0F+0e1JNnIdq1Rko/QbHJOS9KZjVEI7iH+RavTgbZdIUNLDAlmEENDehqcWM/uu0Mxc0ErPP/OuyKmZWlxprGQCdPLhcjr61dkqItuOBUYtF5DOF63kmpXIGlgdBl9Kz3436ahIgkk6+SfOC+5KMZTEH7ifoxg4dwDUx7i6wNKCNVzACBZgIJvk9Rd7JkeUtT2pLRPZ9ol9rdkNy2CRtQPkA24lPtRMGQeTo+74IAeZEkeu3/Jg0jkDftKsqGw2+4DUi93rSf5rckYN9clkgTOmM77Ki8JbBJbFyBOtdeiXNxZzFxtBl1kuO2j4SjXQDgu0cheFqQu+L2aDrFCs/uLRZseeY0ecZtka99/OuVApR6w1KEyy55D6a5bWQrZPVbV1OZsIhleG8miY4+KikxidvTFzBZlbChghRJqhjLylv4FGCmojeU6eCkPd8Q0gwc/gQ/Wj4K94MCrl1+5IKsyEuEP0+r8OcBPJtVZ0cCyEQQCaF3Bk0b91uxjv1tAH6jiWkbYJPeKMLY4bt5Yjfg3r9vGZEjeIrLlxqq80HAvK0TnoCIEPeYpyq2Sp0pdUO5VNMrabKIiwGuwuWKw2EcsEKjIRpJBkqU0S+njTn+CL24AWlHLWQvx6eqifXbulkZCJKlaqj7b7msxfK2sBzDkfQZsRDcOMN9/RpCp2WH0Pam0zTBPhN51lsJcrDbiIDbM3H7HTMrMHr91kciYP0biRormM+jRIugUM2BAyo1M6ZxgMgYmvo4aicvP1hX4V4gLRRTdeDhwwqIjK0b38RBuysJ1sFV9VLdFq0XGZ8DlGGZaU23noZPdTuXQe4+ZvOK5IZqTGojIWd1Eko7eGgdF2s13M/cH3qIpOKnRmVCBhLMlOyX8yuwaLGju4zFR7WfItzxBNTYySHlP9voBMgo+/2N0uq4VUMxfxxQDBdclR/zaOEpux4l/In/Qu364aAc8f9VFG7XAC+xeg/c2Y2oRr3n7PfJamykFm73Fvw/Ajh/+5qlfezQMj2fh6/Oxsk/k3XB5HFq+r8Bi1svE65RpaLSEv9+gXE3Qd+Kk1aViJiK/Idqf8HgKb5/6dMnylnSN3sskngnyI5juj9ovwLCkIwoNFiCUBAcNcupwyiJyZsvSEtg/GurX+1T0fABxgmor521NG/7umVBCiZNYdq+clJhte9jAx5ea++hjgMhGTrhboOc+HzlonVvi7/XKr4eX9qYrlP3eDFIBQG9LttlWCgtY3JlR6dgS9KB9BXfv91eTGZZ6Go8KlLsbD7xWEMO20BQ+m7ZN03j41/okxIXbE1GUDoaSJNePI+uSEuo0r7lN38M5YaYJGmZxJxjb7/zod7xftIrfPT1tgvUnInqT42UDZbOSWGtvw+s1Fo0DztA89bmVY6FxZK7XDmJWsylghS0Qn8T5QDx6UKw7FNBDoW7NrzUAGC+N4nOvD0dYO515kYWOlxT5kmxyM1Tb2uSeOSxRp0eUXFmJDyYwQmpcEm9Q00PUYdvc5Zosp6TW9nyKHiIpsBoSZwcj0EXRukNYEAkOnbSsP78s1ZHyJ96AWX2XaXFHjeGNUoP7909bRvlskSR0d2HDnktXtJyTbrEPL+y1DWiPkJBosZ5wGYYd5YU/6fvXK0eL4mNA9PrDdKMQJTocThpA/OSzmgWrUcDO0Yy8PEnXKP+GFLs7/6YSl2+5pSyKAvD6rTrqW5Ft/BGnIo63ns/rAMUj1eROax5SZif52OXAqKFy6mym9RJCL6bcIj4v1E6pfzADChZL7ILxLUUYDoJflRXQ/W2GzK11G+2OOtZk8kQMLrigp7TZsMFbLPlwQdHb0yxPdxYM8d9MpsUSEdrWpq/MoxQfUq9BuG21/kzLGdcZK7uWOhvnJiSMh/DmMocahHeJfrG0v/z+tleYIzr+8B9Fi4RfbFGGvc5K6IvbadHIUxIncADsrzytVbNhMfCgWyaVwAVNgAAAFBTQUlOAAAAOEJJTQPtAAAAAAAQAZAAAAABAAEBkAAAAAEAAThCSU0EKAAAAAAADAAAAAI/8AAAAAAAADhCSU0EQwAAAAAADlBiZVcBEAAGAEsAAAAA',
  'gold-helmet':'data:image/webp;base64,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',
  'diamond-helmet':'data:image/webp;base64,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',
  'ultimanium-helmet':'data:image/webp;base64,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',
  'gold-shield':'data:image/webp;base64,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',
  'diamond-shield':'data:image/webp;base64,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',
  'ultimanium-shield':'data:image/webp;base64,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'
};
function craftTier(iconKey,label){
  const d=document.createElement('div'); d.className='crafttier';
  const im=document.createElement('img'); im.src=CRAFT_ICN[iconKey]; im.alt=''; d.appendChild(im);
  d.appendChild(mk('span',null,label));
  return d;
}
function craftArrow(iconKey,qty){
  const d=document.createElement('div'); d.className='craftarrow';
  const b=document.createElement('b'); b.textContent='+'+qty+' '; d.appendChild(b);
  const im=document.createElement('img'); im.src=CRAFT_ICN[iconKey]; im.alt=''; d.appendChild(im);
  d.appendChild(document.createTextNode(' \u2192'));
  return d;
}
function craftRow(piece){
  const row=document.createElement('div'); row.className='craftrow';
  row.appendChild(craftTier('gold-'+piece,'Gold'));
  row.appendChild(craftArrow('diamond-ore',2));
  row.appendChild(craftTier('diamond-'+piece,'Diamond'));
  row.appendChild(craftArrow('ultimanium-ore',1));
  row.appendChild(craftTier('ultimanium-'+piece,'Ultimanium'));
  return row;
}
function armorCraftBlock(){
  const wrap=document.createElement('div'); wrap.className='craftwrap';
  wrap.appendChild(mk('h4',null,UI('lbl:craft','Craft')));
  wrap.appendChild(mk('div','craftlabel','Helmet'));
  wrap.appendChild(craftRow('helmet'));
  wrap.appendChild(mk('div','craftlabel','Shield'));
  wrap.appendChild(craftRow('shield'));
  wrap.appendChild(mk('p','craftnote',UI('lbl:craftnote','Craft en Main Phase : les ORE du Blueprint doivent être sur The Forge (+ la pièce du palier précédent sur un Hero Board pour Diamond/Ultimanium).')));
  return wrap;
}
function mkFold(label,list){
  const f=mk('div','fold'),b=mk('button','foldbtn'),body=mk('div','foldbody'),inner=mk('div');
  b.type='button';b.setAttribute('aria-expanded','false');
  b.appendChild(mk('span',null,label));b.appendChild(document.createElement('i'));
  inner.appendChild(list);body.appendChild(inner);body.inert=true;
  b.addEventListener('click',()=>{const o=!f.classList.contains('open');f.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false');body.inert=!o;});
  f.appendChild(b);f.appendChild(body);return f;
}
const TG=DATA.tagdefs||{};
function tagZone(h){
  const wrap=mk('div','tagwrap'),row=mk('div','tags'),pop=mk('div','tagpop'),inner=mk('div','tagpop-in');
  h.tags.forEach(id=>{const d=TG[id];if(!d)return;const b=mk('button','tag',trTag(id,d.label));b.type='button';b.dataset.tag=id;b.setAttribute('aria-pressed','false');row.appendChild(b);});
  pop.appendChild(inner);pop.inert=true;wrap.appendChild(row);wrap.appendChild(pop);return wrap;
}
function renderSheet(h){
  const T=DATA.tokens||{};
  s1.innerHTML='';s1.className='sheet';
  const bio=tr('hero:'+h.id+':bio',h.bio||h.desc); if(bio) s1.appendChild(mk('p','bio',bio));
  if(h.tags&&h.tags.length) s1.appendChild(tagZone(h));
  if(h.weapon){const p=mk('p','weapon');p.appendChild(mk('b',null,UI('lbl:weapon','Arme')));
    p.appendChild(document.createTextNode(' · '+h.weapon));s1.appendChild(p);}
  if(h.faces){s1.appendChild(mk('h4',null,UI('lbl:diefaces','Faces du dé')));const r=mk('div','dfaces');
    if(h.dset){const im=document.createElement('img');im.className='dset';im.src=h.dset;im.alt=UI('lbl:diefaces','Faces du dé')+' — '+h.name;im.width=200;im.height=33;im.draggable=false;s1.appendChild(im);}
    h.faces.forEach(f=>{const c=mk('span','dface');c.appendChild(mk('i',null,f.n.join('·')));
      const bb=mk('b',null,f.sym);if(f.c)bb.style.color=f.c;c.appendChild(bb);r.appendChild(c);});s1.appendChild(r);}
  (h.blocks||[]).forEach((bk,bi)=>{ s1.appendChild(mk('h4',null,tr('hero:'+h.id+':blk:'+bi+':title',bk.t)));
    const ul=mk('ul','bl'); bk.items.forEach((x,ii)=>ul.appendChild(mk('li',null,tr('hero:'+h.id+':blk:'+bi+':i:'+ii,x)))); s1.appendChild(ul); });
  if(h.rules&&h.rules.length){const u=mk('ul');
    h.rules.forEach((x,ri)=>{const li=mk('li');const xt=tr('hero:'+h.id+':rule:'+ri+':text',x.text);
      if(h.boss){li.appendChild(mk('b',null,tr('hero:'+h.id+':rule:'+ri+':term',x.term)));li.appendChild(mk('span','faqa',xt));}
      else if(x.term){li.appendChild(mk('b',null,tr('hero:'+h.id+':rule:'+ri+':term',x.term)));li.appendChild(document.createTextNode(' : '+xt));}else li.appendChild(document.createTextNode(xt));u.appendChild(li);});
    const w=mk('div','foldwrap');w.appendChild(mkFold((h.boss?UI('lbl:faqfold','FAQ officielle'):UI('lbl:rulesfold','Précisions de règles'))+' ('+h.rules.length+')',u));s1.appendChild(w);}
  if(!h.faces&&!h.rules) s1.appendChild(mk('p','weapon',UI('msg:nodetail','Fiche détaillée (dé, capacités, précisions) à venir.')));
  s2.innerHTML='';
  const ids=(h.tokens||[]).filter(id=>T[id]);
  tintPhases(s1); tintDmg(s1); tintHeal(s1); frFix(s1);
  if(!ids.length){s2.className='stub';s2.textContent=UI('msg:tokglossary','Glossaire des jetons utilisés par ce héros.');return;}
  s2.className='sheet';
  ids.forEach(id=>{
    const t=T[id],row=mk('div','tok');row.dataset.tid=id;
    const ib=mk('button','tokbtn'),im=document.createElement('img');
    const tn0=trTokName(id,t);
    ib.type='button';ib.setAttribute('aria-label','Ouvrir la page de '+tn0);ib.title='Voir la page de '+tn0;
    im.src=t.icon;im.alt='';ib.appendChild(im);row.appendChild(ib);
    const b=mk('div','tokbody'),hd=mk('div','tokhead'),m=mk('span','tokmeta');
    const nb=mk('button','tokname',tn0);nb.type='button';hd.appendChild(nb);
    m.appendChild(mk('span','k '+t.type,trKind(t.type,KIND[t.type]||t.type)));
    if(t.stack||t.lim) m.appendChild(document.createTextNode(' · '+stackTxt(t)));
    hd.appendChild(m);b.appendChild(hd);
    if(t.desc){const dp=mk('p','tokdesc');renderTokDesc(dp,id,t.short?tr('tok:'+id+':short',t.short):tr('tok:'+id+':desc',t.desc));b.appendChild(dp);}
    if(t.lv) b.appendChild(armLines(armorLv(id,t.lv)));
    if(id==='armor') b.appendChild(armorCraftBlock());
    if(!t.subs&&t.notes&&t.notes.length){const u=mk('ul');t.notes.forEach((n,ni)=>u.appendChild(mk('li',null,tr('tok:'+id+':note:'+ni,n))));
      const w=mk('div','foldwrap');w.appendChild(mkFold(UI('lbl:precisions','Précisions'),u));b.appendChild(w);}
    row.appendChild(b);s2.appendChild(row);
  });
  tintPhases(s2); tintDmg(s2); tintHeal(s2); frFix(s2);
}

function fill(h){
  detail.classList.toggle('bossmode',!!h.boss);
  { const pr=document.getElementById('prules'), kk=h.boss?'panel.bossrules':'panel.rules', df=h.boss?'Règles du boss':'Règles du héros';
    pr.setAttribute('data-i18n',kk); pr.dataset.i18nDefault=df; pr.textContent=UI(kk,df); }
  dname.textContent=trHeroName(h);
  // le logo stylisé du héros tient lieu de titre ; le texte prend le relais s'il manque
  if(h.plate){ dplate.src=h.plate; dplate.alt=trHeroName(h); dplate.style.height=h.ph?h.ph+'px':''; dplate.hidden=false; dname.hidden=true; }
  else { dplate.hidden=true; dname.hidden=false; }
  if(h.boss){ ddice.hidden=true; dmeta.textContent=bossKind(h)+' · '+h.set; }
  else if(h.soon){ ddice.hidden=true; dmeta.textContent=UI('soon.tag','À venir'); }
  else { ddice.src=DICE[h.complexity+'-highlight']; ddice.hidden=false;
    dmeta.textContent=UI('lbl:complexity','Complexité')+' '+h.complexity+' · '+trSet(h.set); }
  renderSheet(h); tintForge(h); linkHeroToks(h); tintUndead(h);
  rail.querySelectorAll('button').forEach(b=>
    b.setAttribute('aria-current',b.dataset.id===h.id?'true':'false'));
  const cur=rail.querySelector('[aria-current="true"]');
  if(cur) cur.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
function discOf(id){
  const li=grid.querySelector('.hero[data-id="'+id+'"]')||bossGrid.querySelector('.hero[data-id="'+id+'"]')||soonGrid.querySelector('.hero[data-id="'+id+'"]');
  if(!li || li.classList.contains('hidden')) return null;
  const d=li.querySelector('.disc'), r=d.getBoundingClientRect();
  if(!r.width||r.bottom<0||r.top>innerHeight) return null;
  return d;
}
function makeGhost(rect,radius){
  const g=document.createElement('div');
  g.id='ghost';
  g.style.left=rect.left+'px'; g.style.top=rect.top+'px';
  g.style.width=rect.width+'px'; g.style.height=rect.height+'px';
  g.style.borderRadius=radius;
  document.body.appendChild(g);
  return g;
}
/* Cadrage de l'artwork reproduisant exactement celui de l'icône ronde,
   puis celui du volet (cover, aligné en haut). Une seule image : aucun fondu,
   donc aucune transition d'image visible. */
function frameIcon(g,W,H){
  const k=W/g.s;
  return {w:g.aw*k, h:g.ah*k, l:-(g.cx-g.s/2)*k, t:-(g.cy-g.s/2)*k};
}
function frameCover(g,W,H){
  const k=Math.max(W/g.aw,H/g.ah);
  return {w:g.aw*k, h:g.ah*k, l:(W-g.aw*k)/2, t:0};
}
/* dégradé sombre du volet : il vit dans le fantôme et suit son échelle et son déplacement */
function ghostShade(g,a,b,h){
  const ic=document.createElement('img'); ic.className='gicon'; ic.src=h.icon; ic.alt='';
  const opening=b>a, FR=Math.round(MORPH*0.18);
  ic.style.opacity=opening?1:0; g.appendChild(ic);
  const d=document.createElement('div'); d.className='gshade'; d.style.opacity=a; g.appendChild(d);
  getComputedStyle(d).opacity; getComputedStyle(ic).opacity;
  return ()=>{
    d.style.transition='opacity '+MORPH+'ms '+MO; d.style.opacity=b;
    // fondu icône <-> illustration : sur les ~18 % du début (ouverture) ou de la fin (fermeture)
    ic.style.transition='opacity '+FR+'ms linear'+(opening?'':' '+Math.round(MORPH*0.76)+'ms'); ic.style.opacity=opening?0:1;
  };
}
function putImg(img,f){
  img.style.width=f.w+'px'; img.style.height=f.h+'px';
  img.style.left=f.l+'px'; img.style.top=f.t+'px';
}
function addArt(g,src){
  const i=document.createElement('img'); i.src=src;
  i.style.position='absolute'; i.style.objectFit='fill'; i.style.maxWidth='none';
  g.appendChild(i); return i;
}

function backLbl(h){ return '← '+(h&&h.boss?UI('back:allbosses','Tous les boss'):UI('back:allheroes','Tous les héros')); }
/* ---------- ouverture : le cercle se déplie ---------- */
/* illustrations en fichiers : on attend qu'elle soit décodée (1,5 s max) avant d'animer, sinon le morph part sur du vide */
const ART_OK=new Set(), ART_P=new Map();
function warmArt(src){
  if(!src||ART_OK.has(src)) return Promise.resolve();
  let p=ART_P.get(src); if(p) return p;
  p=new Promise(res=>{ let done=false; const fin=()=>{ if(done) return; done=true; ART_OK.add(src); res(); }; const im=new Image(); im.onload=()=>{ (im.decode?im.decode().catch(()=>{}):Promise.resolve()).then(fin); }; im.onerror=fin; setTimeout(fin,1500); im.src=src; });
  ART_P.set(src,p); return p;
}
function artWait(h,fn){ if(!h||!h.art||ART_OK.has(h.art)) return false; warmArt(h.art).then(fn); return true; }
function open(id){
  if(busy) return; const h=HA.find(x=>x.id===id); if(!h) return; if(artWait(h,()=>open(id))) return;
  detail.classList.remove('tokmode'); curTok=null; tokFrom=null; heroFromTokId=null; document.getElementById('back').textContent=backLbl(h);
  const disc=discOf(id);
  fill(h);
  slides.innerHTML='';
  const art=document.createElement('img'); art.src=h.art; art.alt=trHeroName(h);
  slides.appendChild(art);
  current=id;

  if(!disc || still.matches){
    detail.classList.add('on'); detail.setAttribute('aria-hidden','false');
    browse.classList.add('dim'); document.body.style.overflow='hidden'; return;
  }

  busy=true;
  const from=disc.getBoundingClientRect();
  detail.classList.add('on');
  const to=stage.getBoundingClientRect();
  detail.classList.remove('on');

  const g=makeGhost(from,'50%');
  const gi=addArt(g,h.art);
  putImg(gi,frameIcon(h.g,from.width,from.height));
  const sh=ghostShade(g,0,1,h); detail.classList.add('noshade');
  disc.classList.add('ghosted');
  browse.classList.add('dim');
  caption.style.opacity='0'; panelbody.style.opacity='0';

  requestAnimationFrame(()=>{
    // l'arrondi part très lentement : la forme reste ronde une bonne partie du trajet
    const box='left '+MORPH+'ms '+MO+',top '+MORPH+'ms '+MO+
              ',width '+MORPH+'ms '+MO+',height '+MORPH+'ms '+MO;
    g.style.transition=box+',border-radius '+MORPH+'ms '+RIN+' '+Math.round(MORPH*0.18)+'ms';
    g.style.left=to.left+'px'; g.style.top=to.top+'px';
    g.style.width=to.width+'px'; g.style.height=to.height+'px';
    g.style.borderRadius='0';
    gi.style.transition=box;
    putImg(gi,frameCover(h.g,to.width,to.height)); sh();
  });
  // le texte arrive en fondu pendant la fin du mouvement
  setTimeout(()=>{
    detail.classList.add('on'); detail.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>{panelbody.style.opacity='1';});
  },Math.round(MORPH*0.62));
  setTimeout(()=>{
    // le fantôme ne part qu'une fois le vrai volet peint : pas de sursaut
    requestAnimationFrame(()=>requestAnimationFrame(()=>{detail.classList.remove('noshade'); caption.style.opacity='1'; requestAnimationFrame(()=>requestAnimationFrame(()=>g.remove()));}));
    document.body.style.overflow='hidden'; busy=false;
  },MORPH);
}

/* ---------- fermeture : le cercle se referme ---------- */
/* réaffiche les vraies icônes sans transition d'opacité : sinon elles refont un fondu de 120 ms
   juste après la disparition du fantôme, et on voit un clignotement */
function unghostAll(){
  [grid,bossGrid,soonGrid].forEach(gr=>gr.querySelectorAll('.disc.ghosted').forEach(d=>{d.style.transition='none'; d.classList.remove('ghosted'); void d.offsetWidth; d.style.transition='';}));
}
function dropGhost(g){ requestAnimationFrame(()=>requestAnimationFrame(()=>g.remove())); }
function close(){
  if(busy) return;
  if(heroFromTokId) return backToTok();
  if(curTok) return closeTok();
  if(!current) return;
  const disc=discOf(current);
  browse.classList.remove('dim'); document.body.style.overflow='';
  if(!disc || still.matches){
    detail.classList.remove('on'); detail.setAttribute('aria-hidden','true');
    unghostAll(); current=null; return;
  }
  busy=true;
  const h=HA.find(x=>x.id===current);
  const from=stage.getBoundingClientRect();
  const to=disc.getBoundingClientRect();
  const g=makeGhost(from,'0px');
  const ga=addArt(g,h.art);
  putImg(ga,frameCover(h.g,from.width,from.height));
  const sh=ghostShade(g,1,0,h);
  detail.classList.remove('on'); detail.setAttribute('aria-hidden','true');

  requestAnimationFrame(()=>{
    sh();
    // à la fermeture c'est l'inverse : la forme redevient ronde très tôt
    const box='left '+MORPH+'ms '+MO+',top '+MORPH+'ms '+MO+
              ',width '+MORPH+'ms '+MO+',height '+MORPH+'ms '+MO;
    g.style.transition=box+',border-radius '+Math.round(MORPH*0.55)+'ms '+ROUT;
    g.style.left=to.left+'px'; g.style.top=to.top+'px';
    g.style.width=to.width+'px'; g.style.height=to.height+'px';
    g.style.borderRadius='50%';
    ga.style.transition=box;
    putImg(ga,frameIcon(h.g,to.width,to.height));
  });
  setTimeout(()=>{unghostAll(); dropGhost(g); current=null; busy=false;},MORPH);
}

/* ---------- bascule entre héros : volet directionnel ---------- */
function swipeTo(id){
  if(busy||id===current) return;
  const h=HA.find(x=>x.id===id); if(!h) return; if(artWait(h,()=>swipeTo(id))) return;
  const LST=h.boss?HB:H.concat(SOON), iNew=LST.findIndex(x=>x.id===id), iOld=LST.findIndex(x=>x.id===current);
  const fromLeft = iNew < iOld;           // héros situé à gauche -> le volet vient de la gauche
  const old=slides.querySelector('img');
  // le masquage suit le heros affiche, sinon l'ancienne icone reste invisible
  const prev=discOf(current); if(prev) prev.classList.remove('ghosted');
  const next=discOf(id); if(next) next.classList.add('ghosted');
  const img=document.createElement('img'); img.src=h.art; img.alt=trHeroName(h);
  img.style.transform='translateX('+(fromLeft?-100:100)+'%)';
  slides.appendChild(img);
  current=id;

  caption.style.opacity='0'; panelbody.style.opacity='0';
  setTimeout(()=>{fill(h); caption.style.opacity='1'; panelbody.style.opacity='1';},TXT);

  if(still.matches){ if(old) old.remove(); img.style.transform='none'; return; }
  busy=true;
  requestAnimationFrame(()=>{
    img.style.transition='transform '+SWIPE+'ms '+MO;
    img.style.transform='translateX(0)';
    if(old){ old.style.transition='transform '+SWIPE+'ms '+MO;
             old.style.transform='translateX('+(fromLeft?100:-100)+'%)'; }
  });
  setTimeout(()=>{ if(old) old.remove(); busy=false; },SWIPE);
}

{ const pre=e=>{ const li=e.target.closest&&e.target.closest('.hero'); if(!li) return; const h=HA.find(x=>x.id===li.dataset.id); if(h) warmArt(h.art); };
  grid.addEventListener('pointerover',pre); grid.addEventListener('touchstart',pre,{passive:true}); grid.addEventListener('focusin',pre); }
grid.addEventListener('click',e=>{
  const li=e.target.closest('.hero'); if(!li) return;
  if(picking) togglePick(li.dataset.id,li); else open(li.dataset.id);
});
rail.addEventListener('click',e=>{const b=e.target.closest('button'); if(!b) return; b.dataset.k==='token'?swapTok(b.dataset.id):swipeTo(b.dataset.id);});
/* glisser à gauche / à droite depuis l'image : héros suivant / précédent (même volet que la rangée d'icônes) */
(function heroSwipe(){
  let x0=0,y0=0,t0=0,on=false;
  const can=()=>detail.classList.contains('on')&&current&&!busy&&!curTok&&!heroFromTokId&&!detail.classList.contains('tokmode');
  stage.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||!can()||e.target.closest('button')){ on=false; return; }
    const t=e.touches[0]; x0=t.clientX; y0=t.clientY; t0=Date.now(); on=true;
  },{passive:true});
  stage.addEventListener('touchend',e=>{
    if(!on) return; on=false;
    const t=e.changedTouches[0]; if(!t||!can()) return;
    const dx=t.clientX-x0, dy=t.clientY-y0, dt=Date.now()-t0;
    if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy)*1.4||dt>900) return;
    const h=HA.find(x=>x.id===current); if(!h) return;
    const L=h.boss?HB:H.concat(SOON), i=L.findIndex(x=>x.id===current), n=L[i+(dx<0?1:-1)];
    if(n) swipeTo(n.id);
  },{passive:true});
  stage.addEventListener('touchcancel',()=>{ on=false; },{passive:true});
})();
document.getElementById('back').addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape') close();});

/* =================== collections, sélection manuelle, tirage =================== */
const setsEl=document.getElementById('sets'), poolEl=document.getElementById('pool');
const rnd=document.getElementById('rnd'), reel=document.getElementById('reel');
const qtyEl=document.getElementById('qty'), rollBtn=document.getElementById('roll');
const norepeat=document.getElementById('norepeat'), pickBtn=document.getElementById('pickmode');

const SET_ORDER=['Season One','Season Two','Santa v Krampus','Marvel','X-Men','Outcasts','Vanguard','Hors série'];
[...new Set(H.map(h=>h.set))].sort((a,b)=>SET_ORDER.indexOf(a)-SET_ORDER.indexOf(b)).forEach(name=>{
  const b=document.createElement('button');
  b.className='chip'; b.dataset.set=name; b.setAttribute('aria-pressed','false'); b.textContent=name;
  setsEl.appendChild(b);
});
setsEl.addEventListener('click',e=>{
  const b=e.target.closest('.chip'); if(!b) return;
  const n=b.dataset.set;
  sets.has(n)?sets.delete(n):sets.add(n);
  b.setAttribute('aria-pressed',sets.has(n)?'true':'false');
  apply();
});

/* vivier = ce que les filtres laissent passer, moins les exclusions manuelles */
function pool(){
  return cards.filter(c=>keep(c) && !off.has(c.dataset.id)).map(c=>c.dataset.id);
}
function poolInfo(){
  if(!poolEl) return;
  const p=pool(), n=p.length;
  const bits=[];
  if(active.size) bits.push(UIs('cnt:cplx','complexité')+' '+[...active].sort().join('/'));
  if(sets.size) bits.push([...sets].join(', '));
  if(off.size) bits.push(UIs('cnt:manual','sélection manuelle'));
  poolEl.textContent = n+' '+UIs('cnt:pool','héros dans le tirage')+(bits.length?' — '+bits.join(' · '):'')+'.';
  if(typeof syncOffBadge==='function') syncOffBadge();
  if(rollBtn) rollBtn.disabled = n===0;
  qtyEl.querySelectorAll('button').forEach(b=>b.disabled = (+b.dataset.n)>n);
  if(qty>n){ qty=Math.max(1,n); syncQty(); }
}

/* sélection manuelle : le clic écarte ou réintègre au lieu d'ouvrir la fiche */
const allOn=document.getElementById('allon'), allOff=document.getElementById('alloff');
pickBtn.addEventListener('click',()=>{
  picking=!picking;
  if(picking){
    // on entre dans le mode : tous les héros sont écartés, y compris ceux
    // que le filtre masque, sinon ils reviendraient cochés en retirant le filtre
    if(off.size===0){ cards.forEach(li=>{ off.add(li.dataset.id); paint(li); }); poolInfo(); }
  } else {
    // on ressort sans rien avoir coché : la sélection est abandonnée
    if(pool().length===0){ off.clear(); cards.forEach(paint); poolInfo(); }
  }
  document.body.classList.toggle('picking',picking);
  pickBtn.classList.toggle('armed',picking);
  /* libellé traduit : clé + défaut posés à chaque bascule, pour que applyStaticI18N le suive aussi au changement de langue */
  { const k=picking?'tool.pickdone':'tool.pick', df=picking?'Terminer la sélection':'Sélection manuelle'; pickBtn.dataset.i18n=k; pickBtn.dataset.i18nDefault=df; pickBtn.textContent=UI(k,df); }
  allOn.hidden = allOff.hidden = !picking;
  syncOffBadge();
});
function paint(li){
  const out=off.has(li.dataset.id);
  li.classList.toggle('off',out);
  // ✓ = dans le vivier (visible en mode sélection), ✕ = écarté (visible en permanence)
  li.querySelector('.pick').textContent = out ? '✕' : '✓';
}
/* n'agit que sur les héros actuellement affichés : les filtres restent maîtres */
function setAll(on){
  cards.filter(keep).forEach(li=>{
    on ? off.delete(li.dataset.id) : off.add(li.dataset.id);
    paint(li);
  });
  poolInfo();
}
allOn.addEventListener('click',()=>setAll(true));
allOff.addEventListener('click',()=>setAll(false));

/* rappel permanent des exclusions, hors mode sélection */
const clearOff=document.getElementById('clearoff');
function syncOffBadge(){
  clearOff.hidden = picking || off.size===0;
  // la coche des retenus ne s'affiche que si une sélection est effectivement en cours
  document.body.classList.toggle('has-selection', !picking && off.size>0);
}
clearOff.addEventListener('click',()=>{
  off.clear(); cards.forEach(paint); poolInfo();
});

function togglePick(id,li){
  off.has(id)?off.delete(id):off.add(id);
  paint(li);
  poolInfo();
}

/* nombre de héros à tirer */
for(let i=1;i<=6;i++){
  const b=document.createElement('button');
  b.dataset.n=i; b.textContent=i; b.setAttribute('aria-pressed',i===1?'true':'false');
  qtyEl.appendChild(b);
}
function syncQty(){
  qtyEl.querySelectorAll('button').forEach(b=>
    b.setAttribute('aria-pressed',(+b.dataset.n)===qty?'true':'false'));
}
qtyEl.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b||b.disabled) return;
  qty=+b.dataset.n; syncQty(); buildReel();
});

function buildReel(){
  reel.innerHTML='';
  for(let i=0;i<qty;i++){
    const d=document.createElement('div'); d.className='rslot empty';
    d.innerHTML='<div class="disc2"><img alt=""></div><svg class="rring" viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="43" pathLength="100"/></svg><i class="rwave"></i><span>—</span>';
    const dc=d.querySelector('.disc2'); dc.style.setProperty('--rd',(8+Math.random()*9).toFixed(1)+'s'); dc.style.setProperty('--rdl',(-Math.random()*12).toFixed(1)+'s');
    reel.appendChild(d);
  }
}

function openRnd(){
  if(picking){ pickBtn.click(); }
  buildReel(); poolInfo();
  rnd.classList.add('on'); rnd.setAttribute('aria-hidden','false'); fx.style.zIndex=40; glintT=setTimeout(glintTick,500);
}
function closeRnd(){ rnd.classList.remove('on'); rnd.setAttribute('aria-hidden','true'); clearTimeout(glintT); fx.style.zIndex=''; }
document.getElementById('openrnd').addEventListener('click',openRnd);
document.getElementById('rndclose').addEventListener('click',closeRnd);
rnd.addEventListener('click',e=>{ if(e.target===rnd) closeRnd(); });

function draw(){
  let p=pool();
  if(norepeat.checked){
    const fresh=p.filter(id=>!drawn.has(id));
    // si le vivier est épuisé, on repart d'une ardoise propre
    if(fresh.length>=qty) p=fresh; else drawn.clear();
  }
  const picked=[];
  const bag=[...p];
  for(let i=0;i<qty && bag.length;i++){
    picked.push(bag.splice(Math.floor(Math.random()*bag.length),1)[0]);
  }
  return picked;
}
let rolling=false;
rollBtn.addEventListener('click',()=>{
  if(rolling||rollBtn.disabled) return;
  const result=draw(); if(!result.length) return;
  rolling=true; rollBtn.disabled=true;
  const slots=[...reel.children];
  const p=pool();
  slots.forEach(s=>s.classList.remove('done','stamp','empty'));

  // défilement qui ralentit (un tic doux à chaque pas), puis chaque case se fixe l'une après l'autre
  let t=0, step=55;
  const spin=()=>{
    slots.forEach((s,i)=>{
      if(s.classList.contains('done')) return;
      const id=p[Math.floor(Math.random()*p.length)];
      const h=H.find(x=>x.id===id);
      s.querySelector('img').src=h.icon; s.querySelector('span').textContent=trHeroName(h); s.dataset.hid=h.id;
    });
    rndTick(step);
    t+=step; step*=1.06;
    const settled=Math.floor((t-500)/260);
    slots.forEach((s,i)=>{
      if(i<settled && !s.classList.contains('done')) settleSlot(s,H.find(x=>x.id===result[i]));
    });
    if(settled<slots.length && t<500+260*slots.length+400){ setTimeout(spin,step); }
    else {
      slots.forEach((s,i)=>{ const h=H.find(x=>x.id===result[i]); if(h) settleSlot(s,h); });
      rolling=false; rollBtn.disabled=false; rollBtn.textContent='Relancer';
      poolInfo();
    }
  };
  spin();
});
/* un clic sur un résultat ouvre sa fiche */
reel.addEventListener('click',e=>{
  const s=e.target.closest('.rslot'); if(!s||!s.classList.contains('done')) return;
  const h=H.find(x=>x.id===s.dataset.hid); if(!h) return;
  closeRnd(); open(h.id);
});
buildReel();

legend(cards.length); poolInfo();

/* =================== accueil : onglets, jetons, assistant =================== */
const TK=DATA.tokens||{};
const TINT={positive:'rgba(143,207,165,.24)',negative:'rgba(226,154,142,.24)',unique:'rgba(216,194,106,.24)',companion:'rgba(143,176,230,.24)',marker:'rgba(184,179,168,.22)'};
const toksEl=document.getElementById('toks');
const tokstage=document.getElementById('tokstage'), tokbig=document.getElementById('tokbig');
const tokpanel=document.getElementById('tokpanel'), tshort=document.getElementById('tshort');
const fold=document.getElementById('fold'), foldbtn=document.getElementById('foldbtn');
const foldbody=document.getElementById('foldbody'), tnotes=document.getElementById('tnotes');
let curTok=null, tokSrc=null, tokFrom=null;
const TORDER=['positive','negative','unique','companion','marker'];
const tids=Object.keys(TK).sort((a,b)=>TORDER.indexOf(TK[a].type)-TORDER.indexOf(TK[b].type)||TK[a].name.localeCompare(TK[b].name));

tids.forEach(id=>{
  const t=TK[id], li=document.createElement('li'), kl=KIND[t.type]||t.type;
  li.className='tokli'; li.dataset.id=id;
  li.innerHTML='<button class="hero-btn"><span class="disc"><img alt=""></span><span class="nm"></span><span class="kk"></span></button>';
  li.querySelector('img').src=t.icon;
  li.querySelector('.nm').textContent=t.name;
  const kk=li.querySelector('.kk'); kk.textContent=kl; kk.classList.add(t.type);
  li.querySelector('button').setAttribute('aria-label',t.name+', jeton '+kl);
  toksEl.appendChild(li);
  const b=document.createElement('button'), im=document.createElement('img');
  b.dataset.id=id; b.dataset.k='token'; b.title=t.name; b.setAttribute('aria-label',t.name);
  im.src=t.icon; im.alt=''; b.appendChild(im); rail.appendChild(b);
});
document.getElementById('tcount').innerHTML='<b>'+tids.length+'</b> jetons.';
document.getElementById('nh').textContent=H.length;
document.getElementById('nt').textContent=tids.length;

/* onglets */
const tabs=document.getElementById('tabs');
function showPane(p){
  tabs.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.pane===p?'true':'false'));
  document.getElementById('pane-heroes').hidden=p!=='heroes';
  document.getElementById('pane-toks').hidden=p!=='toks';
  document.getElementById('pane-ach').hidden=p!=='ach';
  document.getElementById('pane-boss').hidden=p!=='boss';
}
tabs.addEventListener('click',e=>{const b=e.target.closest('[role=tab]'); if(!b) return; if(b.dataset.pane==='nara') openNara(); else if(b.dataset.pane==='tour') openTour(); else if(b.dataset.pane==='dta') openDTA(); else if(b.dataset.pane==='dtm') openDTM(); else showPane(b.dataset.pane);});
/* ---------- Boss : galerie ronde, fiche (même mécanique que les héros) ---------- */
const bossGrid=document.getElementById('bosses');
const BKIND={fallen:['boss:kind:fallen','Fallen Boss'],final:['boss:kind:final','Boss final'],witch:['boss:kind:witch','Unchained']};
function bossKind(h){ const k=BKIND[h.kind]||BKIND.fallen; return UIs(k[0],k[1]); }
HB.forEach(h=>{
  const li=document.createElement('li');
  li.className='hero bossli'; li.dataset.id=h.id; li.dataset.set=h.set; li.dataset.state='in';
  li.innerHTML='<button class="hero-btn"><span class="disc"><img src="'+h.icon+'" alt=""></span><span class="nm"></span><span class="kk"></span></button>';
  li.querySelector('.nm').textContent=h.name; li.querySelector('.kk').textContent=bossKind(h);
  li.querySelector('button').setAttribute('aria-label',h.name);
  bossGrid.appendChild(li);
  const b=document.createElement('button');
  b.dataset.id=h.id; b.dataset.k='boss'; b.title=h.name; b.setAttribute('aria-label',h.name);
  b.innerHTML='<img src="'+h.icon+'" alt="">'; rail.appendChild(b);
});
bossGrid.addEventListener('click',e=>{ const li=e.target.closest('.hero'); if(li) open(li.dataset.id); });
document.getElementById('nb').textContent=HB.length;
document.getElementById('bcount').innerHTML='<b>'+HB.length+'</b> '+UIs('boss:count',"boss de l'aventure.");

/* ================= Langue du site : Franglais (défaut) / Français intégral / English ================= */
let LANG='mix';
try{ const sv=localStorage.getItem('dtdb.lang'); if(sv==='fr'||sv==='en') LANG=sv; }catch(e){}

/* dictionnaire additif : ne contient QUE ce qui a été traduit (héros/jetons pilotes) ;
   tout ce qui manque retombe silencieusement sur le texte franglais existant */
function tr(key,fallback){
  if(LANG==='mix'||!key) return fallback;
  const v=I18N[LANG][key];
  return v!==undefined?v:fallback;
}
const STR={
  /* Français intégral : la plupart des libellés de l'interface sont déjà en français
     (ils retombent silencieusement sur le texte franglais existant) ; seuls les mots de
     jeu qui restaient en anglais dans l'interface elle-même sont traduits ici. */
  fr:{
    'lbl:stacklimit':"Limite d'empilement",
    'boss:rules':'Règles','boss:kind:fallen':'Boss déchu','boss:kind:final':'Boss final','boss:kind:witch':'Unchained',
    'kind:positive':'Positif','kind:negative':'Négatif','kind:unique':'Unique','kind:companion':'Compagnon','kind:marker':'Marqueur',
    /* Page Naraxus : Français intégral (Health→Vie, CP→PC, Roll/Upkeep/Defensive Phase→Phase de Lancer/d'Entretien/Défensive, etc.) */
    'nara:health:label':'Vie',
    'nara:health:reset':'Réinitialiser la Vie à son maximum',
    'nara:health:track':'Vie de Naraxus : cliquer pour appliquer des dégâts ou des soins',
    'nara:setup:hint':'Clique sur un nombre pour allumer la barre de Vie de Naraxus ci-dessus.',
    'nara:setup:intro':"Vie de départ de Naraxus, suivie sur le cadran de Vie d'un autre héros.",
    'nara:setup:li1':'Tous les héros partagent <b>un seul cadran de Vie</b> à <b>50</b> de Vie.',
    'nara:setup:li2':'Le reste de la mise en place est celui de Dice Throne (4 cartes et 2 PC au départ).',
    'nara:setup:li3':"<b>Dragon's Hoard</b> : chaque joueur choisit de Piocher 1 carte ou de gagner 2 PC.",
    'nara:order:li1':"Naraxus joue <b>toujours en premier</b>. Le héros qu'il attaque devient l'<b>Active Hero</b>.",
    'nara:order:li3':"On tourne dans le sens horaire, Naraxus passant toujours juste avant l'Active Hero, jusqu'à ce que Naraxus ou les héros tombent à 0 de Vie.",
    'nara:turn:li1':"Résous les effets de la Phase d'Entretien.",
    'nara:turn:li2':'Pendant la Phase de Lancer, lance 1 dé.',
    'nara:turn:li3':"Le résultat active l'une de ses six <span class=\"kw\">Capacités Offensives</span>, contre l'Active Hero.",
    'nara:turn:li4':'Une fois la Phase de Lancer Défensive résolue, son tour se termine.',
    'nara:hard:p':'Identique, mais quand il attaque, Naraxus lance <b>2 dés</b> et garde le plus haut. Il ne résout toujours qu\'une Attaque par tour.',
    'nara:card1:p1':"Retire 1 jeton d'Effet de Statut au hasard de Naraxus.",
    'nara:card1:p2':'<span class="kw">Soigne</span> <span class="dmg heal">4</span>',
    'nara:card1:p3':'<span class="kw">Inflige</span> <span class="dmg unblockable">3</span> dégâts <span class="kw">indéfendables</span>.',
    'nara:card2:p1':"L'Active Hero place les 3 cartes du dessus de son paquet dans sa Défausse.",
    'nara:card2:p2':'<span class="kw">Inflige</span> <span class="dmg">8</span> dégâts.',
    'nara:card3:p1':'<span class="kw">Lance</span> 4 dés.',
    'nara:card3:p2':'<span class="kw">Inflige</span> des dégâts égaux à la somme des <b>2 dés les plus hauts</b>.',
    'nara:card4:p1':"Prend 1 des dés de l'Active Hero : il ne peut pas l'utiliser avant la fin de son tour.",
    'nara:card4:p2':'<span class="kw">Inflige</span> <span class="dmg">9</span> dégâts.',
    'nara:card5:p1':"L'Active Hero défausse 1 carte de son choix.",
    'nara:card5:p2':'<span class="kw">Inflige</span> <span class="dmg unblockable">8</span> dégâts <span class="kw">indéfendables</span>.',
    'nara:card6:p1':'<span class="kw">Inflige</span> <span class="dmg">10</span> dégâts et lance 1 dé :',
    'nara:card6:p2':"sur <b>5-6</b>, à la fin de la Phase de Lancer, active <span class=\"kw\">Swoop</span> (contre l'Active Hero).",
    'nara:scales:tag':'Défense du Boss',
    'nara:scales:roll':'<span class="kw">Lance</span> 1 dé :',
    'nara:scales:r1':'sur <b>1</b>, empêche <span class="dmg prev">1</span> dégât',
    'nara:scales:r25':'sur <b>2-5</b>, empêche <span class="dmg prev">3</span> dégâts',
    'nara:scales:r6':'sur <b>6</b>, empêche <span class="dmg prev">5</span> dégâts',
    'nara:rules:h1li1':"Le Start Player ne saute pas sa <b>Phase de Revenu</b> : Naraxus joue avant lui.",
    'nara:rules:h1li2':'Les héros peuvent toujours utiliser des cartes pour manipuler les dés de Naraxus.',
    'nara:rules:h2li1':"Quand il lance, il utilise <b>n'importe quel dé disponible</b> : il n'a pas de dés à lui.",
    'nara:rules:h2li2':'Les héros ne peuvent changer ni sa quantité de dés (1), ni son nombre de Tentatives de Lancer (1).',
    'nara:rules:h2li3':'Il a <b>zéro carte</b> et des <b>PC infinis</b>.',
    'nara:rules:h2li4':'Il compte comme un <b>joueur</b> pour toutes les cartes, effets et Capacités.',
    'nara:rules:h2li5':"Il peut subir des Effets de Statut, mais certains n'ont aucun effet sur lui.",
    'nara:rules:h2li6':'Un dé pris avec <b>Hoarding</b> ne peut pas servir à activer une Capacité Défensive contre cette Attaque.',
    'nara:rules:h2li7':"Sa Capacité Défensive (<b>Dragon Scales</b>) s'active contre tout dégât défendable d'une Attaque.",
    'nara:rules:hardli':'Quand il attaque, il lance <b>2 dés</b> et garde le plus haut, mais ne résout qu\'une Attaque par tour.',
    'nara:pop:label':'Modifier la Vie de Naraxus',
    'nara:ally:label':'Vie des héros','nara:ally:btn':'Vie des héros',
    'nara:health:reset2':'Réinitialiser la Vie des héros à son maximum','nara:health:track2':'Vie des héros : cliquer pour appliquer des dégâts ou des soins',
    'nara:pop:titleA':'Vie des héros','nara:tk:title':'Jetons sur Naraxus','nara:tk:btn':'Jetons',
    'nara:pop:cur':'Vie actuelle :'
  },
  /* English : traduction complète du texte d'interface ; les noms propres (héros,
     capacités, jetons uniques, extensions) ne sont volontairement pas dans cette liste. */
  en:{
    h1a:'Welcome to',
    lede:'Ask your question (sign-in required), or explore the heroes, tokens, achievements… and much more.',
    'ask.lock':'Sign-in to Claude required to ask a question: open this link in the Claude app or on claude.ai, signed in to your account.', 'ask.declined':'The assistant was not allowed. Allow it in the Claude dialog, or reload the page and try again.', 'qs.ph':'Jump straight to a hero, a token, a page…', 'qs.hero':'Hero', 'qs.boss':'Boss', 'qs.token':'Token', 'qs.page':'Page', 'qs.none':'Nothing found',
    'ask.ph':'E.g.: how does Evasive work?',
    askgo:'Ask',
    chip1:'What is Evasive?',
    chip2:'Which hero should I start with?',
    chip3:'How does Stun work?',
    astop:'Stop', aclear:'Clear',
    'tab.heroes':'Heroes','tab.toks':'Tokens','tab.ach':'Achievements','tab.boss':'Boss',
    'tool.pick':'Manual selection','tool.pickdone':'Finish selection','tool.allon':'Check all','tool.alloff':'Uncheck all',
    'tool.clearoff':'Reset selection','tool.openrnd':'Random draw',
    reset:'Show all',
    'empty.heroes':'No heroes at these levels.',
    'empty.boss':"Same behavior as the Heroes tab (gallery, sheet, draw) once the five bosses' data is available.",
    'ach.count':'achievements validated',
    'ach.note':"Check off the feats your group has completed (Achievements booklet, seasons 1 and 2). Progress is saved in this browser, and the initials reference the booklet's « Great Charter ». A « ? » marks a number that was illegible in the source, still to be filled in.",
    'ach.all':'All','ach.todo':'To do','ach.done':'Done','ach.resetbtn':'Reset everything',
    'rnd.title':'Random draw','rnd.qty':'Number of heroes','rnd.norepeat':'Avoid heroes already drawn',
    'rnd.close':'Close','rnd.roll':'Roll',
    home:'Home',
    'panel.rules':'Hero rules','panel.status':'Statuses','panel.effect':'Effect:',
    'fold.tokdetail':'Details and clarifications','panel.heroesrel':'Related heroes',
    'lbl:weapon':'Weapon','lbl:diefaces':'Die faces','lbl:rulesfold':'Rule details',
    'msg:nodetail':'Detailed sheet (die, abilities, clarifications) coming soon.',
    'soon.title':'Coming soon','soon.tag':'Coming soon',
    'idle:on':'Animations on — click to freeze the page','idle:off':'Animations off — click to turn them back on',
    'msg:tokglossary':'Glossary of tokens used by this hero.',
    'lbl:stacklimit':'Stack Limit','lbl:precisions':'Details','lbl:complexity':'Complexity','lbl:opentoken':'View token','lbl:craft':'Crafting','lbl:craftnote':'Craft in Main Phase: the Blueprint\'s ORE must be on The Forge (plus the previous tier\'s piece on a Hero Board for Diamond/Ultimanium).',
    'back:allheroes':'All heroes','back:alltokens':'All tokens','back:allbosses':'All bosses',
    'panel.bossrules':'Boss rules','lbl:faqfold':'Official FAQ','boss:rules':'Rules',
    'boss:kind:fallen':'Fallen Boss','boss:kind:final':'Final Boss','boss:kind:witch':'Unchained',
    'lbl:sndon':'Sound on','lbl:sndoff':'Sound off',
    'lbl:achresetconfirm':'Confirm reset?','lbl:achreset':'Reset everything',
    'lbl:thinking':'Thinking…','lbl:interrupted':'Question interrupted.',
    'err:rate_limited':'Too many questions at once, or usage limit reached. Try again in a moment.',
    'err:session_expired':'Your session has expired. Please sign in again and retry.',
    'err:prompt_too_large':'The conversation has gotten too long. Click « Clear » and ask your question again.',
    'err:upstream_error':"The assistant couldn't answer right now. Please try again.",
    'set:other':'Other',
    'cnt:all':'heroes, all levels','cnt:lvl':'heroes — level','cnt:cplx':'complexity','cnt:manual':'manual selection','cnt:pool':'heroes in the draw',
    'boss:soon':'Coming soon','boss:count':'adventure bosses.',
    /* Page Naraxus : traduction complète */
    'nara:top:exit':'← Exit',
    'nara:top:rules':'Rules',
    'nara:top:music':'♪ Ambiance',
    'nara:top:music:play':'Play the Naraxus ambience (MP3, looped)',
    'nara:top:music:pause':'Stop the Naraxus ambience',
    'nara:health:reset':'Reset Health to its maximum',
    'nara:health:track':"Naraxus' Health: click to apply damage or healing.",
    'nara:health:hint':'✎ Edit',
    'nara:setup:title':'Setup',
    'nara:setup:p1':'1 hero','nara:setup:p2':'2 heroes','nara:setup:p3':'3 heroes','nara:setup:p4':'4 heroes',
    'nara:setup:hint':"Click a number to light up Naraxus' Health bar above.",
    'nara:setup:intro':"Naraxus' starting Health, tracked on another hero's Health Dial.",
    'nara:setup:li1':'All heroes share <b>a single Health Dial</b> set to <b>50</b> Health.',
    'nara:setup:li2':'The rest of the setup follows standard Dice Throne rules (4 cards and 2 CP to start).',
    'nara:setup:li3':"<b>Dragon's Hoard</b>: each player chooses to Draw 1 card or gain 2 CP.",
    'nara:order:title':'Turn Order',
    'nara:order:li1':'Naraxus always <b>goes first</b>. The hero it attacks becomes the <b>Active Hero</b>.',
    'nara:order:li2':'Then, the Active Hero takes a full Dice Throne turn.',
    'nara:order:li3':"Play proceeds clockwise, with Naraxus always acting right before the Active Hero, until Naraxus or the heroes reach 0 Health.",
    'nara:turn:title':"Naraxus' Turn",
    'nara:turn:li1':'Resolve Upkeep Phase effects.',
    'nara:turn:li2':'During the Roll Phase, roll 1 die.',
    'nara:turn:li3':'The result activates one of its six <span class="kw">Offensive Abilities</span> against the Active Hero.',
    'nara:turn:li4':'Once the Defensive Roll Phase is resolved, its turn ends.',
    'nara:hard:p':'Same, but when Attacking, Naraxus rolls <b>2 dice</b> and keeps the higher one. It still only resolves one Attack per turn.',
    'nara:card1:p1':'Remove 1 random Status Effect token from Naraxus.',
    'nara:card2:p1':'The Active Hero puts the top 3 cards of their deck into their Discard Pile.',
    'nara:card3:p2':'<span class="kw">Deal</span> damage equal to the sum of the <b>2 highest dice</b>.',
    'nara:card4:p1':"Takes 1 of the Active Hero's dice: they cannot use it before the end of their turn.",
    'nara:card5:p1':'The Active Hero discards 1 card of their choice.',
    'nara:card6:p1':'<span class="kw">Deal</span> <span class="dmg">10</span> dmg &amp; roll 1 die:',
    'nara:card6:p2':'on <b>5-6</b>, at the end of the Roll Phase, activate <span class="kw">Swoop</span> (against the Active Hero).',
    'nara:scales:roll':'<span class="kw">Roll</span> 1 die:',
    'nara:scales:r1':'on <b>1</b>, prevent <span class="dmg prev">1</span> dmg',
    'nara:scales:r25':'on <b>2-5</b>, prevent <span class="dmg prev">3</span> dmg',
    'nara:scales:r6':'on <b>6</b>, prevent <span class="dmg prev">5</span> dmg',
    'nara:rules:title':'Rule details',
    'nara:rules:heroesH4':'Heroes',
    'nara:rules:h1li1':'The Start Player does not skip their <b>Income Phase</b>: Naraxus goes before them.',
    'nara:rules:h1li2':"Heroes can always use cards to manipulate Naraxus' dice.",
    'nara:rules:h2li1':'When it rolls, it uses <b>whatever die is available</b>: it has no dice of its own.',
    'nara:rules:h2li2':'Heroes cannot change its number of dice (1) or its number of Roll Attempts (1).',
    'nara:rules:h2li3':'It has <b>zero cards</b> and <b>infinite CP</b>.',
    'nara:rules:h2li4':'It counts as a <b>player</b> for all cards, effects, and Abilities.',
    'nara:rules:h2li5':'It can be affected by status effects, but some have no effect on it.',
    'nara:rules:h2li6':'A die taken by <b>Hoarding</b> cannot be used to activate a Defensive Ability against that Attack.',
    'nara:rules:h2li7':'Its Defensive Ability (<b>Dragon Scales</b>) activates against any defendable dmg from an Attack.',
    'nara:rules:hardli':'When it Attacks, it rolls <b>2 dice</b> and keeps the higher one, but still only resolves one Attack per turn.',
    'nara:rules:src':'Source: Naraxus Battle board, reworded. The ambiance video matches the QR code printed on the board.',
    'nara:tools:attack':'Attack','nara:tools:defense':'Defense',
    'nara:qr':'♪ QR code ambiance: YouTube video',
    'nara:pop:label':"Edit Naraxus' Health",
    'nara:ally:label':"Heroes' Health",'nara:ally:btn':"Heroes' HP",
    'nara:health:reset2':"Reset the heroes' Health to its maximum",'nara:health:track2':"Heroes' Health: click to apply damage or healing",
    'nara:pop:titleA':"Heroes' Health",'nara:pop:hist':'History','nara:pop:histempty':'No changes yet',
    'nara:tk:btn':'Tokens','nara:tk:title':'Tokens on Naraxus','nara:tk:search':'Search a token…','nara:tk:hint':'Drag a token onto Naraxus (or click to add it). Drag it back here to remove it.',
    'nara:tk:all':'All','nara:tk:other':'Other','nara:tk:none':'No token found','nara:tk:clear':'Clear all','nara:tk:clear2':'Confirm?','nara:tk:del':'Remove this token',
    'nara:pop:closelabel':'Close',
    'nara:pop:cur':'Current Health:',
    'nara:pop:dmglabel':'Damage or healing',
    'nara:pop:dmgbtn':'− Damage','nara:pop:healbtn':'+ Heal'
  }
};
function UIs(key,fb){ try{ return UI(key,fb); }catch(e){ return fb; } }  /* sûr avant l'initialisation de LANG */
function UI(key,fallback){
  if(LANG==='mix') return fallback;
  const s=STR[LANG];
  return (s&&s[key]!==undefined)?s[key]:fallback;
}
function trTag(id,label){ return tr('tag:'+id+':label',label); }
function trTagDesc(id,desc){ return tr('tag:'+id+':desc',desc); }
function trKind(type,label){ return UI('kind:'+type,label); }
/* Libellés « Limite / Stack Limit » des jetons : valeurs de DATA (français/franglais) traduites selon la langue */
const LIMTR={
  en:{'Cartes':'Cards','Deck de 4':'4-card deck','Summon en Main Phase':'Summon in Main Phase','Piste à 5 positions':'5-position track','Pas de Stack Limit imprimé':'No printed Stack Limit','Cartes, max 3 en jeu':'Cards, max 3 in play','Carte Passive':'Passive card','Stack Limit variable selon le type':'Stack Limit varies by type','selon scénario':'per scenario','Infini':'Unlimited','variable':'varies','5 (Pirate) / 3 (autre joueur)':'5 (Pirate) / 3 (other players)'},
  fr:{'Special Die':'Dé spécial','Companion':'Compagnon','Summon en Main Phase':'Invocation en Phase Principale','Pas de Stack Limit imprimé':"Pas de Limite d'empilement imprimée",'Stack Limit variable selon le type':"Limite d'empilement variable selon le type"}
};
function limTr(v){
  if(v==null||v===''||typeof LANG==='undefined'||LANG==='mix') return v;
  const m=LIMTR[LANG]; if(m&&m[v]!==undefined) return m[v];
  if(LANG==='fr'){
    let r=String(v).replace(/^Stack Limit /,"Limite d'empilement ").replace(/^Activation limit /,"Limite d'activation ").replace(/^Dial max /,'Cadran max ').replace(/^Health max /,'Vie max ');
    return r;
  }
  return v;
}
function stackTxt(t){ return t.lim&&!t.stack?limTr(t.lim):UI('lbl:stacklimit','Stack Limit')+' '+limTr(t.stack); }
function trSet(s){ return s==='Hors série' ? UI('set:other',s) : s; }
function trHeroName(h){ return h?tr('hero:'+h.id+':name',h.name):h; }
function trTokName(id,t){ return t?tr('tok:'+id+':name',t.name):t; }

/* En mode FR intégral, Combat Points (CP) devient Points de Combat (PC) : filet de
   sécurité global qui corrige le terme partout où le texte n'est pas encore traduit
   mot à mot (héros hors pilote, réponses de l'IA, etc.). */
function frFix(root){
  if(LANG!=='fr'||!root) return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);
  const nodes=[]; let n;
  while(n=walker.nextNode()) nodes.push(n);
  nodes.forEach(nd=>{ if(/\bCP\b/.test(nd.nodeValue)) nd.nodeValue=nd.nodeValue.replace(/\bCP\b/g,'PC'); });
}

const langswEl=document.getElementById('langsw');
function applyLangButtons(){
  if(!langswEl) return;
  langswEl.querySelectorAll('.lgbtn').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===LANG?'true':'false'));
}
let I18N_STATIC_ELS=[];
function captureStaticDefaults(){
  I18N_STATIC_ELS=[...document.querySelectorAll('[data-i18n]')];
  I18N_STATIC_ELS.forEach(el=>{
    const attr=el.getAttribute('data-i18n-attr');
    /* 'html' : plusieurs langues n'ont pas les mêmes mots en gras/kw dans la phrase,
       donc on capture/restaure l'innerHTML plutôt que le texte brut. */
    if(attr==='html'){ el.dataset.i18nDefault=el.innerHTML; return; }
    /* liste séparée par des virgules : mêmes valeur sur plusieurs attributs (ex. title+aria-label) */
    const a0=attr?attr.split(',')[0]:null;
    el.dataset.i18nDefault=a0?el.getAttribute(a0):el.textContent;
  });
}
function applyStaticI18N(){
  I18N_STATIC_ELS.forEach(el=>{
    const key=el.getAttribute('data-i18n'), attr=el.getAttribute('data-i18n-attr');
    const s=STR[LANG];
    const val=(LANG!=='mix'&&s&&s[key]!==undefined)?s[key]:el.dataset.i18nDefault;
    if(attr==='html') el.innerHTML=val;
    else if(attr) attr.split(',').forEach(a=>el.setAttribute(a,val));
    else el.textContent=val;
  });
}
/* la grille "Jetons" est construite une seule fois au chargement : ses libellés de type
   (Positive/Negative/…) doivent être rafraîchis manuellement à chaque changement de langue */
function refreshTokGridKinds(){
  if(typeof tids==='undefined'||typeof TK==='undefined'||typeof toksEl==='undefined'||typeof KIND==='undefined') return;
  tids.forEach(id=>{
    const t=TK[id], li=toksEl.querySelector('.tokli[data-id="'+id+'"]'); if(!li) return;
    const kk=li.querySelector('.kk'); if(kk) kk.textContent=trKind(t.type,KIND[t.type]||t.type);
  });
}
/* le bouton « retour » est mis à jour à la navigation (fonctions open/openTok/backToHero/backToTok) ;
   ici on ne fait que le refléter dans la langue active si la fiche est déjà ouverte */
function refreshBackLabel(){
  if(typeof detail==='undefined') return;
  const backEl=document.getElementById('back'); if(!backEl) return;
  if(detail.classList.contains('tokmode')){
    backEl.textContent = (typeof tokFrom!=='undefined'&&tokFrom) ? '← '+trHeroName(HA.find(x=>x.id===tokFrom)) : '← '+UI('back:alltokens','Tous les jetons');
  } else if(typeof heroFromTokId!=='undefined'&&heroFromTokId){
    backEl.textContent = '← '+trTokName(heroFromTokId,TK[heroFromTokId]);
  } else {
    backEl.textContent = backLbl(typeof current!=='undefined'&&current?HA.find(x=>x.id===current):null);
  }
}
/* la liste des héros (grille + rail latéral), la grille "Jetons" et les cartes
   Achievements sont construites une seule fois — certaines même avant que la
   langue ne soit initialisée (temporal dead zone) — donc leurs noms affichés
   doivent être rafraîchis explicitement à chaque changement de langue. */
function refreshNames(){
  if(typeof H==='undefined') return;
  H.forEach(h=>{
    const li=document.querySelector('#grid .hero[data-id="'+h.id+'"]'); if(!li) return;
    const n=trHeroName(h);
    const nm=li.querySelector('.nm'); if(nm) nm.textContent=n;
    const btn=li.querySelector('.hero-btn'); if(btn) btn.setAttribute('aria-label',n+', complexité '+h.complexity);
  });
  if(typeof HB!=='undefined') HB.forEach(h=>{
    const li=document.querySelector('.bossli[data-id="'+h.id+'"]'); if(!li) return;
    const n=trHeroName(h), nm=li.querySelector('.nm'); if(nm) nm.textContent=n;
    const btn=li.querySelector('.hero-btn'); if(btn) btn.setAttribute('aria-label',n);
  });
  if(typeof rail!=='undefined'&&rail) rail.querySelectorAll('button[data-k]').forEach(b=>{
    const id=b.dataset.id, n=(b.dataset.k==='hero'||b.dataset.k==='boss')?(HA.find(x=>x.id===id)&&trHeroName(HA.find(x=>x.id===id))):(typeof TK!=='undefined'&&TK[id]&&trTokName(id,TK[id]));
    if(n===undefined||n===null) return;
    b.title=n; b.setAttribute('aria-label',n);
  });
  if(typeof tids!=='undefined'&&typeof toksEl!=='undefined') tids.forEach(id=>{
    const t=TK[id], li=toksEl.querySelector('.tokli[data-id="'+id+'"]'); if(!li) return;
    const n=trTokName(id,t), kl=trKind(t.type,KIND[t.type]||t.type);
    const nm=li.querySelector('.nm'); if(nm) nm.textContent=n;
    const btn=li.querySelector('button'); if(btn) btn.setAttribute('aria-label',n+', jeton '+kl);
  });
  document.querySelectorAll('.achhero[data-hero]').forEach(hb=>{
    const h=H.find(x=>x.id===hb.dataset.hero); if(!h) return;
    const n=trHeroName(h);
    hb.setAttribute('aria-label','Ouvrir la fiche de '+n);
    const nm=hb.querySelector('span'); if(nm) nm.textContent=n;
  });
  // NB : buildNames() n'est PAS appelé ici — à l'appel initial (avant que le
  // "let NAMES" plus bas dans le fichier n'ait été exécuté), ce serait une
  // erreur de zone morte temporelle. Il est appelé séparément depuis applyLang().
}
/* onglet Succès : le texte de chaque succès (et le libellé du groupe "Champ de bataille")
   est construit une seule fois par achBuild() ; on le retraduit ici à chaque changement de
   langue, à partir du texte franglais d'origine mis en cache dans achRows. */
function refreshAch(){
  if(typeof achRows==='undefined'||typeof achText!=='function') return;
  achRows.forEach(r=>{
    const t=r.li&&r.li.querySelector('.acht'); if(!t) return;
    t.innerHTML=''; achText(t,tr('ach:'+r.k+':'+r.idx,r.raw));
  });
  const fieldNm=document.querySelector('.achcard[data-k="field"] .achhero span');
  if(fieldNm) fieldNm.textContent=tr('ach:field:name','Champ de bataille');
  if(typeof achList!=='undefined'&&achList){ tintPhases(achList); tintDmg(achList); tintHeal(achList); frFix(achList); }
}
function refreshDynUI(){
  idleUi();
  try{ if(typeof setsEl!=='undefined') setsEl.querySelectorAll('.chip').forEach(b=>{ b.textContent=trSet(b.dataset.set); });
       if(typeof legend==='function'&&typeof cards!=='undefined'&&typeof keep==='function'){ legend(cards.filter(keep).length); poolInfo(); }
       HB.forEach(h=>{ const k=document.querySelector('.bossli[data-id="'+h.id+'"] .kk'); if(k) k.textContent=bossKind(h); });
       const bc=document.getElementById('bcount'), nb=document.getElementById('nb'); if(bc&&nb) bc.innerHTML='<b>'+nb.textContent+'</b> '+UI('boss:count',"boss de l'aventure.");
       if(typeof brBuilt!=='undefined'&&brBuilt) brRender(false); }catch(err){}
}
function applyLang(){
  document.documentElement.lang=LANG==='en'?'en':'fr';
  applyLangButtons();
  applyStaticI18N();
  refreshTokGridKinds();
  refreshNames();
  if(typeof buildNames==='function') buildNames(); // sûr ici : applyLang() n'est jamais appelé avant la fin du parsing du script
  if(typeof refreshMusicBtn==='function') refreshMusicBtn();
  refreshAch();
  refreshDynUI();
  if(typeof tourRefresh==='function') tourRefresh();
  if(typeof dtaRefresh==='function') dtaRefresh();
  if(typeof dtmRefresh==='function') dtmRefresh();
  if(typeof naraXRefresh==='function') naraXRefresh();
  SYS=null; // le prompt système de l'IA sera reconstruit dans la langue active
  if(typeof achSndUi==='function') achSndUi();
  if(typeof detail!=='undefined'&&detail.classList.contains('on')){
    if(detail.classList.contains('tokmode')){ if(curTok) fillTok(curTok); }
    else if(current) fill(HA.find(h=>h.id===current));
    refreshBackLabel();
  }
  if(typeof cpRefresh==='function') cpRefresh();
}
if(langswEl) langswEl.addEventListener('click',e=>{
  if(e.target.closest('#idlebtn')){ idleSet(!IDLE.off); return; }
  const b=e.target.closest('.lgbtn'); if(!b) return;
  LANG=b.dataset.lang;
  try{ localStorage.setItem('dtdb.lang',LANG); }catch(err){}
  applyLang();
});
captureStaticDefaults();
document.documentElement.lang=LANG==='en'?'en':'fr';
applyLangButtons();
applyStaticI18N();
refreshTokGridKinds();
refreshDynUI(); refreshNames(); // corrige d'emblée la grille héros/jetons (construite avant ce bloc langue) si LANG restauré ≠ mix

/* ---------- Boss : menu « Rules » (Boss vs Many / Boss vs Boss) ---------- */
const BRULES={"mix":{"title":"Règles de combat de boss","intro":"Deux modes pour affronter un Boss en dehors de la campagne. Toutes les règles Dice Throne standard s'appliquent, sauf :","tabs":[{"id":"many","label":"Boss vs Many","lead":"3 à 5 joueurs : l'un incarne le Boss, les autres sont les héros.","sections":[["Setup des héros",["Les héros se partagent un seul Health dial, qui démarre à 50."]],["Setup du Boss",["Il démarre avec 10 Health + 20 Health par héros.","Mélange ensemble l'Upgrade deck et l'Action deck du Boss.","Il commence avec 4 cartes et 2 CP."]],["Premier joueur et ordre de jeu",["Le Boss est toujours Start Player et ne saute pas son Income Phase.","Tous les joueurs, Boss compris, jouent dans le sens horaire un tour Dice Throne standard."]],["King's Hand",["Unique Status Effect (Stack Limit 5) : ni retirable ni transférable.","Le Boss en gagne un pendant l'Upkeep Phase de chaque joueur (la sienne et celle de chaque héros).","Il peut aussi dépenser 3 CP à tout moment pour en gagner un (toujours Stack Limit 5).","À chaque King's Hand dépensé, il lance un Loot die (d20) : 1-10 il gagne 1 CP ; 11-15 au choix, un héros relance un de ses dés OU le Boss gagne 1 Roll Attempt de plus ; 16-20 il change la valeur de n'importe quel dé."]],["Targeting Phase",["Les héros ciblent toujours le Boss. Le Boss, lui, lance 1 Chaos die pour choisir sa cible :","2 héros : 1-3 héros à gauche du Boss, 4-6 héros à droite.","3 héros : 1-2 gauche, 3-4 centre, 5-6 droite.","4 héros : 1-4 dans le sens horaire en partant du héros à gauche du Boss (le 1), 5-6 on relance."]]]},{"id":"boss","label":"Boss vs Boss","lead":"2 joueurs : un duel 1 contre 1 normal, chacun jouant un Boss.","sections":[["Setup",["Chacun démarre à 70 Health.","Chaque joueur mélange ensemble l'Upgrade deck et l'Action deck de son Boss.","Pioche 4 cartes et gagne 2 CP."]],["King's Hand",["Unique Status Effect (Stack Limit 5) : ni retirable ni transférable.","On en gagne un à chaque Upkeep Phase.","L'un ou l'autre Boss peut dépenser 3 CP à tout moment pour en gagner un (Stack Limit 5).","À chaque King's Hand dépensé, lance un Loot die (d20) : 1-10 tu gagnes 1 CP ; 11-15 au choix, ton adversaire relance un de ses dés OU tu gagnes 1 Roll Attempt de plus ; 16-20 tu changes la valeur de n'importe quel dé."]]]}],"common":["Changements communs aux deux modes",["Toutes les cartes Action qui parlent de l'« Active Player » désignent ton adversaire.","Ignore les Hero Bonus en haut à droite des cartes Action.","Ignore les Roll Objectives en bas des cartes Action."]],"source":"Source : livret Dice Throne Adventures, p. 14 (Other game modes)."},"fr":{"title":"Règles de combat de boss","intro":"Deux modes pour affronter un Boss en dehors de la campagne. Toutes les règles standard de Dice Throne s'appliquent, sauf :","tabs":[{"id":"many","label":"Boss vs Many","lead":"3 à 5 joueurs : l'un incarne le Boss, les autres sont les héros.","sections":[["Mise en place des héros",["Les héros se partagent un seul cadran de Vie, qui démarre à 50."]],["Mise en place du Boss",["Il démarre avec 10 de Vie + 20 de Vie par héros.","Mélange ensemble le paquet d'Amélioration et le paquet d'Action du Boss.","Il commence avec 4 cartes et 2 PC."]],["Premier joueur et ordre de jeu",["Le Boss est toujours premier joueur et ne saute pas sa Phase de Revenu.","Tous les joueurs, Boss compris, jouent dans le sens horaire un tour Dice Throne standard."]],["King's Hand",["Effet de statut Unique (limite d'empilement 5) : ni retirable ni transférable.","Le Boss en gagne un pendant la Phase d'Entretien de chaque joueur (la sienne et celle de chaque héros).","Il peut aussi dépenser 3 PC à tout moment pour en gagner un (toujours limite 5).","À chaque King's Hand dépensé, il lance un dé de Butin (d20) : 1-10 il gagne 1 PC ; 11-15 au choix, un héros relance un de ses dés OU le Boss gagne 1 tentative de lancer de plus ; 16-20 il change la valeur de n'importe quel dé."]],["Phase de ciblage",["Les héros ciblent toujours le Boss. Le Boss, lui, lance 1 dé Chaos pour choisir sa cible :","2 héros : 1-3 héros à gauche du Boss, 4-6 héros à droite.","3 héros : 1-2 gauche, 3-4 centre, 5-6 droite.","4 héros : 1-4 dans le sens horaire en partant du héros à gauche du Boss (le 1), 5-6 on relance."]]]},{"id":"boss","label":"Boss vs Boss","lead":"2 joueurs : un duel 1 contre 1 normal, chacun jouant un Boss.","sections":[["Mise en place",["Chacun démarre à 70 de Vie.","Chaque joueur mélange ensemble le paquet d'Amélioration et le paquet d'Action de son Boss.","Pioche 4 cartes et gagne 2 PC."]],["King's Hand",["Effet de statut Unique (limite d'empilement 5) : ni retirable ni transférable.","On en gagne un à chaque Phase d'Entretien.","L'un ou l'autre Boss peut dépenser 3 PC à tout moment pour en gagner un (limite 5).","À chaque King's Hand dépensé, lance un dé de Butin (d20) : 1-10 tu gagnes 1 PC ; 11-15 au choix, ton adversaire relance un de ses dés OU tu gagnes 1 tentative de lancer de plus ; 16-20 tu changes la valeur de n'importe quel dé."]]]}],"common":["Changements communs aux deux modes",["Toutes les cartes Action qui parlent du « joueur actif » désignent ton adversaire.","Ignore les Bonus de héros en haut à droite des cartes Action.","Ignore les Objectifs de lancer en bas des cartes Action."]],"source":"Source : livret Dice Throne Adventures, p. 14 (autres modes de jeu)."},"en":{"title":"Boss battle rules","intro":"Two ways to fight a Boss outside the campaign. All standard Dice Throne rules apply, with these exceptions:","tabs":[{"id":"many","label":"Boss vs Many","lead":"3 to 5 players: one plays the Boss, the others are the Heroes.","sections":[["Heroes setup",["The Heroes share a single Health dial, starting at 50."]],["Boss setup",["The Boss starts with 10 Health + 20 Health per Hero.","Shuffle the Boss's Upgrade deck and Action deck together.","The Boss starts with 4 cards and 2 CP."]],["Start player and turn order",["The Boss is always the Start Player and doesn't skip his Income Phase.","All players, Boss included, take a standard Dice Throne turn in clockwise order."]],["King's Hand",["Unique Status Effect (Stack Limit 5): can't be removed or transferred by any means.","The Boss gains one during every player's Upkeep Phase (his own and each Hero's).","He may also spend 3 CP at any time to gain one (still Stack Limit 5).","Each time a King's Hand is spent, he rolls a Loot die (d20): 1-10 gain 1 CP; 11-15 choose, a Hero re-rolls one of their dice OR the Boss gains 1 additional Roll Attempt; 16-20 change the value of any one die."]],["Targeting Phase",["Heroes always target the Boss. The Boss rolls 1 Chaos die to pick his target:","2 Heroes: 1-3 Hero on the Boss's left, 4-6 Hero on his right.","3 Heroes: 1-2 left, 3-4 center, 5-6 right.","4 Heroes: 1-4 clockwise starting with the Hero on the Boss's left (1), 5-6 roll again."]]]},{"id":"boss","label":"Boss vs Boss","lead":"2 players: a normal 1v1 duel, each playing a Boss.","sections":[["Setup",["Each player starts at 70 Health.","Each player shuffles their Boss's Upgrade deck and Action deck together.","Draw 4 cards and gain 2 CP."]],["King's Hand",["Unique Status Effect (Stack Limit 5): can't be removed or transferred by any means.","Gain one during every Upkeep Phase.","Either Boss may spend 3 CP at any time to gain one (Stack Limit 5).","Each time a King's Hand is spent, roll a Loot die (d20): 1-10 gain 1 CP; 11-15 choose, your opponent re-rolls one of their dice OR you gain 1 additional Roll Attempt; 16-20 change the value of any one die."]]]}],"common":["Rule changes for both modes",["All Action cards that say “Active Player” refer to your opponent instead.","Ignore the Hero Bonuses in the top-right corner of Action cards.","Ignore the Roll Objectives at the bottom of Action cards."]],"source":"Source: Dice Throne Adventures rulebook, p. 14 (Other game modes)."}};
const brBtn=document.getElementById('brulesbtn'), brPanel=document.getElementById('brules');
const brTabs=document.getElementById('brtabs'), brBody=document.getElementById('brbody');
let brBuilt=false, brTab='many', brSwapT=0;
function brData(){ return BRULES[LANG]||BRULES.mix; }
function brFill(el,secs){
  el.textContent='';
  secs.forEach(sc=>{ el.appendChild(mk('h4',null,sc[0])); const u=mk('ul'); sc[1].forEach(t=>u.appendChild(mk('li',null,t))); el.appendChild(u); });
}
function brRenderBody(){
  const d=brData(), t=d.tabs.find(x=>x.id===brTab)||d.tabs[0];
  brBody.textContent=''; brBody.appendChild(mk('p','brlead',t.lead)); brFill(brBody,t.sections);
  tintPhases(brBody); tintDmg(brBody); tintHeal(brBody); frFix(brBody);
}
function brRender(){
  const d=brData();
  document.getElementById('brtitle').textContent=d.title; document.getElementById('brintro').textContent=d.intro;
  brTabs.textContent='';
  d.tabs.forEach(t=>{ const b=mk('button',null,t.label); b.type='button'; b.setAttribute('role','tab'); b.dataset.t=t.id; b.setAttribute('aria-selected',t.id===brTab?'true':'false'); brTabs.appendChild(b); });
  brRenderBody();
  const cm=document.getElementById('brcommon'); brFill(cm,[d.common]); tintPhases(cm); tintDmg(cm); tintHeal(cm); frFix(cm);
  document.getElementById('brsrc').textContent=d.source;
}
function brSetOpen(on){
  if(on&&!brBuilt){ brBuilt=true; brRender(); }
  brPanel.classList.toggle('open',on); brPanel.inert=!on; brBtn.setAttribute('aria-expanded',on?'true':'false');
}
brBtn.addEventListener('click',()=>brSetOpen(!brPanel.classList.contains('open')));
brTabs.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b||b.dataset.t===brTab) return;
  brTab=b.dataset.t; brTabs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));
  clearTimeout(brSwapT);
  if(still.matches){ brRenderBody(); return; }
  brBody.classList.add('swap');
  brSwapT=setTimeout(()=>{ brRenderBody(); requestAnimationFrame(()=>requestAnimationFrame(()=>brBody.classList.remove('swap'))); },200);
});

/* ---------- Naraxus : plateau, dés et braises ---------- */
const NARAXUS={video:'https://www.youtube.com/watch?v=ZzP01cTkneE',music:null};   // lien YouTube du QR code (ouvert dans un nouvel onglet)
const naraEl=document.getElementById('nara'), naraBoard=document.getElementById('naraboard');
const naraRules=document.getElementById('nararules');
let naraOpen=false;

/* --- code couleur des phases et des dégâts : réutilisable partout sur le site ---
   en mode Français intégral, le contenu déjà traduit (pilote) utilise les libellés
   français ci-dessous ; le reste du site (non encore traduit) retombe sur l'anglais,
   donc les regex FR reconnaissent les DEUX formes à la fois. */
const PHASE_RE=/\b((?:Targeting|Offensive|Defensive)\s+Roll\s+Phase|Roll\s+Phase|Main\s+Phase|Upkeep(?:\s+Phase)?|Discard\s+Phase|Income\s+Phase)\b/gi;
const PHASE_RE_FR=/\b((?:Targeting|Offensive|Defensive)\s+Roll\s+Phase|Roll\s+Phase|Main\s+Phase|Upkeep(?:\s+Phase)?|Discard\s+Phase|Income\s+Phase|Phase de Lancer(?:\s+de\s+Ciblage|\s+Offensive|\s+Défensive)?|Phase Principale|Phase d['’]Entretien|Entretien|Phase de Défausse|Phase de Revenu)\b/gi;
function phaseCls(t){
  const l=t.toLowerCase();
  if(l.indexOf('roll phase')>=0||l.indexOf('phase de lancer')>=0) return 'ph-roll';
  if(l.indexOf('main phase')>=0||l.indexOf('phase principale')>=0) return 'ph-main';
  if(l.indexOf('upkeep')===0||l.indexOf('entretien')>=0) return 'ph-upkeep';
  if(l.indexOf('discard phase')>=0||l.indexOf('phase de défausse')>=0) return 'ph-discard';
  if(l.indexOf('income phase')>=0||l.indexOf('phase de revenu')>=0) return 'ph-income';
  return null;
}
function tintPhases(root){
  if(!root) return;
  const RE=(typeof LANG!=='undefined'&&LANG==='fr')?PHASE_RE_FR:PHASE_RE;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){
    if(n.parentNode.className && /\bph-/.test(n.parentNode.className)) continue;
    if(n.parentNode.closest && n.parentNode.closest('.tag,.tagdesc')) continue;
    RE.lastIndex=0; if(RE.test(n.nodeValue)) hits.push(n);
  }
  hits.forEach(n=>{
    const f=document.createDocumentFragment(); const txt=n.nodeValue; let last=0,m; RE.lastIndex=0;
    while((m=RE.exec(txt))){
      if(m.index>last) f.appendChild(document.createTextNode(txt.slice(last,m.index)));
      const cls=phaseCls(m[1]);
      if(cls){ const sp=document.createElement('span'); sp.className=cls; sp.textContent=m[1]; f.appendChild(sp); }
      else f.appendChild(document.createTextNode(m[1]));
      last=m.index+m[1].length;
    }
    if(last<txt.length) f.appendChild(document.createTextNode(txt.slice(last)));
    n.parentNode.replaceChild(f,n);
  });
}
const MODW="(?:undefendable|collateral|pure|defendable|isolated|isol[ée]e?s?|ind[ée]fendables?|collat[ée]ra(?:l|ux)|purs?|d[ée]fendables?)";
const FILLW="(?:Attack|Offensive|Defensive|Ultimate|additional|extra|more|less|fewer|bonus|total|suppl[ée]mentaires?)";
const MODO=MODW+"(?:\\s+"+MODW+")*";
const MODS="(?:"+MODW+"|"+FILLW+")(?:\\s+(?:"+MODW+"|"+FILLW+"))*";
function mkDmgRE(fr){ const W=fr?"(?:dmg|d[ée]g[âa]ts?)":"dmg";
  return new RegExp("(?<w3>"+W+")(?<mid>[^.;:\\d]{0,40}?(?:reduced\\s+by|decreased\\s+by|r[ée]duit(?:e|s|es)?\\s+de|diminu[ée]e?s?\\s+de)\\s+)(?<rn>\\d+)\\b|(?<num>[+-]?\\d+)\\s+(?:(?<pre>"+MODS+")\\s+)?"+W+"\\b(?:\\s+(?<post>"+MODS+")(?![\\wéèêàâ-]))?|\\b"+W+"\\s+(?<q2>"+MODO+")(?![\\wéèêàâ-])|(?<![\\wé])(?<q3>"+MODO+")\\s+"+W+"\\b|\\b"+W+"\\b","gi"); }
const DMG_RE_FR=mkDmgRE(true), DMG_RE=DMG_RE_FR; /* le mix contient aussi du français (« 1 dégât ») */
const MODONLY=new RegExp("^\\s*(?:(?:"+MODW+"|"+FILLW+")\\s*)*$","i");
function dmgRed(q){ return !!q && /\b(undefendable|collateral|pure|ind[ée]fendables?|collat[ée]ra(?:l|ux)|purs?)\b/i.test(q); }
function tintDmg(root){
  if(!root) return;
  const RE=(typeof LANG!=='undefined'&&LANG==='fr')?DMG_RE_FR:DMG_RE;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){
    if(n.parentNode.closest && n.parentNode.closest('.dmg,.ph-roll,.ph-main,.ph-upkeep,.ph-discard,.ph-income,.tag,.tagdesc')) continue;
    RE.lastIndex=0; if(RE.test(n.nodeValue)) hits.push(n);
  }
  hits.forEach(n=>{
    const f=document.createDocumentFragment(); const txt=n.nodeValue; let last=0,m; RE.lastIndex=0;
    /* « 3 dmg » déjà traité : le chiffre est en pastille, le mot qui suit reste du texte simple */
    const pv=n.previousSibling, afterNum=!!(pv&&pv.nodeType===1&&pv.classList&&pv.classList.contains('dmg')&&/^[+-]?\d+$/.test(pv.textContent.trim()));
    while((m=RE.exec(txt))){
      if(afterNum&&m.groups.num===undefined&&MODONLY.test(txt.slice(0,m.index))) continue;
      if(m.index>last) f.appendChild(document.createTextNode(txt.slice(last,m.index)));
      const g=m.groups; let badge,before='',after='',red=false;
      if(g.rn!==undefined){ badge=g.rn; before=m[0].slice(0,m[0].length-g.rn.length); }
      else if(g.num!==undefined){ badge=g.num; red=dmgRed((g.pre||'')+' '+(g.post||'')); after=m[0].slice(g.num.length); }
      else if(g.q2!==undefined){ badge=m[0].slice(0,m[0].search(/\s/)); red=dmgRed(g.q2); after=m[0].slice(badge.length); }
      else if(g.q3!==undefined){ const i=m[0].search(/\s+\S+$/); badge=m[0].slice(i).trim(); red=dmgRed(g.q3); before=m[0].slice(0,i)+m[0].slice(i).match(/^\s*/)[0]; }
      else { badge=m[0]; red=false; }
      if(before) f.appendChild(document.createTextNode(before));
      const sp=document.createElement('span'); sp.className='dmg'+(red?' unblockable':''); sp.textContent=badge; f.appendChild(sp);
      if(after) f.appendChild(document.createTextNode(after));
      last=m.index+m[0].length;
    }
    if(last<txt.length) f.appendChild(document.createTextNode(txt.slice(last)));
    n.parentNode.replaceChild(f,n);
  });
}
const HEAL_RE=/\b(?:Heals?|Soigne[rz]?|Soins?)\s+(?:(?:at\s+least|au\s+moins|yourself|Nyra|de|for)\s+)*([+-]?\d+)\b/gi;
const HEAL_RE_FR=HEAL_RE;
function tintHeal(root){
  if(!root) return;
  /* « Heal Nyra 7 » : le nom est un lien (a.ref) qui coupe le texte, donc on traite à part le nombre qui le suit */
  root.querySelectorAll('a.ref').forEach(a=>{
    const pv=a.previousSibling, nx=a.nextSibling;
    if(!pv||pv.nodeType!==3||!nx||nx.nodeType!==3||(a.closest&&a.closest('.dmg,.tag,.tagdesc'))) return;
    if(!/\b(?:Heals?|Soigne[rz]?|Soins?)\s+$/i.test(pv.nodeValue)) return;
    const mm=/^(\s*(?:(?:de|for)\s+)?)([+-]?\d+)\b/.exec(nx.nodeValue); if(!mm) return;
    const sp=document.createElement('span'); sp.className='dmg heal'; sp.textContent=mm[2];
    nx.nodeValue=nx.nodeValue.slice(mm[0].length);
    nx.parentNode.insertBefore(document.createTextNode(mm[1]),nx); nx.parentNode.insertBefore(sp,nx);
  });
  const RE=(typeof LANG!=='undefined'&&LANG==='fr')?HEAL_RE_FR:HEAL_RE;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){
    if(n.parentNode.closest && n.parentNode.closest('.dmg,.ph-roll,.ph-main,.ph-upkeep,.ph-discard,.ph-income,.tag,.tagdesc')) continue;
    RE.lastIndex=0; if(RE.test(n.nodeValue)) hits.push(n);
  }
  hits.forEach(n=>{
    const f=document.createDocumentFragment(); const txt=n.nodeValue; let last=0,m; RE.lastIndex=0;
    while((m=RE.exec(txt))){
      if(m.index>last) f.appendChild(document.createTextNode(txt.slice(last,m.index)));
      const num=m[1]!==undefined?m[1]:(m[2]!==undefined?m[2]:m[3]), before=m[0].slice(0,m[0].indexOf(num));
      if(before) f.appendChild(document.createTextNode(before));
      const sp=document.createElement('span'); sp.className='dmg heal'; sp.textContent=num; f.appendChild(sp);
      last=m.index+m[0].length;
    }
    if(last<txt.length) f.appendChild(document.createTextNode(txt.slice(last)));
    n.parentNode.replaceChild(f,n);
  });
}

/* --- Nevermore Die Roll : listing des 6 résultats, avec code couleur et liens vers les jetons --- */
const nvmRollEl=document.getElementById('nvmroll');
const NVM_ROWS=[
  [1,"L'adversaire (qui héberge Nevermore) reçoit Hex."],
  [2,'La Raveness peut Activate Nevermore deux fois.'],
  [3,'La Raveness peut Activate Nevermore.'],
  [4,"L'adversaire discard 1 carte de son choix."],
  [5,"L'adversaire perd 1 PC ; la Raveness gagne 1 PC, même s'il n'y en avait pas à perdre."],
  [6,'Le dial de Nevermore retombe à 0, puis il retourne aussitôt à la Raveness.']
];
/* traduction anglaise (le français ci-dessus sert de texte par défaut en mode mix ET fr) */
const NVM_ROWS_EN=[
  [1,'The opponent (holding Nevermore) gains Hex.'],
  [2,'Raveness can Activate Nevermore twice.'],
  [3,'Raveness can Activate Nevermore.'],
  [4,'The opponent discards 1 card of their choice.'],
  [5,"The opponent loses 1 CP; Raveness gains 1 CP, even if there was none to lose."],
  [6,"Nevermore's dial resets to 0, then it immediately returns to Raveness."]
];
const NVM_INTRO_FR='Si un adversaire héberge Nevermore, il lance 1 dé à son <b>Upkeep Phase</b> :';
const NVM_INTRO_EN='If an opponent holds Nevermore, they roll 1 die during their <b>Upkeep Phase</b>:';
/* table Helmet/Shield du jeton Armor : le français par défaut (mix/fr) ne diffère que par
   les 2 en-têtes (Casque/Bouclier) ; l'anglais ci-dessous est une traduction complète. */
const ARMOR_LV_FR=[
  {h:'Casque',r:[['Gold','renvoie 1 dmg'],['Diamond','renvoie 2 dmg'],['Ultimanium','renvoie 3 dmg']]},
  {h:'Bouclier',r:[['Gold','prévient 1 dmg'],['Diamond','prévient 2 dmg'],['Ultimanium',"prévient 2 dmg, contre tout type d'Attack sauf Ultimate"]]}
];
const ARMOR_LV_EN=[
  {h:'Helmet',r:[['Gold','returns 1 dmg'],['Diamond','returns 2 dmg'],['Ultimanium','returns 3 dmg']]},
  {h:'Shield',r:[['Gold','prevents 1 dmg'],['Diamond','prevents 2 dmg'],['Ultimanium',"prevents 2 dmg, against any Attack type except Ultimate"]]}
];
function armorLv(id,lv){ return id==='armor'?(LANG==='en'?ARMOR_LV_EN:(LANG==='fr'?ARMOR_LV_FR:lv)):lv; }
function nvmRoll(){
  if(!nvmRollEl) return;
  const introEl=document.querySelector('.nvm-intro');
  if(introEl) introEl.innerHTML=LANG==='en'?NVM_INTRO_EN:NVM_INTRO_FR;
  nvmRollEl.innerHTML='';
  (LANG==='en'?NVM_ROWS_EN:NVM_ROWS).forEach(([v,txt])=>{
    const li=document.createElement('li');
    const f=document.createElement('span'); f.className='nvm-face'; f.textContent=v; li.appendChild(f);
    const p=document.createElement('span'); p.className='nvm-tx'; linkInto(p,txt); li.appendChild(p);
    nvmRollEl.appendChild(li);
  });
  tintPhases(nvmRollEl); tintDmg(nvmRollEl); tintHeal(nvmRollEl);
}
if(nvmRollEl) nvmRollEl.addEventListener('click',e=>{
  const a=e.target.closest('a.ref'); if(!a) return; e.preventDefault();
  if(a.dataset.k==='token') openTok(a.dataset.id,a.querySelector('img'));
  else { showPane(HB.some(b=>b.id===a.dataset.id)?'boss':'heroes'); open(a.dataset.id); }
});

/* --- sons dédiés : impact, soin, crépitement (mêmes primitives que le tirage) --- */
function sfxHit(){
  if(!achState.snd) return; const c=audio(); if(!c) return;
  try{
    if(c.state==='suspended') c.resume();
    const t=c.currentTime+.01, o=c.createOscillator(), g=c.createGain(); o.type='sine';
    o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(42,t+.22);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.26,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+.26);
    o.connect(g); g.connect(MASTER); o.start(t); o.stop(t+.3);
    const o2=c.createOscillator(), g2=c.createGain(); o2.type='triangle'; o2.frequency.setValueAtTime(340,t); o2.frequency.exponentialRampToValueAtTime(90,t+.09);
    g2.gain.setValueAtTime(.14,t); g2.gain.exponentialRampToValueAtTime(.0001,t+.11); o2.connect(g2); g2.connect(MASTER); o2.start(t); o2.stop(t+.14);
  }catch(e){}
}
function sfxHeal(){
  if(!achState.snd) return; const c=audio(); if(!c) return;
  try{
    if(c.state==='suspended') c.resume();
    const t=c.currentTime+.01;
    [880,1174.66].forEach((f,i)=>bell(f,t+i*.09,.14-i*.03,.9));
    for(let i=0;i<5;i++) ping(t+.1+i*.045,2200+Math.random()*1800,.035);
  }catch(e){}
}
function sfxIgnite(){
  if(!achState.snd) return; const c=audio(); if(!c) return;
  try{
    if(c.state==='suspended') c.resume();
    const t=c.currentTime+.01, o=c.createOscillator(), g=c.createGain(); o.type='sawtooth';
    o.frequency.setValueAtTime(60,t); o.frequency.exponentialRampToValueAtTime(210,t+.3);
    const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(280,t); f.frequency.exponentialRampToValueAtTime(2200,t+.32);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.1,t+.05); g.gain.exponentialRampToValueAtTime(.0001,t+.34);
    o.connect(f); f.connect(g); g.connect(MASTER); o.start(t); o.stop(t+.38);
    bell(1046.5,t+.24,.09,.9);
  }catch(e){}
}
function sfxCrackle(){
  if(!achState.snd) return; const c=audio(); if(!c) return;
  try{
    if(c.state==='suspended') c.resume();
    const t0=c.currentTime+.02;
    for(let i=0;i<16;i++){
      const t=t0+Math.random()*.9, dur=.03+Math.random()*.05;
      const n=Math.floor(c.sampleRate*dur), buf=c.createBuffer(1,n,c.sampleRate), d=buf.getChannelData(0);
      for(let j=0;j<n;j++) d[j]=(Math.random()*2-1)*Math.pow(1-j/n,1.6);
      const src=c.createBufferSource(); src.buffer=buf;
      const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1600+Math.random()*2800; f.Q.value=3+Math.random()*4;
      const g=c.createGain(); g.gain.setValueAtTime(.04+Math.random()*.08,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      src.connect(f); f.connect(g); g.connect(MASTER); src.start(t); src.stop(t+dur+.02);
    }
    const o=c.createOscillator(), g2=c.createGain(); o.type='sine'; o.frequency.setValueAtTime(85,t0); o.frequency.exponentialRampToValueAtTime(32,t0+.9);
    g2.gain.setValueAtTime(.001,t0); g2.gain.linearRampToValueAtTime(.12,t0+.05); g2.gain.exponentialRampToValueAtTime(.0001,t0+.95);
    o.connect(g2); g2.connect(MASTER); o.start(t0); o.stop(t0+1);
  }catch(e){}
}

/* --- Attaque et Défense : tirage animé façon roue des héros --- */
(function(){
  const NAMES=['Swoop','Ember Spark','Gashing Bite','Hoarding','Thundering Roar',"Dragon's Might"], PREV=[1,3,3,3,3,5];
  const cards=[...document.querySelectorAll('#ncards .ncard')], scales=document.getElementById('nscales');
  const scaleLines=[...document.querySelectorAll('#nscales p[data-r]')];
  const nresnum=document.getElementById('nresnum');
  const out=document.getElementById('nares'), hard=document.getElementById('narahard');
  const btnA=document.getElementById('nararoll'), btnD=document.getElementById('narascale');
  const die=()=>1+((Math.random()*6)|0);
  let busy=false;
  function clearHit(){ cards.forEach(c=>c.classList.remove('hit','stamp')); scales.classList.remove('hit','stamp'); scaleLines.forEach(p=>p.classList.remove('active')); }
  function lock(on){ busy=on; btnA.disabled=on; btnD.disabled=on; }

  btnA.addEventListener('click',()=>{
    if(busy) return; lock(true); clearHit(); out.textContent=''; nresnum.textContent='–';
    const a=die(), b=hard.checked?die():0, r=Math.max(a,b);
    const dur=still.matches?0:3000; let t=0, step=70;
    const spin=()=>{
      const i=Math.floor(Math.random()*cards.length);
      cards.forEach((c,ci)=>c.classList.toggle('hit',ci===i));
      rndTick(step); t+=step; step*=1.055;
      if(t<dur) setTimeout(spin,step); else finish();
    };
    function finish(){
      cards.forEach(c=>c.classList.remove('hit'));
      const c=cards[r-1]; c.classList.add('hit','stamp'); rndStamp();
      const dieW=LANG==='en'?'Die ':'Dé ';
      let txt=dieW+(b?a+' · '+b+' → '+r:r)+' : '+NAMES[r-1]+'.';
      if(r===6){ const x=die();
        txt += LANG==='en'
          ? (' Bonus die '+x+(x>=5?' → Swoop activates.':' → no Swoop.'))
          : (' Dé bonus '+x+(x>=5?' → Swoop s\'active.':' → pas de Swoop.'));
      }
      out.textContent=txt;
      c.scrollIntoView({block:'nearest',behavior:still.matches?'auto':'smooth'});
      setTimeout(()=>c.classList.remove('stamp'),900);
      lock(false);
    }
    dur===0?finish():spin();
  });

  btnD.addEventListener('click',()=>{
    if(busy) return; lock(true); clearHit(); out.textContent='';
    const r=die(), prev=PREV[r-1], range=r===1?'1':(r===6?'6':'2-5');
    const dur=still.matches?0:1800; let t=0, step=60;
    scales.classList.add('hit');
    const spin=()=>{
      nresnum.textContent=1+((Math.random()*6)|0);
      rndTick(step); t+=step; step*=1.07;
      if(t<dur) setTimeout(spin,step); else finish();
    };
    function finish(){
      nresnum.textContent=r;
      scaleLines.forEach(p=>p.classList.toggle('active',p.dataset.r===range));
      scales.classList.add('stamp'); rndStamp();
      out.textContent = LANG==='fr'
        ? ('Dragon Scales : dé '+r+' → empêche '+prev+' '+(prev===1?'dégât':'dégâts')+'.')
        : (LANG==='en' ? ('Dragon Scales: die '+r+' → prevent '+prev+' dmg.') : ('Dragon Scales : dé '+r+' → prevent '+prev+' dmg.'));
      scales.scrollIntoView({block:'nearest',behavior:still.matches?'auto':'smooth'});
      setTimeout(()=>scales.classList.remove('stamp'),900);
      lock(false);
    }
    dur===0?finish():spin();
  });
})();

/* --- barres de Health de Naraxus et des héros (cache local) + historique des changements --- */
const NHP=(function(){
  const pop=document.getElementById('nhpop'), inp=document.getElementById('nhinput'), popcur=document.getElementById('nhpopcur');
  const btnDmg=document.getElementById('nhdmg'), btnHeal=document.getElementById('nhheal'), btnClose=document.getElementById('nhpopclose');
  const histEl=document.getElementById('nhhist'), ttl=document.getElementById('nhpopt');
  let active=null;
  const MAXH=60;

  function mkBar(c){
    const box=document.getElementById(c.box), track=document.getElementById(c.track), fill=document.getElementById(c.fill), num=document.getElementById(c.num), reset=document.getElementById(c.reset);
    const B={max:0,cur:0,dead:false,idx:-1,h:[],on:false,c};
    B.save=function(){ try{ localStorage.setItem(c.key,JSON.stringify({idx:B.idx,max:B.max,cur:B.cur,h:B.h,on:B.on})); }catch(e){} };
    B.load=function(){ try{ const r=localStorage.getItem(c.key); if(!r) return null; const o=JSON.parse(r);
      if(o&&typeof o.max==='number'&&o.max>0&&typeof o.cur==='number') return o; }catch(e){} return null; };
    B.paint=function(){
      fill.style.width=(B.max?Math.max(0,Math.min(100,B.cur/B.max*100)):0)+'%';
      num.textContent=B.cur+'/'+B.max; if(active===B) popcur.textContent=B.cur+'/'+B.max;
    };
    B.show=function(on){ box.hidden=!on; box.setAttribute('aria-hidden',on?'false':'true'); };
    B.ignite=function(hp,idx,silent){
      B.max=hp; B.cur=hp; B.dead=false; B.idx=idx==null?0:idx; B.h=[]; B.on=true;
      B.show(true); box.classList.remove('out'); B.paint(); B.save(); if(active===B) renderHist();
      if(!silent){ box.classList.remove('neon-on'); void box.offsetWidth; box.classList.add('neon-on'); sfxIgnite(); }
    };
    B.restore=function(){
      const s=B.load(); if(!s) return false;
      B.idx=typeof s.idx==='number'?s.idx:0; B.max=s.max; B.cur=Math.max(0,Math.min(B.max+10,s.cur)); B.dead=B.cur<=0; B.h=Array.isArray(s.h)?s.h.slice(0,MAXH):[]; B.on=s.on!==false;
      if(c.hideable) B.show(B.on); else B.show(true);
      if(B.dead) box.classList.add('out'); B.paint(); return true;
    };
    reset.addEventListener('click',()=>{
      if(!B.max) return;
      B.cur=B.max; B.dead=false; B.h=[]; box.classList.remove('out'); B.paint(); B.save(); if(active===B) renderHist();
      reset.classList.remove('spin'); void reset.offsetWidth; reset.classList.add('spin');
      box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit'); sfxHeal();
    });
    track.addEventListener('click',()=>openPop(B));
    B.box=box;
    return B;
  }

  function title(B){ return B.c.ally?UI('nara:pop:titleA','Vie des héros'):'Naraxus'; }
  function renderHist(){
    if(!active) return; histEl.textContent='';
    if(!active.h.length){ const li=document.createElement('li'); li.className='empty'; li.textContent=UI('nara:pop:histempty','Aucun changement pour l’instant'); histEl.appendChild(li); return; }
    active.h.forEach(e=>{
      const li=document.createElement('li'), b=document.createElement('b'), s=document.createElement('span');
      b.className=e[0]<0?'d':'h'; b.textContent=(e[0]<0?'−':'+')+Math.abs(e[0]); s.textContent='→ '+e[1]+'/'+active.max;
      li.appendChild(b); li.appendChild(s); histEl.appendChild(li);
    });
  }
  function openPop(B){
    if(!B.max) return; active=B;
    pop.classList.toggle('ally',!!B.c.ally); ttl.textContent=title(B); popcur.textContent=B.cur+'/'+B.max;
    renderHist(); histEl.scrollTop=0;
    pop.hidden=false; requestAnimationFrame(()=>pop.classList.add('on')); inp.value=''; setTimeout(()=>inp.focus(),160);
  }
  function closePop(){ pop.classList.remove('on'); setTimeout(()=>{ if(!pop.classList.contains('on')) pop.hidden=true; },200); }
  btnClose.addEventListener('click',closePop);
  pop.addEventListener('click',e=>{ if(e.target===pop) closePop(); });

  function apply(sign){
    const B=active; if(!B) return;
    const v=parseInt(inp.value,10); if(!v||v<=0) return;
    const before=B.cur, box=B.box;
    B.cur=Math.max(0,Math.min(B.max+10,B.cur+sign*v)); /* soin possible jusqu'à 10 PV au-dessus du max de base */
    const d=B.cur-before;
    if(d!==0){ B.h.unshift([d,B.cur]); if(B.h.length>MAXH) B.h.length=MAXH; }
    B.paint(); B.save();
    box.classList.remove('hit'); void box.offsetWidth; box.classList.add('hit');
    if(B.cur<=0&&before>0){ B.dead=true; box.classList.add('out'); sfxCrackle(); }
    else{ if(B.cur>0&&B.dead){ B.dead=false; box.classList.remove('out'); } sign<0?sfxHit():sfxHeal(); }
    closePop();
  }
  btnDmg.addEventListener('click',()=>apply(-1));
  btnHeal.addEventListener('click',()=>apply(1));
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') apply(-1); });

  /* barre de Naraxus */
  const boss=mkBar({box:'nhealth',track:'nhtrack',fill:'nhfill',num:'nhnum',reset:'nhreset',key:'dtdb.narahp'});
  const hpBtns=[...document.querySelectorAll('.nhp-b')];
  const press=i=>hpBtns.forEach((x,xi)=>x.setAttribute('aria-pressed',xi===i?'true':'false'));
  hpBtns.forEach((b,i)=>b.addEventListener('click',()=>{ boss.ignite(+b.dataset.hp,i); press(i); }));
  if(boss.restore()&&hpBtns[boss.idx]) press(boss.idx); else if(boss.max){ boss.max=0; boss.show(false); }

  /* barre alliée (Health Dial partagé des héros, 50 au départ) : affichable / masquable */
  const ally=mkBar({box:'nhealth2',track:'nhtrack2',fill:'nhfill2',num:'nhnum2',reset:'nhreset2',key:'dtdb.naraally',ally:true,hideable:true});
  const abtn=document.getElementById('naraally');
  function allyUI(){ abtn.classList.toggle('on',ally.on&&ally.max>0); abtn.setAttribute('aria-pressed',ally.on&&ally.max>0?'true':'false'); }
  abtn.addEventListener('click',()=>{
    if(ally.max>0&&ally.on){ ally.on=false; ally.show(false); ally.save(); }
    else if(ally.max>0){ ally.on=true; ally.show(true); ally.save(); const bx=ally.box; bx.classList.remove('neon-on'); void bx.offsetWidth; bx.classList.add('neon-on'); sfxIgnite(); }
    else ally.ignite(50,0);
    allyUI();
  });
  ally.restore(); allyUI();

  return {
    esc(){ if(pop.classList.contains('on')){ closePop(); return true; } return false; },
    refresh(){ if(active&&pop.classList.contains('on')){ ttl.textContent=title(active); renderHist(); } }
  };
})();

/* --- jetons glissables sur Naraxus : fenêtre de recherche + calque de jetons posés --- */
const NTK=(function(){
  const layer=document.getElementById('ntklayer'), pick=document.getElementById('ntkpick'), btn=document.getElementById('naratk');
  const search=document.getElementById('ntksearch'), grid=document.getElementById('ntkgrid'), chips=document.getElementById('ntkchips');
  const KEY='dtdb.naratk', MAX=60;
  let placed=[], uid=1, built=false, filt='all', suppress=0;
  const TKD=DATA.tokens||{};
  const ids=Object.keys(TKD).filter(id=>TKD[id].icon);
  const nz=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const nm=id=>trTokName(id,TKD[id]);
  const byU=u=>placed.find(p=>p.u===u);

  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(placed)); }catch(e){} }
  function load(){ try{ const a=JSON.parse(localStorage.getItem(KEY)||'[]'); if(Array.isArray(a)) placed=a.filter(p=>p&&TKD[p.id]&&typeof p.x==='number'&&typeof p.y==='number').slice(0,MAX).map(p=>({u:uid++,id:p.id,x:p.x,y:p.y})); }catch(e){} }

  /* zone libre = colonne centrale entre les règles et les attaques (écran entier si elle est masquée) */
  function zone(){
    const m=document.querySelector('.nb-mid'), W=naraEl.clientWidth, H=naraEl.clientHeight, r=m?m.getBoundingClientRect():null;
    if(r&&r.width>40) return {l:r.left,w:r.width,h:H,t:62};
    return {l:0,w:W,h:H,t:62};
  }
  const S=()=>parseFloat(getComputedStyle(naraEl).getPropertyValue('--tks'))||66;
  function toPx(p,z){ return {x:z.l+p.x*z.w,y:p.y*z.h}; }
  function fromPx(x,y,z){
    const s=S()/2;
    const cx=Math.max(z.l+s,Math.min(z.l+z.w-s,x)), cy=Math.max(z.t+s,Math.min(z.h-s,y));
    return {x:(cx-z.l)/z.w,y:cy/z.h};
  }
  function place(el,p,z){ const q=toPx(p,z); el.style.left=q.x+'px'; el.style.top=q.y+'px'; }
  function posAll(){ const z=zone(); layer.querySelectorAll('.ntk').forEach(el=>{ const p=byU(+el.dataset.u); if(p) place(el,p,z); }); }

  function mkTok(p){
    const el=document.createElement('div'); el.className='ntk'; el.dataset.u=p.u; el.dataset.id=p.id;
    const im=document.createElement('img'); im.alt=''; im.draggable=false; im.src=TKD[p.id].icon; el.appendChild(im);
    const x=document.createElement('button'); x.type='button'; x.className='ntk-x'; x.textContent='×'; x.setAttribute('aria-label',UI('nara:tk:del','Retirer ce jeton')); x.title=UI('nara:tk:del','Retirer ce jeton'); el.appendChild(x);
    const n=document.createElement('span'); n.className='ntk-n'; n.textContent=nm(p.id); el.appendChild(n);
    el.title=nm(p.id);
    el.style.zIndex=placed.indexOf(p)+1; el.addEventListener('animationend',()=>{ el.style.animation='none'; },{once:true});
    place(el,p,zone()); layer.appendChild(el); return el;
  }
  function add(id,x,y){
    if(placed.length>=MAX){ const o=placed.shift(), oe=layer.querySelector('.ntk[data-u="'+o.u+'"]'); if(oe) oe.remove(); }
    const z=zone(); let q;
    if(x==null){ const k=placed.length%6; q={x:.5+(k%3-1)*.17,y:.3+Math.floor(k/3)*.12+(k%2)*.03}; }
    else q=fromPx(x,y,z);
    const p={u:uid++,id,x:q.x,y:q.y}; placed.push(p); mkTok(p); save(); return p;
  }
  function remove(u){
    const el=layer.querySelector('.ntk[data-u="'+u+'"]'); placed=placed.filter(p=>p.u!==u); save();
    if(el){ el.classList.add('out'); setTimeout(()=>el.remove(),220); }
  }
  function clearSel(except){ layer.querySelectorAll('.ntk.sel').forEach(e=>{ if(e!==except) e.classList.remove('sel'); }); }

  /* --- jetons posés : glisser pour déplacer, clic pour afficher la croix (la croix fait partie du jeton : on peut aussi le saisir par elle) --- */
  let zTop=100;
  layer.addEventListener('pointerdown',e=>{
    const el=e.target.closest('.ntk'); if(!el||e.button>0) return;
    const p=byU(+el.dataset.u); if(!p) return;
    const onX=!!e.target.closest('.ntk-x');
    const z0=zone(), q=toPx(p,z0), ox=e.clientX-q.x, oy=e.clientY-q.y, sx=e.clientX, sy=e.clientY; let moved=false;
    const mv=ev=>{
      if(ev.pointerId!==e.pointerId) return;
      if(!moved){ if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<6) return; moved=true; el.classList.add('drag'); el.classList.remove('sel'); el.style.zIndex=++zTop; placed=placed.filter(x=>x!==p); placed.push(p); }
      const z=zone(), np=fromPx(ev.clientX-ox,ev.clientY-oy,z); p.x=np.x; p.y=np.y; place(el,p,z);
      pick.classList.toggle('rm',pickOpen()&&over(pick,ev.clientX,ev.clientY));
      ev.preventDefault();
    };
    const up=ev=>{
      if(ev.pointerId!==e.pointerId) return;
      document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); document.removeEventListener('pointercancel',up);
      pick.classList.remove('rm');
      if(moved){ el.classList.remove('drag'); if(ev.type==='pointerup'&&pickOpen()&&over(pick,ev.clientX,ev.clientY)) remove(p.u); else save(); }
      else if(ev.type==='pointerup'){
        if(onX&&el.classList.contains('sel')) remove(p.u);
        else { const was=el.classList.contains('sel'); clearSel(); el.classList.toggle('sel',!was); }
      }
    };
    document.addEventListener('pointermove',mv,{passive:false}); document.addEventListener('pointerup',up); document.addEventListener('pointercancel',up);
    e.preventDefault();
  });
  document.addEventListener('pointerdown',e=>{ if(!e.target.closest||!e.target.closest('.ntk')) clearSel(); },true);

  /* --- fenêtre de recherche --- */
  const pickOpen=()=>pick.classList.contains('on');
  const over=(el,x,y)=>{ const r=el.getBoundingClientRect(); return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom; };
  function layoutPick(){
    const z=zone(), narrow=z.w<330;
    if(narrow){ pick.style.left='8px'; pick.style.width=(naraEl.clientWidth-16)+'px'; }
    else { pick.style.left=(z.l+4)+'px'; pick.style.width=Math.min(z.w-8,560)+'px'; }
  }
  const KINDS=[['all','nara:tk:all','Tous'],['negative','kind:negative','Négatif'],['positive','kind:positive','Positif'],['other','nara:tk:other','Autres']];
  function build(){
    built=true; grid.textContent='';
    ids.forEach(id=>{
      const li=document.createElement('li'), b=document.createElement('button'); b.type='button'; b.className='ntkp-it'; b.dataset.id=id;
      const im=document.createElement('img'); im.alt=''; im.draggable=false; im.src=TKD[id].icon; b.appendChild(im);
      const sp=document.createElement('span'); b.appendChild(sp); li.appendChild(b); grid.appendChild(li);
    });
    const em=document.createElement('li'); em.className='ntkp-empty'; em.hidden=true; grid.appendChild(em); grid._em=em;
    chips.textContent='';
    KINDS.forEach(k=>{ const c=document.createElement('button'); c.type='button'; c.dataset.k=k[0]; c.setAttribute('aria-pressed',String(k[0]===filt)); chips.appendChild(c); });
    texts(); filter();
  }
  function texts(){
    if(!built) return;
    grid.querySelectorAll('.ntkp-it').forEach(b=>{ const n=nm(b.dataset.id); b.querySelector('span').textContent=n; b.title=n; });
    chips.querySelectorAll('button').forEach((c,i)=>{ const k=KINDS[i]; c.textContent=k[0]==='negative'||k[0]==='positive'?trKind(k[0],KIND[k[0]]||k[2]):UI(k[1],k[2]); });
    grid._em.textContent=UI('nara:tk:none','Aucun jeton trouvé');
  }
  function filter(){
    const q=nz(search.value); let n=0;
    grid.querySelectorAll('.ntkp-it').forEach(b=>{
      const id=b.dataset.id, t=TKD[id], ty=t.type;
      const kOK=filt==='all'||(filt==='other'?(ty!=='negative'&&ty!=='positive'):ty===filt);
      const qOK=!q||nz(nm(id)).includes(q)||nz(t.name).includes(q)||id.includes(q.replace(/ /g,'-'));
      b.parentNode.hidden=!(kOK&&qOK); if(kOK&&qOK) n++;
    });
    grid._em.hidden=n>0;
  }
  function openPick(on){
    if(on&&!built) build();
    if(on){ layoutPick(); pick.hidden=false; requestAnimationFrame(()=>pick.classList.add('on')); setTimeout(()=>search.focus({preventScroll:true}),180); }
    else{ pick.classList.remove('on'); setTimeout(()=>{ if(!pick.classList.contains('on')) pick.hidden=true; },270); }
    btn.classList.toggle('on',on); btn.setAttribute('aria-pressed',String(on)); btn.setAttribute('aria-expanded',String(on));
  }
  btn.addEventListener('click',()=>openPick(!pickOpen()));
  document.getElementById('ntkclose').addEventListener('click',()=>openPick(false));
  document.getElementById('ntkclear').addEventListener('click',e=>{
    const b=e.currentTarget;
    if(!b.classList.contains('armed')){ b.classList.add('armed'); b.textContent=UI('nara:tk:clear2','Confirmer ?'); clearTimeout(b._t); b._t=setTimeout(()=>{ b.classList.remove('armed'); b.textContent=UI('nara:tk:clear','Tout retirer'); },2800); return; }
    clearTimeout(b._t); b.classList.remove('armed'); b.textContent=UI('nara:tk:clear','Tout retirer');
    placed.slice().forEach(p=>remove(p.u));
  });
  search.addEventListener('input',filter);
  chips.addEventListener('click',e=>{ const c=e.target.closest('button'); if(!c) return; filt=c.dataset.k; chips.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===c))); filter(); });

  /* glisser un jeton de la fenêtre vers le boss (clic simple = l'ajouter au centre) */
  grid.addEventListener('pointerdown',e=>{
    const it=e.target.closest('.ntkp-it'); if(!it||e.button>0||e.pointerType==='touch') return;
    const id=it.dataset.id, sx=e.clientX, sy=e.clientY; let ghost=null;
    const mv=ev=>{
      if(!ghost){ if(Math.hypot(ev.clientX-sx,ev.clientY-sy)<6) return;
        ghost=document.createElement('div'); ghost.className='ntk-ghost'; const im=document.createElement('img'); im.alt=''; im.src=TKD[id].icon; ghost.appendChild(im); naraEl.appendChild(ghost); it.classList.add('dragsrc'); }
      ghost.style.left=ev.clientX+'px'; ghost.style.top=ev.clientY+'px'; pick.classList.toggle('cancel',over(pick,ev.clientX,ev.clientY)); ev.preventDefault();
    };
    const up=ev=>{
      document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); document.removeEventListener('pointercancel',up);
      pick.classList.remove('cancel');
      if(ghost){ ghost.remove(); it.classList.remove('dragsrc'); suppress=Date.now()+350; if(ev.type==='pointerup'&&!over(pick,ev.clientX,ev.clientY)) add(id,ev.clientX,ev.clientY); }
    };
    document.addEventListener('pointermove',mv,{passive:false}); document.addEventListener('pointerup',up); document.addEventListener('pointercancel',up);
  });
  grid.addEventListener('click',e=>{ const it=e.target.closest('.ntkp-it'); if(!it||Date.now()<suppress) return; add(it.dataset.id); });
  grid.addEventListener('dragstart',e=>e.preventDefault());

  load(); placed.forEach(mkTok);
  window.addEventListener('resize',()=>{ posAll(); if(pickOpen()) layoutPick(); });

  return {
    esc(){ if(pickOpen()){ openPick(false); return true; } return false; },
    refresh(){ texts(); layer.querySelectorAll('.ntk').forEach(el=>{ const n=nm(el.dataset.id); el.title=n; el.querySelector('.ntk-n').textContent=n; const x=el.querySelector('.ntk-x'); x.title=UI('nara:tk:del','Retirer ce jeton'); x.setAttribute('aria-label',x.title); });
      const cl=document.getElementById('ntkclear'); if(!cl.classList.contains('armed')) cl.textContent=UI('nara:tk:clear','Tout retirer'); },
    pos:posAll, count:()=>placed.length
  };
})();
function naraXEsc(){ return NHP.esc()||NTK.esc(); }
function naraXRefresh(){ NHP.refresh(); NTK.refresh(); }

/* --- ambiance sonore de Naraxus : lecture/pause du MP3 (bouton du bandeau du haut) --- */
const musicBtn=document.getElementById('naramusic'), musicAudio=document.getElementById('naraaudio');
if(musicAudio) musicAudio.volume=.55;
function refreshMusicBtn(){
  if(!musicBtn||!musicAudio) return;
  const on=!musicAudio.paused;
  musicBtn.classList.toggle('playing',on);
  musicBtn.setAttribute('aria-pressed',on?'true':'false');
  const t=on?UI('nara:top:music:pause',"Coupe l'ambiance sonore de Naraxus")
            :UI('nara:top:music:play',"Joue l'ambiance sonore de Naraxus (MP3, en boucle)");
  musicBtn.title=t; musicBtn.setAttribute('aria-label',t);
}
if(musicBtn&&musicAudio){
  musicBtn.addEventListener('click',()=>{
    if(musicAudio.paused) musicAudio.play().catch(()=>{}); else musicAudio.pause();
  });
  musicAudio.addEventListener('play',refreshMusicBtn);
  musicAudio.addEventListener('pause',refreshMusicBtn);
  refreshMusicBtn();
}

/* les cartes/dmg de Naraxus sont déjà stylées à la main : on ne colore ici que les phases */
tintPhases(naraEl);

/* braises et cendres : canvas plein écran, au premier plan */
const EMB=(()=>{
  const cv=document.getElementById('embers'), cx=cv.getContext('2d');
  let W=0,Hh=0,run=false,last=0,t=0,acc=[0,0],nextBurst=.5,raf=0; const P=[];
  const spr=(k,tone)=>{const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
    if(k==='e'){const gr=g.createRadialGradient(32,32,0,32,32,32);
      gr.addColorStop(0,'rgba(255,244,214,1)');gr.addColorStop(.16,'rgba(255,196,96,.95)');gr.addColorStop(.42,'rgba(255,112,32,.4)');gr.addColorStop(1,'rgba(255,60,0,0)');
      g.fillStyle=gr; g.fillRect(0,0,64,64);}
    else{g.fillStyle=tone; g.beginPath(); const n=6+((Math.random()*3)|0);
      for(let i=0;i<n;i++){const a=i/n*6.283, r=(i%2?11:26)*(.7+Math.random()*.5); g.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r*.6);} g.closePath(); g.fill();}
    return c;};
  const EM=spr('e'), ASH=['#8d877d','#aaa398','#6e6961','#c1b9ac'].map(c=>spr('a',c));
  function size(){const d=Math.min(devicePixelRatio||1,2); W=innerWidth; Hh=innerHeight; cv.width=W*d; cv.height=Hh*d; cx.setTransform(d,0,0,d,0,0);}
  const rate=()=>still.matches?.35:1;
  function spawn(kind,x,warm){
    const e=kind==='e', r=Math.random, near=r()<.1;
    const p={k:kind,x:x!=null?x:r()*W,y:Hh+8+r()*26,vy:-(e?45+r()*140:20+r()*55),vx:(r()-.5)*24,
      s:(e?3+r()*8:4+r()*8)*(near?2.6:1),near,age:0,max:e?2.4+r()*4.6:5+r()*7,
      ph:r()*6.283,wob:e?6+r()*32:14+r()*46,wf:.5+r()*2.2,rot:r()*6.283,vr:(r()-.5)*2.6,fl:r()*9,sp:(r()*ASH.length)|0};
    if(warm){ p.age=r()*p.max*.7; p.y=Hh*(.05+.95*r()); }
    if(P.length<260) P.push(p);
  }
  function burst(){const n=6+((Math.random()*16)|0), cx0=Math.random()*W, sp=70+Math.random()*220;
    for(let i=0;i<n;i++) spawn(Math.random()<.72?'e':'a',cx0+(Math.random()-.5)*sp);}
  function frame(ts){
    if(!run) return; raf=requestAnimationFrame(frame);
    if(document.hidden){last=ts; return;}
    const dt=Math.min(.05,(ts-last)/1000||.016); last=ts; t+=dt;
    const sm=still.matches?.5:1, R=rate();
    const lull=.4+.6*(.5+.5*Math.sin(t*.4)*Math.sin(t*.17+1));      // respiration irrégulière du feu
    acc[0]+=dt*17*lull*R; acc[1]+=dt*7*lull*R;
    while(acc[0]>=1){acc[0]-=1; spawn('e');} while(acc[1]>=1){acc[1]-=1; spawn('a');}
    nextBurst-=dt; if(nextBurst<=0){ if(R>.5) burst(); nextBurst=.6+Math.random()*3.2; }
    const wind=Math.sin(t*.23)*18+Math.sin(t*.61+2)*9;
    cx.clearRect(0,0,W,Hh);
    for(let i=P.length-1;i>=0;i--){
      const p=P[i]; p.age+=dt; const u=p.age/p.max;
      if(u>=1||p.y<-30){P.splice(i,1); continue;}
      if(Math.random()<dt*.16){p.vx+=(Math.random()-.5)*110; p.vy+=(Math.random()-.5)*36;}   // rafales erratiques
      p.vx*=1-.6*dt; if(p.k==='e') p.vy*=1-.1*dt;
      p.x+=(p.vx+wind*(p.k==='a'?1.4:1)+Math.sin(t*p.wf+p.ph)*p.wob)*dt*sm; p.y+=p.vy*dt*sm; p.rot+=p.vr*dt;
      const fin=Math.min(1,u/.08), fout=Math.pow(1-Math.max(0,(u-.45)/.55),1.3);
      if(p.k==='e'){
        const fl=.62+.38*Math.sin(t*(8+p.fl)+p.fl*3)*Math.sin(t*3.1+p.ph);
        const a=fin*fout*Math.max(.15,fl)*(p.near?.32:1), s=p.s*(1-.45*u);
        cx.globalCompositeOperation='lighter'; cx.globalAlpha=Math.min(1,a); cx.drawImage(EM,p.x-s,p.y-s,s*2,s*2);
      } else {
        const a=fin*fout*(p.near?.16:.5); cx.globalCompositeOperation='source-over'; cx.globalAlpha=a;
        cx.save(); cx.translate(p.x,p.y); cx.rotate(p.rot); cx.scale(1,.55+.45*Math.abs(Math.sin(t*1.3+p.ph)));
        const s=p.s; cx.drawImage(ASH[p.sp],-s,-s,s*2,s*2); cx.restore();
      }
    }
    cx.globalAlpha=1; cx.globalCompositeOperation='source-over';
  }
  return {
    start(){ if(run||IDLE.off) return; size(); run=true; last=performance.now(); P.length=0; for(let i=0;i<70;i++) spawn(Math.random()<.7?'e':'a',null,true); raf=requestAnimationFrame(frame); },
    stop(){ run=false; cancelAnimationFrame(raf); cx.clearRect(0,0,W,Hh); },
    size, count:()=>P.length, running:()=>run
  };
})();
window.addEventListener('resize',()=>{ if(EMB.running()) EMB.size(); });

let naraPrev='heroes';
function naraSel(on){ tabs.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',on?(b.dataset.pane==='nara'?'true':'false'):(b.dataset.pane===naraPrev?'true':'false'))); }
function openNara(){
  if(naraOpen) return; naraOpen=true;
  const sel=tabs.querySelector('[aria-selected="true"]'); naraPrev=sel&&sel.dataset.pane!=='nara'?sel.dataset.pane:'heroes';
  naraSel(true); naraRules.hidden=true; document.getElementById('nararulesbtn').setAttribute('aria-expanded','false');
  naraEl.classList.add('on'); naraEl.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  fx.style.zIndex=9; EMB.start(); document.getElementById('naraexit').focus({preventScroll:true});
}
function closeNara(){
  if(!naraOpen) return; naraOpen=false;
  try{ NTK.esc(); NHP.esc(); }catch(e){}
  naraEl.classList.remove('on'); naraEl.setAttribute('aria-hidden','true'); document.body.style.overflow=''; fx.style.zIndex='';
  if(typeof musicAudio!=='undefined'&&musicAudio&&!musicAudio.paused) musicAudio.pause();
  showPane(naraPrev); setTimeout(()=>{ if(!naraOpen) EMB.stop(); },440);
}
document.getElementById('naraexit').addEventListener('click',closeNara);
document.getElementById('nararulesbtn').addEventListener('click',()=>{
  naraRules.hidden=!naraRules.hidden; document.getElementById('nararulesbtn').setAttribute('aria-expanded',naraRules.hidden?'false':'true');
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&naraOpen){ if(naraXEsc()) return; if(!naraRules.hidden){ naraRules.hidden=true; document.getElementById('nararulesbtn').setAttribute('aria-expanded','false'); } else closeNara(); } });

document.querySelectorAll('.narabtn').forEach(b=>b.addEventListener('click',()=>{b.classList.remove('zap'); void b.offsetWidth; b.classList.add('zap'); setTimeout(()=>b.classList.remove('zap'),560);}));
toksEl.addEventListener('click',e=>{const li=e.target.closest('.tokli'); if(li) openTok(li.dataset.id,li.querySelector('.disc'));});

/* page d'un jeton */
function setFold(open){
  fold.classList.toggle('open',open); foldbtn.setAttribute('aria-expanded',open?'true':'false'); foldbody.inert=!open;
}
foldbtn.addEventListener('click',()=>setFold(!fold.classList.contains('open')));
/* jeton « Vault » : une seule entrée (image du tas) ; sa page détaille les 4 jetons séparés */
function vaultSubs(id,t){
  const box=mk('div','vsubs');
  const ln=txt=>{ const p=mk('p'), k=txt.indexOf(' — ');
    if(k>0){ p.appendChild(mk('span','vl',txt.slice(0,k))); p.appendChild(document.createTextNode(txt.slice(k))); } else p.textContent=txt; return p; };
  t.subs.forEach((x,k)=>{
    const row=mk('div','vsub'), im=document.createElement('img'), b=mk('div','vsb');
    im.src=x.icon; im.alt=''; im.draggable=false; row.appendChild(im);
    b.appendChild(mk('h4',null,x.name));
    b.appendChild(ln(tr('tok:'+id+':sub:'+k+':w',x.w))); b.appendChild(ln(tr('tok:'+id+':sub:'+k+':l',x.l)));
    row.appendChild(b); box.appendChild(row);
  });
  return box;
}
function fillTok(id){
  const t=TK[id];
  tokbig.src=t.icon; tokbig.alt=trTokName(id,t);
  tokstage.style.setProperty('--tint',TINT[t.type]||TINT.unique);
  dplate.hidden=true; dname.hidden=false; dname.textContent=trTokName(id,t); ddice.hidden=true;
  dmeta.textContent=(trKind(t.type,KIND[t.type]||t.type))+((t.stack||t.lim)?' · '+stackTxt(t):'');
  renderTokDesc(tshort,id,((t.short&&!t.tpfull)?tr('tok:'+id+':short',t.short):tr('tok:'+id+':desc',t.desc))||'');
  const tlv=document.getElementById('tlv'); tlv.textContent=''; if(t.lv) tlv.appendChild(armLines(armorLv(id,t.lv))); if(id==='armor') tlv.appendChild(armorCraftBlock());
  if(t.subs) tlv.appendChild(vaultSubs(id,t));
  const tpm=document.getElementById('tpmeta'); tpm.textContent=(trKind(t.type,KIND[t.type]||t.type))+((t.stack||t.lim)?' · '+stackTxt(t):''); tpm.className='tpmeta '+t.type;
  tnotes.innerHTML='';
  (t.notes||[]).forEach((n,ni)=>{const li=document.createElement('li'); li.textContent=tr('tok:'+id+':note:'+ni,n); tnotes.appendChild(li);});
  document.getElementById('tdetsec').hidden=!(t.notes&&t.notes.length);
  if(id==='armor'||id==='ore'){ tintGems(tshort); tintGems(tnotes); }
  if(t.subs){ tintPhases(tlv); tintDmg(tlv); tintHeal(tlv); frFix(tlv); }
  tintPhases(tshort); tintDmg(tshort); tintHeal(tshort); tintPhases(tnotes); tintDmg(tnotes); tintHeal(tnotes); frFix(tshort); frFix(tnotes);
  linkToks(tshort,tids,id); linkToks(tnotes,tids,id);
  if(id==='corpse'||id==='undead'){ tintUndeadNames(tshort); tintUndeadNames(tnotes); }
  document.getElementById('nvmsec').hidden=id!=='nevermore'; if(id==='nevermore') nvmRoll();
  setFold(false); fillTokHeroes(id);
  rail.querySelectorAll('button').forEach(b=>
    b.setAttribute('aria-current',b.dataset.k==='token'&&b.dataset.id===id?'true':'false'));
  const cur=rail.querySelector('[aria-current="true"]');
  if(cur) cur.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
function onScreen(el){
  if(!el||!el.isConnected) return false;
  const r=el.getBoundingClientRect();
  return r.width>0&&r.bottom>0&&r.top<innerHeight;
}
function tokDisc(id){
  if(onScreen(tokSrc)) return tokSrc;
  const d=toksEl.querySelector('.tokli[data-id="'+id+'"] .disc');
  return onScreen(d)?d:null;
}
function tokGhost(rect,id){
  const g=makeGhost(rect,'50%'), gi=document.createElement('img');
  gi.src=TK[id].icon; g.appendChild(gi); return g;
}
function unghostToks(){toksEl.querySelectorAll('.disc.ghosted').forEach(d=>{d.style.transition='none'; d.classList.remove('ghosted'); void d.offsetWidth; d.style.transition='';});}
function openTok(id,src){
  if(busy||!TK[id]) return;
  const wasOpen=detail.classList.contains('on')&&!!current;
  const pre=(wasOpen&&src&&onScreen(src))?src.getBoundingClientRect():null;
  tokFrom=wasOpen?current:null;
  detail.classList.add('tokmode'); current=null; curTok=id; tokSrc=src||null;
  const fillNow=()=>{ document.getElementById('back').textContent=tokFrom?'← '+HA.find(x=>x.id===tokFrom).name:'← '+UI('back:alltokens','Tous les jetons'); slides.innerHTML=''; fillTok(id); };
  const disc=pre?null:tokDisc(id);
  if(still.matches||(!pre&&!disc)){
    fillNow();
    detail.classList.add('on'); detail.setAttribute('aria-hidden','false');
    browse.classList.add('dim'); document.body.style.overflow='hidden'; return;
  }
  busy=true;
  const from=pre||disc.getBoundingClientRect(), to=tokbig.getBoundingClientRect();
  const g=tokGhost(from,id);
  if(disc&&toksEl.contains(disc)) disc.classList.add('ghosted');
  browse.classList.add('dim');
  caption.style.opacity='0'; tokpanel.style.opacity='0'; tokbig.style.opacity='0';
  if(pre) tokpanel.style.transform='translateX(34px)';
  requestAnimationFrame(()=>{
    g.style.transition='left '+MORPH+'ms '+MO+',top '+MORPH+'ms '+MO+',width '+MORPH+'ms '+MO+',height '+MORPH+'ms '+MO;
    g.style.left=to.left+'px'; g.style.top=to.top+'px'; g.style.width=to.width+'px'; g.style.height=to.height+'px';
  });
  setTimeout(()=>{
    fillNow();
    detail.classList.add('on'); detail.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>{caption.style.opacity='1'; tokpanel.style.opacity='1'; tokpanel.style.transform='';});
  },320);
  setTimeout(()=>{
    tokbig.style.opacity='1';
    requestAnimationFrame(()=>requestAnimationFrame(()=>g.remove()));
    document.body.style.overflow='hidden'; busy=false;
  },MORPH);
}
function backToHero(){
  const h=HA.find(x=>x.id===tokFrom), id=curTok;
  const from=tokbig.getBoundingClientRect(), g=still.matches?null:tokGhost(from,id);
  tokFrom=null; tokSrc=null;
  caption.style.opacity='0'; panelbody.style.opacity='0';
  const reveal=()=>{
    curTok=null; current=h.id;
    detail.classList.remove('tokmode');
    document.getElementById('back').textContent=backLbl(h);
    slides.innerHTML=''; const im=document.createElement('img'); im.src=h.art; im.alt=trHeroName(h); slides.appendChild(im);
    fill(h); tokpanel.style.transform='';
    requestAnimationFrame(()=>{caption.style.opacity='1'; panelbody.style.opacity='1';});
  };
  if(still.matches){ reveal(); } else setTimeout(reveal,320);
  const chip=s2.querySelector('.tok[data-tid="'+id+'"] .tokbtn img');
  if(!g) return;
  if(!chip||!onScreen(chip)){g.remove(); return;}
  busy=true; chip.style.opacity='0';
  requestAnimationFrame(()=>{
    const to=chip.getBoundingClientRect();
    g.style.transition='left '+MORPH+'ms '+MO+',top '+MORPH+'ms '+MO+',width '+MORPH+'ms '+MO+',height '+MORPH+'ms '+MO;
    g.style.left=to.left+'px'; g.style.top=to.top+'px'; g.style.width=to.width+'px'; g.style.height=to.height+'px';
  });
  setTimeout(()=>{chip.style.opacity=''; g.remove(); busy=false;},MORPH);
}
function closeTok(){
  if(tokFrom) return backToHero();
  const id=curTok, disc=tokDisc(id);
  browse.classList.remove('dim'); document.body.style.overflow='';
  const fin=()=>{detail.classList.remove('tokmode'); unghostToks(); curTok=null; tokSrc=null;};
  if(!disc||still.matches){
    detail.classList.remove('on'); detail.setAttribute('aria-hidden','true'); fin(); return;
  }
  busy=true;
  const from=tokbig.getBoundingClientRect(), to=disc.getBoundingClientRect();
  const g=tokGhost(from,id);
  detail.classList.remove('on'); detail.setAttribute('aria-hidden','true');
  requestAnimationFrame(()=>{
    g.style.transition='left '+MORPH+'ms '+MO+',top '+MORPH+'ms '+MO+',width '+MORPH+'ms '+MO+',height '+MORPH+'ms '+MO;
    g.style.left=to.left+'px'; g.style.top=to.top+'px'; g.style.width=to.width+'px'; g.style.height=to.height+'px';
  });
  setTimeout(()=>{fin(); dropGhost(g); busy=false;},MORPH);
}
s2.addEventListener('click',e=>{const b=e.target.closest('.tokbtn,.tokname'); const row=b&&b.closest('.tok'); if(row) openTok(row.dataset.tid,row.querySelector('.tokbtn img'));});
/* ---------- tags de style : zone « mêmes tags » + saut vers un autre héros ---------- */
function fillPop(inner,id){
  const d=TG[id]||{label:id,desc:''};
  const others=H.filter(x=>x.id!==current&&x.tags&&x.tags.includes(id));
  inner.innerHTML='';
  const p=document.createElement('p'); p.className='tagdesc';
  const b=document.createElement('b'); b.textContent=trTag(id,d.label); p.appendChild(b); p.appendChild(document.createTextNode(' : '+trTagDesc(id,d.desc)));
  inner.appendChild(p);
  const row=document.createElement('div'); row.className='tagheroes';
  others.forEach(x=>{
    const bt=document.createElement('button'),im=document.createElement('img');
    bt.type='button'; bt.className='tagh'; bt.dataset.id=x.id; bt.title=trHeroName(x); bt.setAttribute('aria-label','Ouvrir '+trHeroName(x));
    im.src=x.icon; im.alt=''; bt.appendChild(im); row.appendChild(bt);
  });
  inner.appendChild(row);
  const n=document.createElement('p'); n.className='tagn';
  n.textContent=others.length?others.length+' autre'+(others.length>1?'s':'')+' héros avec ce tag':'Aucun autre héros avec ce tag';
  inner.appendChild(n);
}
function toggleTag(tb){
  const wrap=tb.closest('.tagwrap'), pop=wrap.querySelector('.tagpop'), same=tb.getAttribute('aria-pressed')==='true';
  wrap.querySelectorAll('.tag').forEach(b=>b.setAttribute('aria-pressed','false'));
  if(same){ pop.classList.remove('open'); pop.inert=true; return; }
  tb.setAttribute('aria-pressed','true'); fillPop(pop.firstChild,tb.dataset.tag); pop.classList.add('open'); pop.inert=false;
}
function heroFromIcon(id,srcEl){
  if(busy||id===current) return; const h=HA.find(x=>x.id===id); if(!h) return; if(artWait(h,()=>heroFromIcon(id,srcEl))) return;
  const prev=discOf(current); if(prev) prev.classList.remove('ghosted');
  const nxt=discOf(id); if(nxt) nxt.classList.add('ghosted');
  const setImg=()=>{slides.innerHTML=''; const a=document.createElement('img'); a.src=h.art; a.alt=trHeroName(h); slides.appendChild(a);};
  if(still.matches||!srcEl||!onScreen(srcEl)){ current=id; setImg(); fill(h); return; }
  busy=true; current=id;
  const from=srcEl.getBoundingClientRect(), to=stage.getBoundingClientRect();
  const g=makeGhost(from,'50%'), gi=addArt(g,h.art);
  putImg(gi,frameIcon(h.g,from.width,from.height));
  const sh=ghostShade(g,0,1,h);
  caption.style.opacity='0'; panelbody.style.opacity='0';
  requestAnimationFrame(()=>{ sh();
    const box='left '+MORPH+'ms '+MO+',top '+MORPH+'ms '+MO+',width '+MORPH+'ms '+MO+',height '+MORPH+'ms '+MO;
    g.style.transition=box+',border-radius '+MORPH+'ms '+RIN+' '+Math.round(MORPH*0.18)+'ms';
    g.style.left=to.left+'px'; g.style.top=to.top+'px'; g.style.width=to.width+'px'; g.style.height=to.height+'px';
    g.style.borderRadius='0';
    gi.style.transition=box; putImg(gi,frameCover(h.g,to.width,to.height));
  });
  setTimeout(()=>{ fill(h); caption.style.opacity='1'; panelbody.style.opacity='1'; },320);
  setTimeout(()=>{
    slides.style.transition='none'; slides.style.opacity='0'; setImg();
    requestAnimationFrame(()=>{ slides.style.opacity='1';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{g.remove(); slides.style.transition='';}));
    });
    busy=false;
  },MORPH);
}
s1.addEventListener('click',e=>{
  const tb=e.target.closest('.tag'); if(tb){ toggleTag(tb); return; }
  const hb=e.target.closest('.tagh'); if(hb) heroFromIcon(hb.dataset.id,hb);
});

/* ---------- jetons : filtres par catégorie, héros associés ---------- */
const TH=DATA.tokheroes||{};
const tchips=document.getElementById('tchips'), tsel=new Set();
TORDER.filter(k=>tids.some(i=>TK[i].type===k)).forEach(k=>{
  const b=document.createElement('button'); b.className='chip'; b.dataset.k=k; b.setAttribute('aria-pressed','false'); b.textContent=KIND[k]||k; tchips.appendChild(b);
});
function applyTokFilter(){
  let n=0;
  toksEl.querySelectorAll('.tokli').forEach(li=>{
    const show=!tsel.size||tsel.has(TK[li.dataset.id].type);
    if(show&&li.hidden){li.classList.remove('in'); void li.offsetWidth; li.classList.add('in');}
    li.hidden=!show; if(show) n++;
  });
  document.getElementById('tcount').innerHTML='<b>'+n+'</b> jeton'+(n>1?'s':'')+(tsel.size?' — '+[...tsel].map(k=>KIND[k]||k).join(', '):'')+'.';
}
tchips.addEventListener('click',e=>{
  const b=e.target.closest('.chip'); if(!b) return; const k=b.dataset.k;
  tsel.has(k)?tsel.delete(k):tsel.add(k); b.setAttribute('aria-pressed',tsel.has(k)?'true':'false'); applyTokFilter();
});
function fillTokHeroes(id){
  const ids=(TH[id]||[]).filter(x=>HA.some(h=>h.id===x));
  const row=document.getElementById('theroes'), sec=document.getElementById('theroessec');
  row.innerHTML=''; sec.hidden=!ids.length; if(!ids.length) return;
  ids.forEach(hid=>{const x=HA.find(h=>h.id===hid);
    const bt=document.createElement('button'),im=document.createElement('img');
    bt.type='button'; bt.className='tagh'; bt.dataset.id=x.id; bt.title=trHeroName(x); bt.setAttribute('aria-label','Ouvrir '+trHeroName(x));
    im.src=x.icon; im.alt=''; bt.appendChild(im); row.appendChild(bt);});
}
let heroFromTokId=null;
function heroFromTok(id,srcEl){
  if(busy||!curTok) return; const h=HA.find(x=>x.id===id); if(!h) return; if(artWait(h,()=>heroFromTok(id,srcEl))) return;
  const tid=curTok;
  const swap=()=>{
    heroFromTokId=tid; detail.classList.remove('tokmode'); curTok=null; tokSrc=null; current=id; unghostToks();
    document.getElementById('back').textContent='← '+trTokName(tid,TK[tid]);
    slides.innerHTML=''; const a=document.createElement('img'); a.src=h.art; a.alt=trHeroName(h); slides.appendChild(a); fill(h);
  };
  if(still.matches||!onScreen(srcEl)){ swap(); return; }
  busy=true;
  const from=srcEl.getBoundingClientRect(), to=stage.getBoundingClientRect();
  const g=makeGhost(from,'50%'), gi=addArt(g,h.art);
  putImg(gi,frameIcon(h.g,from.width,from.height));
  const sh=ghostShade(g,0,1,h);
  caption.style.opacity='0'; tokpanel.style.opacity='0'; tokstage.style.opacity='0';
  requestAnimationFrame(()=>{ sh();
    const box='left '+MORPH+'ms '+MO+',top '+MORPH+'ms '+MO+',width '+MORPH+'ms '+MO+',height '+MORPH+'ms '+MO;
    g.style.transition=box+',border-radius '+MORPH+'ms '+RIN+' '+Math.round(MORPH*0.18)+'ms';
    g.style.left=to.left+'px'; g.style.top=to.top+'px'; g.style.width=to.width+'px'; g.style.height=to.height+'px';
    g.style.borderRadius='0'; gi.style.transition=box; putImg(gi,frameCover(h.g,to.width,to.height));
  });
  setTimeout(()=>{swap(); slides.style.transition='none'; slides.style.opacity='0'; tokstage.style.opacity=''; panelbody.style.opacity='0';
    requestAnimationFrame(()=>{caption.style.opacity='1'; panelbody.style.opacity='1'; tokpanel.style.opacity='1';});
  },320);
  setTimeout(()=>{
    slides.style.opacity='1';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{g.remove(); slides.style.transition=''; slides.style.opacity='';}));
    busy=false;
  },MORPH);
}
function backToTok(){
  const tid=heroFromTokId, h=HA.find(x=>x.id===current);
  heroFromTokId=null;
  let g=null, ga=null, sh=null;
  if(!still.matches){
    const from=stage.getBoundingClientRect();
    g=makeGhost(from,'0px'); ga=addArt(g,h.art); putImg(ga,frameCover(h.g,from.width,from.height)); sh=ghostShade(g,1,0,h);
  }
  caption.style.opacity='0'; panelbody.style.opacity='0';
  const reveal=()=>{
    detail.classList.add('tokmode'); current=null; curTok=tid; tokSrc=null;
    document.getElementById('back').textContent=tokFrom?'← '+HA.find(x=>x.id===tokFrom).name:'← '+UI('back:alltokens','Tous les jetons');
    slides.innerHTML=''; fillTok(tid); unghostAll();
    requestAnimationFrame(()=>{caption.style.opacity='1'; tokpanel.style.opacity='1'; tokstage.style.opacity='1';});
    if(!g) return;
    const btn=tokpanel.querySelector('#theroes .tagh[data-id="'+h.id+'"]');
    if(!btn||!onScreen(btn)){ g.remove(); return; }
    busy=true;
    requestAnimationFrame(()=>{
      if(sh) sh();
      const to=btn.getBoundingClientRect(), box='left '+MORPH+'ms '+MO+',top '+MORPH+'ms '+MO+',width '+MORPH+'ms '+MO+',height '+MORPH+'ms '+MO;
      g.style.transition=box+',border-radius '+Math.round(MORPH*0.55)+'ms '+ROUT;
      g.style.left=to.left+'px'; g.style.top=to.top+'px'; g.style.width=to.width+'px'; g.style.height=to.height+'px'; g.style.borderRadius='50%';
      ga.style.transition=box; putImg(ga,frameIcon(h.g,to.width,to.height));
    });
    setTimeout(()=>{g.remove(); busy=false;},MORPH);
  };
  if(still.matches){ reveal(); } else setTimeout(reveal,320);
}
tokpanel.addEventListener('click',e=>{const b=e.target.closest('#theroes .tagh'); if(b) heroFromTok(b.dataset.id,b);});

/* Accueil : referme la fiche, quel que soit le chemin suivi, et remonte à la page d'ouverture */
const homeBtn=document.getElementById('home');
function goHome(){
  if(busy||!detail.classList.contains('on')) return;
  busy=true;
  const fin=()=>{
    detail.classList.remove('on','tokmode'); detail.setAttribute('aria-hidden','true');
    detail.style.transition=''; detail.style.opacity='';
    heroFromTokId=null; tokFrom=null; curTok=null; tokSrc=null; current=null;
    unghostAll(); unghostToks();
    document.getElementById('back').textContent='← '+UI('back:allheroes','Tous les héros');
    busy=false;
  };
  browse.classList.remove('dim'); document.body.style.overflow='';
  showPane('heroes'); window.scrollTo(0,0);
  if(still.matches){ fin(); return; }
  detail.style.transition='opacity 260ms var(--out)'; detail.style.opacity='0';
  setTimeout(fin,270);
}
homeBtn.addEventListener('click',()=>{
  homeBtn.classList.remove('zap'); void homeBtn.offsetWidth; homeBtn.classList.add('zap');
  setTimeout(()=>homeBtn.classList.remove('zap'),560);
  goHome();
});
function swapTok(id){
  if(busy||id===curTok||!TK[id]) return;
  const prev=toksEl.querySelector('.tokli[data-id="'+curTok+'"] .disc'); if(prev) prev.classList.remove('ghosted');
  const next=toksEl.querySelector('.tokli[data-id="'+id+'"] .disc'); if(onScreen(next)) next.classList.add('ghosted');
  tokSrc=null; curTok=id;
  caption.style.opacity='0'; tokpanel.style.opacity='0'; tokstage.style.opacity='0';
  setTimeout(()=>{fillTok(id); caption.style.opacity='1'; tokpanel.style.opacity='1'; tokstage.style.opacity='1';},TXT+40);
}

/* ---------- assistant : question libre, réponse avec liens ---------- */
const askWrap=document.getElementById('askwrap'), askForm=document.getElementById('ask'), qIn=document.getElementById('q');
const askGo=document.getElementById('askgo'), answer=document.getElementById('answer');
const qline=document.getElementById('qline'), atext=document.getElementById('atext');
const astop=document.getElementById('astop'), aclear=document.getElementById('aclear'), sugg=document.getElementById('sugg');
/* L'assistant n'est dispo que si la page tourne dans Claude, connecté à un compte. On ne bloque JAMAIS le champ :
   si la capacité n'est pas (encore) disponible, on affiche l'avis « connexion requise » et on réessaie
   à chaque envoi, au retour sur l'onglet et quelques secondes après le chargement. */
let sampleFn=null;
async function getSample(){
  if(sampleFn) return sampleFn;
  if(!window.claude||!window.claude.use) return null;
  try{ const f=await window.claude.use('sample'); if(f) sampleFn=f; return f||null; }catch(e){ return null; }
}
const sampleReady=getSample();
function askLock(nudge){
  askWrap.classList.add('locked'); document.getElementById('asklock').hidden=false;
  if(nudge){ askWrap.classList.remove('nudge'); void askWrap.offsetWidth; askWrap.classList.add('nudge'); }
}
function askUnlock(){ askWrap.classList.remove('locked','nudge'); document.getElementById('asklock').hidden=true; }
async function askRecheck(){ const f=await getSample(); if(f) askUnlock(); else askLock(); return f; }
askRecheck();
setTimeout(()=>{ if(!sampleFn) askRecheck(); },6000);
setTimeout(()=>{ if(!sampleFn) askRecheck(); },15000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&!sampleFn) askRecheck(); });
window.addEventListener('focus',()=>{ if(!sampleFn) askRecheck(); });

let NAMES=[],NAMEBY=new Map(),NAMERE=/(?!)/;
function buildNames(){
  NAMES=[];
  HA.forEach(h=>NAMES.push({n:trHeroName(h),k:'hero',id:h.id}));
  NAMES.push({n:'Spider-Man',k:'hero',id:'spider-man'});
  tids.forEach(id=>NAMES.push({n:trTokName(id,TK[id]),k:'token',id}));
  NAMES.sort((a,b)=>b.n.length-a.n.length);
  NAMEBY=new Map(NAMES.map(x=>[x.n,x]));
  NAMERE=new RegExp('(?<![\\w-])('+NAMES.map(x=>x.n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\w-])','g');
}
buildNames();
function refLink(x){
  const a=document.createElement('a'), im=document.createElement('img');
  a.className='ref'; a.href='#'; a.dataset.k=x.k; a.dataset.id=x.id;
  im.src=x.k==='token'?TK[x.id].icon:HA.find(h=>h.id===x.id).icon; im.alt='';
  a.appendChild(im); a.appendChild(document.createTextNode(x.n)); return a;
}
function linkInto(node,str){
  let last=0,m; NAMERE.lastIndex=0;
  while((m=NAMERE.exec(str))){
    if(m.index>last) node.appendChild(document.createTextNode(str.slice(last,m.index)));
    node.appendChild(refLink(NAMEBY.get(m[1]))); last=m.index+m[1].length;
  }
  if(last<str.length) node.appendChild(document.createTextNode(str.slice(last)));
}
function renderAnswer(el,text){
  el.textContent='';
  text.replace(/\*\*(.+?)\*\*/g,'$1').split(/\n{2,}/).forEach(par=>{
    par=par.trim(); if(!par) return;
    const lines=par.split('\n');
    if(lines.every(l=>/^\s*[-•*]\s+/.test(l))){
      const ul=document.createElement('ul');
      lines.forEach(l=>{const li=document.createElement('li'); linkInto(li,l.replace(/^\s*[-•*]\s+/,'')); ul.appendChild(li);});
      el.appendChild(ul);
    } else { const p=document.createElement('p'); linkInto(p,lines.join(' ')); el.appendChild(p); }
  });
  if(/Forgemaster|Armor|Helmet|\bORE\b|Ultimanium/.test(text)) tintGems(el);
  tintPhases(el); tintDmg(el); tintHeal(el); frFix(el);
}
atext.addEventListener('click',e=>{
  const a=e.target.closest('a.ref'); if(!a) return; e.preventDefault();
  if(a.dataset.k==='token') openTok(a.dataset.id,a.querySelector('img'));
  else { showPane(HB.some(b=>b.id===a.dataset.id)?'boss':'heroes'); open(a.dataset.id); }
});


/* ---------- recherche rapide : redirige vers le héros / boss / jeton / page ---------- */
const qsIn=document.getElementById('qsin'), qsList=document.getElementById('qslist'); let qsCur=[], qsAct=-1;
const qsNorm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function qsItems(){
  const it=[];
  HA.forEach(h=>it.push({k:'hero',id:h.id,n:trHeroName(h),a:h.name,icon:h.icon}));
  HB.forEach(h=>it.push({k:'boss',id:h.id,n:trHeroName(h),a:h.name,icon:h.icon}));
  tids.forEach(id=>it.push({k:'token',id,n:trTokName(id,TK[id]),a:TK[id].name,icon:TK[id].icon}));
  tabs.querySelectorAll('[role=tab]').forEach(b=>{ const n=[...b.childNodes].filter(x=>!(x.nodeType===1&&x.classList.contains('n'))).map(x=>x.textContent).join('').trim(); if(n) it.push({k:'page',id:b.dataset.pane,n,a:n}); });
  return it;
}
function qsScore(it,q){
  let best=0;
  for(const raw of [it.n,it.a]){ const t=qsNorm(raw); if(!t) continue;
    if(t===q) best=Math.max(best,100); else if(t.startsWith(q)) best=Math.max(best,80);
    else if((' '+t).includes(' '+q)) best=Math.max(best,60); else if(t.includes(q)) best=Math.max(best,40); }
  return best;
}
function qsKindLbl(k){ return UI('qs.'+k,{hero:'Héros',boss:'Boss',token:'Jeton',page:'Page'}[k]); }
function qsRender(){
  const q=qsNorm(qsIn.value); qsList.textContent=''; qsAct=-1;
  if(!q){ qsList.hidden=true; qsIn.setAttribute('aria-expanded','false'); qsCur=[]; return; }
  qsCur=qsItems().map(x=>({x,s:qsScore(x,q)})).filter(o=>o.s>0).sort((a,b)=>b.s-a.s||a.x.n.localeCompare(b.x.n)).slice(0,8).map(o=>o.x);
  if(!qsCur.length){ const li=document.createElement('li'); li.className='none'; li.textContent=UI('qs.none','Aucun résultat'); qsList.appendChild(li); }
  qsCur.forEach((x,i)=>{
    const li=document.createElement('li'); li.setAttribute('role','option'); li.dataset.i=i;
    if(x.icon){ const im=document.createElement('img'); im.src=x.icon; im.alt=''; li.appendChild(im); } else { const p=document.createElement('span'); p.className='pg'; p.textContent='→'; li.appendChild(p); }
    const n=document.createElement('span'); n.textContent=x.n; li.appendChild(n);
    const k=document.createElement('span'); k.className='k'; k.textContent=qsKindLbl(x.k); li.appendChild(k);
    qsList.appendChild(li);
  });
  qsList.hidden=false; qsIn.setAttribute('aria-expanded','true');
}
function qsMark(i){
  const lis=[...qsList.querySelectorAll('li[role=option]')]; if(!lis.length) return;
  qsAct=(i+lis.length)%lis.length; lis.forEach((l,j)=>l.setAttribute('aria-selected',j===qsAct?'true':'false')); lis[qsAct].scrollIntoView({block:'nearest'});
}
function qsGo(x){
  if(!x) return; qsIn.value=''; qsRender(); qsIn.blur();
  if(x.k==='hero'){ showPane('heroes'); open(x.id); }
  else if(x.k==='boss'){ showPane('boss'); open(x.id); }
  else if(x.k==='token'){ showPane('toks'); openTok(x.id,null); }
  else { const b=tabs.querySelector('[data-pane="'+x.id+'"]'); if(b) b.click(); }
}
qsIn.addEventListener('input',qsRender);
qsIn.addEventListener('focus',()=>{ if(qsIn.value) qsRender(); });
qsIn.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){ e.preventDefault(); qsMark(qsAct+1); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); qsMark(qsAct<0?-1:qsAct-1); }
  else if(e.key==='Enter'){ e.preventDefault(); qsGo(qsCur[qsAct>=0?qsAct:0]); }
  else if(e.key==='Escape'){ qsIn.value=''; qsRender(); }
});
qsList.addEventListener('mousedown',e=>e.preventDefault());
qsList.addEventListener('click',e=>{ const li=e.target.closest('li[role=option]'); if(li) qsGo(qsCur[+li.dataset.i]); });
document.addEventListener('pointerdown',e=>{ if(!qsList.hidden&&!e.target.closest('#qs')){ qsList.hidden=true; qsIn.setAttribute('aria-expanded','false'); } });


/* ---------- icônes nettes : réduction progressive de qualité à la taille réellement affichée
   (les grosses réductions faites par le navigateur crénelaient sur ordinateur) ---------- */
(function crispIcons(){
  const dpr=Math.min(window.devicePixelRatio||1,3), map=new Map();
  const jobs=[].concat(HA.map(h=>[h,68,128]),HB.map(h=>[h,96,160]));
  const one=([h,css,min])=>new Promise(res=>{
    const src=h.icon; if(!src) return res();
    const im=new Image();
    im.onload=()=>{
      try{
        const t=Math.ceil(Math.max(css*1.2*dpr,min)), w=im.naturalWidth, hh=im.naturalHeight;
        if(w>t*1.15){
          let cur=im, cw=w, ch=hh;
          while(cw/2>t){ cw=Math.round(cw/2); ch=Math.round(ch/2); const c=document.createElement('canvas'); c.width=cw; c.height=ch; const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; x.drawImage(cur,0,0,cw,ch); cur=c; }
          const c=document.createElement('canvas'); c.width=t; c.height=Math.round(hh*t/w); const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high'; x.drawImage(cur,0,0,c.width,c.height);
          const out=c.toDataURL('image/webp',0.92); if(out.indexOf('data:image/')===0){ map.set(src,out); h.icon=out; }
        }
      }catch(e){}
      res();
    };
    im.onerror=()=>res(); im.src=src;
  });
  Promise.all(jobs.map(one)).then(()=>{
    if(!map.size) return;
    document.querySelectorAll('img').forEach(i=>{ const n=map.get(i.getAttribute('src')); if(n) i.src=n; });
  });
})();

/* ---------- succès : suivi, sons, paillettes ---------- */
const ACH=DATA.ach||[], ACHTOT=ACH.reduce((n,g)=>n+g.items.length,0);
const ACHKEY='dtdb.ach.v1';
const achState={done:{},snd:true}; let achOK=true, achFilter='all';
try{
  const r=localStorage.getItem(ACHKEY);
  if(r){const o=JSON.parse(r); if(o&&typeof o==='object'){ if(o.done&&typeof o.done==='object') achState.done=o.done; achState.snd=o.snd!==false; }}
}catch(e){ achOK=false; }
const achSaveEl=document.getElementById('achsave'); let achSaveT=0;
function achSave(){
  try{ localStorage.setItem(ACHKEY,JSON.stringify(achState)); achOK=true; }catch(e){ achOK=false; }
  achSaveEl.textContent=achOK?'Enregistré':'Non enregistré (stockage indisponible)';
  achSaveEl.className='achsave '+(achOK?'on':'warn'); clearTimeout(achSaveT);
  if(achOK) achSaveT=setTimeout(()=>achSaveEl.classList.remove('on'),1400);
}
addEventListener('storage',e=>{
  if(e.key!==ACHKEY||!e.newValue) return;
  try{ const o=JSON.parse(e.newValue); achState.done=o.done||{}; achState.snd=o.snd!==false; achSync(); }catch(_){}
});

/* --- son : synthèse WebAudio (aucun fichier) --- */
let AC=null, MASTER=null, REV=null;
function audio(){
  if(AC) return AC;
  try{
    const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
    AC=new C(); MASTER=AC.createGain(); MASTER.gain.value=.5; MASTER.connect(AC.destination);
    const len=Math.floor(AC.sampleRate*1.2), ir=AC.createBuffer(2,len,AC.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.8);}
    REV=AC.createConvolver(); REV.buffer=ir; const rg=AC.createGain(); rg.gain.value=.34; REV.connect(rg); rg.connect(MASTER);
  }catch(e){ AC=null; }
  return AC;
}
function bell(f,t,vol,dur){
  const g=AC.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.005); g.connect(MASTER); g.connect(REV);
  [[1,1,1],[2.01,.32,.55],[2.76,.2,.4],[4.07,.11,.28],[5.43,.06,.2]].forEach(([m,a,d])=>{
    const o=AC.createOscillator(), og=AC.createGain(); o.type='sine'; o.frequency.value=f*m;
    og.gain.setValueAtTime(a,t); og.gain.exponentialRampToValueAtTime(.0001,t+dur*d); o.connect(og); og.connect(g); o.start(t); o.stop(t+dur*d+.05);
  });
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
}
function ping(t,f,vol){
  const o=AC.createOscillator(), g=AC.createGain(); o.type='sine'; o.frequency.value=f;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.004); g.gain.exponentialRampToValueAtTime(.0001,t+.11);
  o.connect(g); g.connect(MASTER); g.connect(REV); o.start(t); o.stop(t+.14);
}
function sfx(kind){
  if(!achState.snd) return; const c=audio(); if(!c) return;
  try{
    if(c.state==='suspended') c.resume();
    const t=c.currentTime+.02;
    if(kind==='check'){
      [659.25,880,1318.51].forEach((f,i)=>bell(f,t+i*.07,.2-i*.03,1.2+i*.3));
      for(let i=0;i<6;i++) ping(t+.17+i*.05+Math.random()*.03,2600+Math.random()*3000,.045);
    }else if(kind==='undo'){
      const o=c.createOscillator(), g=c.createGain(); o.type='triangle'; o.frequency.setValueAtTime(330,t); o.frequency.exponentialRampToValueAtTime(150,t+.14);
      g.gain.setValueAtTime(.14,t); g.gain.exponentialRampToValueAtTime(.0001,t+.16); o.connect(g); g.connect(MASTER); o.start(t); o.stop(t+.2);
    }else if(kind==='full'){
      [523.25,659.25,783.99,1046.5,1318.51,1567.98].forEach((f,i)=>bell(f,t+.28+i*.08,.17,1.5));
      bell(1046.5,t+.85,.16,2.2); bell(1318.51,t+.85,.12,2.2);
      for(let i=0;i<14;i++) ping(t+.3+i*.06+Math.random()*.04,2400+Math.random()*3600,.04);
    }
  }catch(e){}
}

/* --- paillettes dorées : canvas plein écran, additif --- */
const fx=document.createElement('canvas'); fx.id='fx'; fx.setAttribute('aria-hidden','true'); document.body.appendChild(fx);
const fc=fx.getContext('2d');
function fxSize(){ const d=Math.min(window.devicePixelRatio||1,2); fx.width=Math.round(innerWidth*d); fx.height=Math.round(innerHeight*d); fx.style.width=innerWidth+'px'; fx.style.height=innerHeight+'px'; fc.setTransform(d,0,0,d,0,0); }
addEventListener('resize',fxSize); fxSize();
const GLOW=(()=>{const c=document.createElement('canvas'); c.width=c.height=48; const g=c.getContext('2d'), r=g.createRadialGradient(24,24,0,24,24,24);
  r.addColorStop(0,'rgba(255,236,160,.85)'); r.addColorStop(.35,'rgba(245,200,80,.32)'); r.addColorStop(1,'rgba(245,190,60,0)'); g.fillStyle=r; g.fillRect(0,0,48,48); return c;})();
const GOLDS=['#fff8dc','#ffe28c','#ffd25e','#f6bd3f','#ffffff','#ffeaa6'];
let PART=[], EMIT=[], fxRaf=0, fxLast=0;
function spawn(x,y,burst){
  const a=burst?Math.random()*Math.PI*2:-Math.PI/2+(Math.random()-.5)*2;
  const sp=burst?70+Math.random()*150:16+Math.random()*60;
  PART.push({x:x+(Math.random()-.5)*(burst?5:24),y:y+(Math.random()-.5)*(burst?5:10),
    vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(burst?0:12),age:0,max:(burst?.7:1)+Math.random()*1.4,
    s:burst?3+Math.random()*5.5:2+Math.random()*4.5,ph:Math.random()*6.28,fr:2+Math.random()*4.5,amp:16+Math.random()*34,
    rot:Math.random()*1.6,col:GOLDS[Math.random()*GOLDS.length|0],star:Math.random()<.65,tw:7+Math.random()*10,burst});
}
function fxBurst(el,n,dur){
  if(still.matches||!el) return; const r=el.getBoundingClientRect(); const x=r.left+r.width/2, y=r.top+r.height/2;
  for(let i=0;i<n;i++) spawn(x,y,true);
  EMIT.push({x,y,t:0,dur:dur||900,acc:0});
  if(!fxRaf){ fxLast=performance.now(); fxRaf=requestAnimationFrame(fxTick); }
}
function star(x,y,r,rot){
  fc.save(); fc.translate(x,y); fc.rotate(rot); fc.beginPath();
  fc.moveTo(0,-r); fc.quadraticCurveTo(r*.1,-r*.1,r,0); fc.quadraticCurveTo(r*.1,r*.1,0,r); fc.quadraticCurveTo(-r*.1,r*.1,-r,0); fc.quadraticCurveTo(-r*.1,-r*.1,0,-r);
  fc.fill(); fc.restore();
}
function fxTick(now){
  const dt=Math.min(.05,(now-fxLast)/1000); fxLast=now;
  for(let i=EMIT.length-1;i>=0;i--){
    const e=EMIT[i]; e.t+=dt*1000; const k=1-e.t/e.dur; if(k<=0){EMIT.splice(i,1); continue;}
    e.acc+=dt*75*k*k; while(e.acc>=1){e.acc--; spawn(e.x,e.y,false);}
  }
  fc.clearRect(0,0,innerWidth,innerHeight); fc.globalCompositeOperation='lighter';
  for(let i=PART.length-1;i>=0;i--){
    const p=PART[i]; p.age+=dt; if(p.age>=p.max){PART.splice(i,1); continue;}
    const k=p.age/p.max;
    p.vx*=Math.exp(-(p.burst?2.2:.9)*dt); p.vy=p.vy*Math.exp(-1.2*dt)-(p.burst?10:38)*dt;
    p.x+=(p.vx+Math.cos(p.ph+p.age*p.fr)*p.amp)*dt;
    p.y+=(p.vy+Math.sin(p.ph*1.7+p.age*p.fr*.72)*p.amp*.35)*dt;
    const tw=.72+.28*Math.sin(p.age*p.tw+p.ph), al=Math.min(1,p.age/.07)*Math.pow(1-k,1.35)*tw, sz=p.s*(1-.45*k);
    fc.globalAlpha=al*.9*(p.am||1); fc.drawImage(p.g||GLOW,p.x-sz*3,p.y-sz*3,sz*6,sz*6);
    fc.globalAlpha=al*(p.am||1); fc.fillStyle=p.col;
    if(p.star) star(p.x,p.y,sz*1.9,p.rot+p.age*.9); else {fc.beginPath(); fc.arc(p.x,p.y,sz*.5,0,6.283); fc.fill();}
  }
  fc.globalAlpha=1; fc.globalCompositeOperation='source-over';
  fxRaf=(PART.length||EMIT.length)?requestAnimationFrame(fxTick):0;
}

/* --- interface --- */
const achList=document.getElementById('achlist');
const SVGCHK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.6 4.6L19 7.5"/></svg>';
const SVGSWD='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19L18 6M14 4l6 0 0 6M19 19L6 6M10 4L4 4 4 10M7 17l-3 3M17 17l3 3"/></svg>';
function achText(el,str){
  str.split('{?}').forEach((part,i)=>{
    if(i){const u=document.createElement('span'); u.className='unk'; u.textContent='?'; u.title='Valeur imprimée sur une icône du livret : à compléter'; el.appendChild(u);}
    linkInto(el,part);
  });
}
const achRows=new Map(), achCards=new Map();
function achBuild(){
  ACH.forEach(g=>{
    const h=g.k==='field'?null:H.find(x=>x.id===g.k); if(g.k!=='field'&&!h) return;
    const card=document.createElement('section'); card.className='achcard'; card.dataset.k=g.k;
    const hd=document.createElement('header'); hd.className='achhd';
    const hb=document.createElement(h?'button':'div'); hb.className='achhero';
    if(h){ hb.type='button'; hb.dataset.hero=h.id; hb.setAttribute('aria-label','Ouvrir la fiche de '+trHeroName(h));
      const im=document.createElement('img'); im.src=h.icon; im.alt=''; hb.appendChild(im); }
    else { const f=document.createElement('span'); f.className='fieldic'; f.innerHTML=SVGSWD; hb.appendChild(f); }
    const nm=document.createElement('span'); nm.textContent=h?trHeroName(h):tr('ach:'+g.k+':name',g.n); hb.appendChild(nm); hd.appendChild(hb);
    const pr=document.createElement('span'); pr.className='achprog'; hd.appendChild(pr);
    const fl=document.createElement('span'); fl.className='achfull'; fl.textContent='Complet'; hd.appendChild(fl);
    card.appendChild(hd);
    const ul=document.createElement('ul'); ul.style.cssText='list-style:none;margin:0;padding:0';
    g.items.forEach((txt,i)=>{
      const id=g.k+'-'+(i+1);
      const li=document.createElement('li'); li.className='ach'; li.dataset.id=id; li.style.setProperty('--d',(-Math.random()*10).toFixed(1)+'s');
      const bx=document.createElement('button'); bx.type='button'; bx.className='achbox'; bx.setAttribute('role','checkbox'); bx.setAttribute('aria-checked','false');
      bx.setAttribute('aria-label','Succès réussi : '+txt.replace('{?}','?')); bx.innerHTML=SVGCHK; li.appendChild(bx);
      const t=document.createElement('div'); t.className='acht'; achText(t,tr('ach:'+g.k+':'+i,txt)); li.appendChild(t);
      const ini=document.createElement('input'); ini.className='achini'; ini.maxLength=4; ini.placeholder='initiales'; ini.setAttribute('aria-label','Initiales de la personne qui l\'a réussi'); ini.title='Qui l\'a réussi ? (la « Great Charter » du livret)'; li.appendChild(ini);
      ul.appendChild(li); achRows.set(id,{li,bx,ini,k:g.k,idx:i,raw:txt});
    });
    card.appendChild(ul); achCards.set(g.k,{card,pr,fl,n:g.items.length}); achList.appendChild(card);
  });
  const em=document.createElement('p'); em.className='achempty'; em.id='achempty'; em.hidden=true; achList.appendChild(em);
}
function achCount(k){ let n=0; achRows.forEach((r,id)=>{ if(r.k===k&&achState.done[id]) n++; }); return n; }
function achSync(){
  let total=0;
  achRows.forEach((r,id)=>{
    const d=!!achState.done[id]; if(d) total++;
    r.li.classList.toggle('done',d); r.bx.setAttribute('aria-checked',d?'true':'false');
    const v=d?(achState.done[id].i||''):''; if(r.ini!==document.activeElement && r.ini.value!==v) r.ini.value=v;
  });
  achCards.forEach((c,k)=>{ const n=achCount(k); c.pr.textContent=n+' / '+c.n; c.card.classList.toggle('full',n===c.n); });
  const nEl=document.getElementById('achn'); if(nEl.textContent!==String(total)){ nEl.textContent=total; nEl.classList.remove('bump'); void nEl.offsetWidth; nEl.classList.add('bump'); }
  document.getElementById('achfill').style.width=(ACHTOT?total/ACHTOT*100:0)+'%';
  document.getElementById('na').textContent=total+'/'+ACHTOT;
  return total;
}
function achToggle(id){
  const r=achRows.get(id); if(!r) return;
  const val=!achState.done[id];
  if(val) achState.done[id]={t:Date.now(),i:''}; else delete achState.done[id];
  achSync(); achSave();
  if(val){
    r.li.classList.remove('pop'); void r.li.offsetWidth; r.li.classList.add('pop'); setTimeout(()=>r.li.classList.remove('pop'),1000);
    const c=achCards.get(r.k), full=achCount(r.k)===c.n;
    sfx(full?'full':'check'); fxBurst(r.bx,full?34:26,900);
    if(full){ setTimeout(()=>{ c.fl.classList.remove('pop'); void c.fl.offsetWidth; c.fl.classList.add('pop'); fxBurst(c.fl,46,1500); },320); }
  } else sfx('undo');
}
achList.addEventListener('click',e=>{
  const a=e.target.closest('a.ref');
  if(a){ e.preventDefault(); if(a.dataset.k==='token') openTok(a.dataset.id,a.querySelector('img')); else open(a.dataset.id); return; }
  const hb=e.target.closest('.achhero[data-hero]'); if(hb){ open(hb.dataset.hero); return; }
  if(e.target.closest('.achini')) return;
  const li=e.target.closest('.ach'); if(li) achToggle(li.dataset.id);
});
let iniT=0;
achList.addEventListener('input',e=>{
  const inp=e.target.closest('.achini'); if(!inp) return; const li=inp.closest('.ach'), d=achState.done[li.dataset.id]; if(!d) return;
  d.i=inp.value.slice(0,4).toUpperCase(); clearTimeout(iniT); iniT=setTimeout(achSave,500);
});
function achApplyFilter(){
  let shown=0;
  achRows.forEach((r,id)=>{ const d=!!achState.done[id]; const show=achFilter==='all'||(achFilter==='done'?d:!d); r.li.hidden=!show; if(show) shown++; });
  achCards.forEach(c=>{ c.card.hidden=!c.card.querySelector('.ach:not([hidden])'); });
  const em=document.getElementById('achempty'); em.hidden=shown>0;
  em.textContent=achFilter==='done'?'Aucun succès validé pour le moment : à toi de jouer.':'Tout est validé, bravo !';
}
document.getElementById('achchips').addEventListener('click',e=>{
  const b=e.target.closest('.chip'); if(!b) return; achFilter=b.dataset.f;
  document.querySelectorAll('#achchips .chip').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false')); achApplyFilter();
});
const achSnd=document.getElementById('achsnd');
function achSndUi(){ const sndOn=UI('lbl:sndon','Son activé'), sndOff=UI('lbl:sndoff','Son coupé');
  achSnd.setAttribute('aria-pressed',achState.snd?'true':'false'); achSnd.textContent=achState.snd?sndOn:sndOff;
  const rs=document.getElementById('rndsnd'); rs.setAttribute('aria-pressed',achState.snd?'true':'false'); rs.textContent=achState.snd?sndOn:sndOff; }
document.getElementById('rndsnd').addEventListener('click',()=>{ achState.snd=!achState.snd; achSndUi(); achSave(); if(achState.snd) rndTick(150); });
achSnd.addEventListener('click',()=>{ achState.snd=!achState.snd; achSndUi(); achSave(); if(achState.snd) sfx('check'); });
const achReset=document.getElementById('achreset'); let resetT=0;
achReset.addEventListener('click',()=>{
  if(achReset.dataset.arm!=='1'){ achReset.dataset.arm='1'; achReset.textContent=UI('lbl:achresetconfirm','Confirmer la remise à zéro ?'); achReset.classList.add('armed');
    resetT=setTimeout(()=>{achReset.dataset.arm='';achReset.textContent=UI('lbl:achreset','Tout remettre à zéro');achReset.classList.remove('armed');},3500); return; }
  clearTimeout(resetT); achReset.dataset.arm=''; achReset.textContent=UI('lbl:achreset','Tout remettre à zéro'); achReset.classList.remove('armed');
  achState.done={}; achSync(); achSave(); achApplyFilter(); sfx('undo');
});
achBuild(); achSndUi(); achSync(); achApplyFilter(); tintPhases(achList); tintDmg(achList); tintHeal(achList); frFix(achList);

/* ---------- tirage : ambiance, tic ASMR, tampon ---------- */
const GLOW2=(()=>{const c=document.createElement('canvas'); c.width=c.height=48; const g=c.getContext('2d'), r=g.createRadialGradient(24,24,0,24,24,24);
  r.addColorStop(0,'rgba(236,244,255,.8)'); r.addColorStop(.4,'rgba(200,214,232,.28)'); r.addColorStop(1,'rgba(190,205,225,0)'); g.fillStyle=r; g.fillRect(0,0,48,48); return c;})();
const SILVERS=['#ffffff','#eef3fa','#d5dee9','#bfcbdb'];
function rndTick(gap){
  if(!achState.snd) return; const c=audio(); if(!c) return;
  try{
    if(c.state==='suspended') c.resume();
    const t=c.currentTime+.004, v=.55+.45*Math.min(1,gap/150);
    const o=c.createOscillator(), g=c.createGain(), f=c.createBiquadFilter();
    o.type='sine'; o.frequency.setValueAtTime(2300*(.95+Math.random()*.1),t); o.frequency.exponentialRampToValueAtTime(1450,t+.022);
    f.type='lowpass'; f.frequency.value=4200; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.075*v,t+.0015); g.gain.exponentialRampToValueAtTime(.0001,t+.032);
    o.connect(f); f.connect(g); g.connect(MASTER); o.start(t); o.stop(t+.045);
    const o2=c.createOscillator(), g2=c.createGain(); o2.type='sine'; o2.frequency.setValueAtTime(200,t); o2.frequency.exponentialRampToValueAtTime(105,t+.032);
    g2.gain.setValueAtTime(0,t); g2.gain.linearRampToValueAtTime(.085*v,t+.002); g2.gain.exponentialRampToValueAtTime(.0001,t+.04);
    o2.connect(g2); g2.connect(MASTER); o2.start(t); o2.stop(t+.055);
  }catch(e){}
}
function rndStamp(){
  if(!achState.snd) return; const c=audio(); if(!c) return;
  try{
    if(c.state==='suspended') c.resume();
    const t=c.currentTime+.01, o=c.createOscillator(), g=c.createGain(); o.type='sine'; o.frequency.setValueAtTime(155,t); o.frequency.exponentialRampToValueAtTime(58,t+.14);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.2,t+.004); g.gain.exponentialRampToValueAtTime(.0001,t+.18); o.connect(g); g.connect(MASTER); o.start(t); o.stop(t+.22);
    bell(1567.98,t+.1,.05,.9); ping(t+.16,3600,.02);
  }catch(e){}
}
function silverRing(disc){
  if(still.matches||!disc) return; const n=14;
  for(let i=0;i<n;i++) setTimeout(()=>{
    const r=disc.getBoundingClientRect(); if(!r.width) return;
    const a=-Math.PI/2+(i/n)*Math.PI*2+(Math.random()-.5)*.3, R=r.width/2+2, x=r.left+r.width/2+Math.cos(a)*R, y=r.top+r.height/2+Math.sin(a)*R;
    PART.push({x,y,vx:Math.cos(a)*(6+Math.random()*16),vy:Math.sin(a)*(6+Math.random()*16)-8,age:0,max:.9+Math.random()*.7,s:1.2+Math.random()*1.6,
      ph:Math.random()*6.28,fr:2+Math.random()*3,amp:5+Math.random()*9,rot:Math.random()*1.6,col:SILVERS[Math.random()*SILVERS.length|0],star:Math.random()<.7,tw:8+Math.random()*8,burst:false,am:.5,g:GLOW2});
    if(!fxRaf){ fxLast=performance.now(); fxRaf=requestAnimationFrame(fxTick); }
  },170+i*(540/n));
}
function stampSlot(s){
  if(!still.matches){ s.classList.remove('stamp'); void s.offsetWidth; s.classList.add('stamp'); clearTimeout(s._st); s._st=setTimeout(()=>s.classList.remove('stamp'),1500); }
  rndStamp(); silverRing(s.querySelector('.disc2'));
}
function settleSlot(s,h){
  s.querySelector('img').src=h.icon; s.querySelector('span').textContent=trHeroName(h); s.dataset.hid=h.id;
  if(s.classList.contains('done')) return;
  s.classList.remove('empty'); s.classList.add('done'); drawn.add(h.id); stampSlot(s);
}
function glint(s){
  const d=s.querySelector('.disc2'); d.style.setProperty('--ga',(95+Math.random()*50|0)+'deg');
  d.classList.remove('gl'); void d.offsetWidth; d.classList.add('gl');
  if(Math.random()<.65){
    const w=document.createElement('b'); w.className='tw'; w.style.left=(20+Math.random()*60)+'%'; w.style.top=(18+Math.random()*60)+'%'; d.appendChild(w); setTimeout(()=>w.remove(),900);
  }
}
let glintT=0;
function glintTick(){
  clearTimeout(glintT);
  if(!rnd.classList.contains('on')||still.matches) return;
  if(!rolling){ const es=[...reel.querySelectorAll('.rslot.empty')]; if(es.length) glint(es[Math.random()*es.length|0]); }
  glintT=setTimeout(glintTick,450+Math.random()*1900);
}

let SYS=null;
const ALWAYS=/règles de base|Adventures \/ Missions/;
const GATES=[[/Unchained/,/unchained|vault|witch|one.?shot|rush/i],
 [/^Dice Throne Adventures$/,/advent|campagne|portal|crawl|minion|shard|loot|shop|sc[eé]nario|king'?s hand|chaos|boss|vault|gold|prix|price|co[uû]t|cost|coffre|chest|rosella|identif|vend|sell|d20|butin|barbar|gunslinger|monk|moine|pistolero|mad king|roi fou/i],
 [/Missions/,/mission|henchm|crisis|momentum|\ball(y|ies)\b|alli[eé]|perk|boost|unstoppable|enem|ennemi|melee|range|boss/i],
 [/Naraxus/,/naraxus|dragon/i],
 [/Marvel Update/,/webbed|combo|invisib|guard break|electrokin|mj[oö]lnir|spider|thor|miles|marvel/i]];
const ruleTxt=r=>'## '+r.t+' ['+r.s+']\n'+r.x;
function sysPrompt(q){
  const ctx=[q].concat(turns.slice(-4).filter(t=>t.role==='user').map(t=>t.content)).join(' \n ');
  const extra=[], xr=[], RK=[4,0,1,3,2]; // RK : ordre de rétention par groupe de GATES (Unchained gardé en dernier, Adventures retiré en premier)
  (DATA.rules||[]).forEach(r=>{
    if(ALWAYS.test(r.s)) return;
    const g=GATES.find(x=>x[0].test(r.s)); if(g&&g[1].test(ctx)){ extra.push(ruleTxt(r)); xr.push(RK[GATES.indexOf(g)]); }
  });
  const bd=[], miss=[], BD=DATA.boards||{};
  const hit=(t,h)=>{ const nm0=h.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), trn=trHeroName(h),
    alt=(trn!==h.name)?'|'+trn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):'';
    return new RegExp('(?<![\\w-])('+nm0+alt+(h.id==='spider-man'?'|Spider-Man|Spidey|Miles':'')+')(?![\\w-])','i').test(t); };
  const srcs=[q].concat(turns.slice(-4).filter(t=>t.role==='user').map(t=>t.content).reverse());
  for(const t of srcs){ for(const h of HB.concat(H)){ if(bd.length+miss.length>=3) break;
    if(bd.includes(h.id)||miss.includes(h.id)) continue; if(hit(t,h)) (BD[h.id]?bd:miss).push(h.id); } }
  const tn=tids.filter(id=>{ if(!TK[id].hs) return false; const nm0=TK[id].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), trn=trTokName(id,TK[id]),
    alt=(trn!==TK[id].name?'|'+trn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'):'')+(id==='armor'?'|Helmet|Shield|Craft|Blueprint':'');
    return new RegExp('(?<![\\w-])('+nm0+alt+')(?![\\w-])','i').test(ctx); }).slice(0,6);
  if(tn.includes('armor')&&BD.forgemaster&&!bd.includes('forgemaster')&&!miss.includes('forgemaster')) bd.push('forgemaster');
  const mkBt=()=>{ let bt=(bd.length||miss.length)?'\n\nCAPACITÉS DES HÉROS CITÉS (plateaux) :\n'+bd.map(id=>'## '+BD[id].n+'\n'+BD[id].x).join('\n\n')
    +miss.map(id=>'\n\n## '+HA.find(x=>x.id===id).name+'\nPas de plateau dans la base : capacités inconnues.').join(''):'';
  if(tn.length) bt+='\n\nJETONS CITÉS (détail) :\n'+tn.map(id=>tokLine(id,true)).join('\n');
  if(/succ[eè]s|achievement|exploit|charter/i.test(ctx)) bt+='\n\nSUCCÈS DU LIVRET ACHIEVEMENTS (saisons 1 et 2 ; ✔ = déjà validé par l\'utilisateur, ✘ = à faire ; ? = valeur chiffrée inconnue) :\n'+ACH.map(g=>'## '+(g.k==='field'?g.n:HN(g.k))+'\n'+g.items.map((t,i)=>(achState.done[g.k+'-'+(i+1)]?'✔ ':'✘ ')+t.replace('{?}','?')).join('\n')).join('\n');
  return bt; }; let bt=mkBt();
  const enc=new TextEncoder(), base=sysBase(), mode=()=>extra.length?'\n\nRÈGLES PAR MODE (chargées car la question les concerne) :\n'+extra.join('\n\n'):'';
  while(extra.length&&enc.encode(base+mode()+bt).length>58000){ let m=0; for(let i=0;i<xr.length;i++) if(xr[i]<=xr[m]) m=i; extra.splice(m,1); xr.splice(m,1); }
  let nDrop=0; while(enc.encode(base+mode()+bt).length>58000&&bd.length>1){ bd.pop(); nDrop++; bt=mkBt(); }
  while(enc.encode(base+mode()+bt).length>61000&&tn.length){ tn.pop(); bt=mkBt(); }
  return base+mode()+bt+(nDrop?"\n\n(NB : le plateau d'au moins un héros cité n'a pas pu être joint faute de place ; dis-le et propose de le redemander seul.)":'');
}
const HN=id=>{const h=HA.find(x=>x.id===id); return h?trHeroName(h):id;};
function tokLine(id,full){
  const t=TK[id], hh=TH[id]?TH[id].map(HN).join(', '):'', lm=t.lim&&!t.stack?t.lim:'Stack Limit '+t.stack;
  if(t.hs&&!full) return '- '+trTokName(id,t)+' ['+t.type+(t.lim||t.stack?', '+lm:'')+']'+(hh?' (héros : '+hh+')':'');
  return '- '+trTokName(id,t)+' ['+t.type+', '+lm+'] '+(t.desc||'')
    +((t.notes&&t.notes.length)?' Précisions : '+t.notes.join(' '):'')
    +(t.subs?' Détail des '+t.subs.length+' jetons : '+t.subs.map((x,k)=>x.name+' — '+tr('tok:'+id+':sub:'+k+':w',x.w)+' '+tr('tok:'+id+':sub:'+k+':l',x.l)).join(' | '):'')
    +(hh?' Héros dont le plateau le mentionne : '+hh+'.':'');
}
function sysBase(){
  if(SYS) return SYS;
  const hs=H.map(h=>'- '+trHeroName(h)+' ('+h.set+', complexité '+h.complexity+'/6)'
    +(h.bio||h.desc?' '+(h.bio||h.desc):((DATA.boards||{})[h.id]?' '+DATA.boards[h.id].sum:''))+(h.tags?' Style : '+h.tags.map(t=>TG[t]?TG[t].label:t).join(', ')+'.':'')
    +(h.weapon?' Arme : '+h.weapon:'')
    ).join('\n');
  const ts=tids.map(id=>tokLine(id,false)).join('\n');
  const bs=HB.map(h=>'- '+trHeroName(h)+' (boss, '+h.set+') '+(h.bio||'')+' Arme : '+h.weapon).join('\n');
  const persona=(LANG==='en')?
     "You are the assistant for « Dice Throne Database », a game-help tool for Dice Throne (a dice-and-card dueling game). "
    +"Answer like an experienced player explaining things at the table: natural, direct tone, short sentences, no unnecessary jargon, usually just a few sentences (longer only if the question requires it). No bullet lists unless asked for one. "
    +"Absolute language rule: answer entirely in English, including game terms (Attack, Heal, dmg, Roll Phase, etc.), even though the information below is written in French — translate its content into English in your answer. "
    +"Lean first on the rules and game information below, but never mention a \"database\", \"context\", \"documents\" or what you do or don't have in front of you, and never write sentences like \"the database doesn't say…\" or \"I don't have that information\". Just answer: give your own reading of the rules like an experienced player, and if the exact detail isn't spelled out, reason from the rules you know (and your general knowledge of Dice Throne) to the most likely answer and state it plainly, with at most one short nuance (\"worth double-checking in the rulebook\"). Never invent a precise ability name or number: when unsure, say \"as far as I know\" instead of asserting. "
    +"When you mention a hero or token, write its name exactly as in the information below (the site will turn it into a link). Rephrase, don't copy long official passages verbatim. If the question has nothing to do with Dice Throne, politely say you only answer about the game.\n\n"
    +"The information below contains rephrased summaries of the base rules (rulebook v2.4.3, some starting numbers omitted), of the New Rules announcement dated 10/02/2026 (effective January 1, 2027) and, when relevant, the Adventures, Adventures Unchained, Missions, Naraxus Battle and Marvel Update Pack rulebooks — mention the mode briefly in that case. Detailed hero abilities (boards) are only attached for heroes named in the question; if the question is about an unnamed hero, ask which one. If a question concerns a mode whose rules aren't attached, ask which mode, or give your general reading of that mode. For a number you are unsure of, say \"as far as I know\" rather than guessing silently.\n\n"
   :(LANG==='fr')?
     "Tu es l'assistant de « Dice Throne Database », un outil d'aide de jeu en français pour Dice Throne (jeu de duel avec dés et cartes). "
    +"Réponds comme un joueur expérimenté qui explique à la table : ton naturel et direct, phrases courtes, sans jargon inutile, quelques phrases en général (plus seulement si la question l'exige). Pas de liste à puces sauf si on te la demande. "
    +"Règle de langue absolue : le site est actuellement affiché en français intégral, donc traduis aussi les termes de jeu eux-mêmes en français quand un équivalent naturel existe (par ex. Attack → Attaque, Heal → Soin, dmg → dégâts, Roll Phase → Phase de Lancer) ; garde en anglais uniquement les noms propres (héros, capacités et cartes nommées, jetons uniques comme Hex ou Nevermore, noms d'extensions). "
    +"Appuie-toi d'abord sur les règles et informations de jeu ci-dessous, mais ne parle jamais de « base de données », de « contexte », de « documents » ni de ce que tu as ou n'as pas sous les yeux, et n'écris jamais de phrases comme « la base de données ne dit pas… » ou « je n'ai pas cette information ». Réponds simplement : donne ta lecture des règles comme un joueur expérimenté ; si le détail exact n'est pas écrit, déduis la réponse la plus probable à partir des règles que tu connais (et de ta connaissance générale de Dice Throne) et donne-la franchement, avec au plus une courte nuance (« à vérifier dans le livret »). N'invente jamais un nom de capacité ou un chiffre précis : en cas de doute, dis « à ma connaissance » plutôt que d'affirmer. "
    +"Quand tu cites un héros ou un jeton, écris son nom exactement comme dans les informations ci-dessous (le site en fera un lien). Reformule, ne recopie pas de longs passages officiels. Si la question n'a aucun rapport avec Dice Throne, dis poliment que tu ne réponds que sur le jeu.\n\n"
    +"Les informations ci-dessous contiennent des résumés reformulés des règles de base (livret v2.4.3, sans certains chiffres de départ), de l'annonce des nouvelles règles du 02/10/2026 (en vigueur le 01/01/2027) et, quand la question les concerne, des livrets Adventures, Adventures Unchained, Missions, Naraxus Battle et Marvel Update Pack : cite alors brièvement le mode. Les capacités détaillées (plateaux) ne sont jointes que pour les héros cités dans la question ; si la question vise un héros non nommé, demande lequel. Si une question relève d'un mode dont les règles ne sont pas jointes, demande de préciser le mode ou donne ta lecture générale de ce mode. Pour un chiffre dont tu n'es pas sûr, dis « à ma connaissance » plutôt que de deviner en silence.\n\n"
   :
     "Tu es l'assistant de « Dice Throne Database », un outil d'aide de jeu en français pour Dice Throne (jeu de duel avec dés et cartes). "
    +"Réponds comme un joueur expérimenté qui explique à la table : ton naturel et direct, phrases courtes, sans jargon inutile, quelques phrases en général (plus seulement si la question l'exige). Pas de liste à puces sauf si on te la demande. "
    +"Règle de langue absolue : tous les termes de jeu restent en anglais et ne sont jamais traduits (Poison, Burn, Evasive, Stack Limit, Roll Attempt, Offensive Roll Phase, Attack Modifier, undefendable, Ultimate, etc.) ; le reste est en français. "
    +"Appuie-toi d'abord sur les règles et informations de jeu ci-dessous, mais ne parle jamais de « base de données », de « contexte », de « documents » ni de ce que tu as ou n'as pas sous les yeux, et n'écris jamais de phrases comme « la base de données ne dit pas… » ou « je n'ai pas cette information ». Réponds simplement : donne ta lecture des règles comme un joueur expérimenté ; si le détail exact n'est pas écrit, déduis la réponse la plus probable à partir des règles que tu connais (et de ta connaissance générale de Dice Throne) et donne-la franchement, avec au plus une courte nuance (« à vérifier dans le livret »). N'invente jamais un nom de capacité ou un chiffre précis : en cas de doute, dis « à ma connaissance » plutôt que d'affirmer. "
    +"Quand tu cites un héros ou un jeton, écris son nom exactement comme dans les informations ci-dessous (le site en fera un lien). Reformule, ne recopie pas de longs passages officiels. Si la question n'a aucun rapport avec Dice Throne, dis poliment que tu ne réponds que sur le jeu.\n\n"
    +"Les informations ci-dessous contiennent des résumés reformulés des règles de base (livret v2.4.3, sans certains chiffres de départ), de l'annonce des nouvelles règles du 02/10/2026 (en vigueur le 01/01/2027) et, quand la question les concerne, des livrets Adventures, Adventures Unchained, Missions, Naraxus Battle et Marvel Update Pack : cite alors brièvement le mode. Les capacités détaillées (plateaux) ne sont jointes que pour les héros cités dans la question ; si la question vise un héros non nommé, demande lequel. Si une question relève d'un mode dont les règles ne sont pas jointes, demande de préciser le mode ou donne ta lecture générale de ce mode. Pour un chiffre dont tu n'es pas sûr, dis « à ma connaissance » plutôt que de deviner en silence.\n\n";
  SYS=persona
   +"RÈGLES ET INFORMATIONS DE JEU\n\nHéros :\n"+hs+"\n\nBoss de Dice Throne Adventures (détail joint quand ils sont cités) :\n"+bs+"\n\nJetons :\n"+ts+"\n\nRÈGLES DE BASE :\n"+(DATA.rules||[]).filter(r=>ALWAYS.test(r.s)).map(ruleTxt).join('\n\n')
   +"\n\nDATE DU JOUR : "+new Date().toISOString().slice(0,10)+" (les nouvelles règles de l'annonce du 02/10/2026 s'appliquent à partir du 2027-01-01).";
  return SYS;
}
function copyMsg(code){
  const M={
    rate_limited:UI('err:rate_limited',"Trop de questions d'un coup, ou limite d'usage atteinte. Réessayez dans un moment."),
    session_expired:UI('err:session_expired',"Votre session a expiré. Reconnectez-vous puis réessayez."),
    prompt_too_large:UI('err:prompt_too_large',"La conversation est devenue trop longue. Cliquez sur « Effacer » et reposez la question."),
    upstream_error:UI('err:upstream_error',"L'assistant n'a pas pu répondre pour le moment. Réessayez.")
  };
  return M[code];
}
const OFF=['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'];
let turns=[], ctl=null, asking=false;
function note(msg){const n=document.createElement('p'); n.className='warn'; n.textContent=msg; atext.appendChild(n);}
askForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const q=qIn.value.trim(); if(!q||asking) return;
  const s=await getSample(); if(!s){ askLock(true); return; }
  asking=true; askGo.disabled=true; qIn.value=''; sugg.hidden=true;
  answer.hidden=false; qline.textContent=q; atext.textContent=UI('lbl:thinking','Réflexion…'); atext.classList.add('wait');
  astop.hidden=false; aclear.hidden=true;
  ctl=new AbortController();
  let out='';
  try{
    const sp=sysPrompt(q), enc=new TextEncoder(); let used=enc.encode(sp+q).length+400, hist=[];
    for(let i=turns.length-1;i>=0;i--){used+=enc.encode(turns[i].content).length+20; if(used>62000) break; hist.unshift(turns[i]);}
    while(hist.length&&hist[0].role!=='user') hist.shift();
    const r=await s([{role:'user',content:sp},...hist,{role:'user',content:q}],
      {cache:false,signal:ctl.signal,onText:({text})=>{out=text; atext.classList.remove('wait'); renderAnswer(atext,text);}});
    out=r.text; atext.classList.remove('wait'); renderAnswer(atext,out);
    if(r.truncated) note('Réponse coupée : posez une question plus précise pour avoir la suite.');
    turns.push({role:'user',content:q},{role:'assistant',content:out});
  }catch(err){
    const code=err&&err.code;
    atext.classList.remove('wait');
    if(err&&err.text) renderAnswer(atext,err.text); else atext.textContent='';
    if(OFF.includes(code)){ askLock(true); note(UI('ask.declined','L’assistant n’a pas été autorisé. Autorisez-le dans la fenêtre de Claude, ou rechargez la page et réessayez.')); }
    else if(code!=='cancelled') note(copyMsg(code)||copyMsg('upstream_error'));
    else if(!out) atext.textContent=UI('lbl:interrupted','Question interrompue.');
    if(out&&code==='cancelled') turns.push({role:'user',content:q},{role:'assistant',content:out});
  }finally{
    asking=false; askGo.disabled=false; astop.hidden=true; aclear.hidden=false; ctl=null; qIn.focus();
  }
});
astop.addEventListener('click',()=>{if(ctl) ctl.abort();});
aclear.addEventListener('click',()=>{turns=[]; answer.hidden=true; atext.textContent=''; sugg.hidden=false; qIn.focus();});
sugg.addEventListener('click',e=>{const b=e.target.closest('.chip'); if(!b) return; qIn.value=b.textContent; askForm.requestSubmit();});

/* ---------- Tournoi : configuration et participants (étape 1) ----------
   État unique `tourS` sauvegardé dans localStorage ('dtdb.tour.v1'). On y stocke des id de
   héros, jamais d'images. Les textes statiques passent par data-i18n (défaut FR dans le HTML),
   les textes dynamiques par la branche LANG==='en' ci-dessous. */
const TOUR_KEY='dtdb.tour.v1', TOUR_MAX=64;
Object.assign(STR.en,{
  'tab.tour':'Tournament',
  'tour:exit':'← Quit','tour:wipe':'Reset all','tour:title':'Tournament',
  'tour:sub':'Format, participants, heroes. Everything is saved in this browser.',
  'tour:g:fmt':'Format','tour:fmt:single':'Single elimination','tour:fmt:double':'Double elimination',
  'tour:g:bo':'Games per match','tour:g:rounds':'Rounds','tour:st:rounds':'Number of rounds',
  'tour:g:team':'Entrants','tour:team:1':'Solo','tour:team:2':'Teams of 2','tour:team:3':'Teams of 3',
  'tour:g:mode':'Heroes','tour:mode:none':'No pick/ban',
  'tour:st:bring':'Bring: heroes registered','tour:st:ban':'Ban: heroes banned per game','tour:st:dbans':'Bans per side',
  'tour:p:title':'Participants','tour:add':'Add','tour:add:ph':'Name, or paste a list',
  'tour:empty':'No participants yet. Type a name, then press Enter.',
  'tour:rand':'Random heroes','tour:lib:title':'Hero library',
  'tour:save:title':'Save the tournament','tour:save:export':'Export','tour:save:exnote':'A JSON file with participants, heroes, settings and every result.','tour:save:dl':'Download the file','tour:save:copy':'Copy the content','tour:save:import':'Import','tour:save:imnote':'Importing replaces the current tournament.','tour:save:file':'Choose a file','tour:save:paste':'Or paste the JSON here','tour:save:go':'Import','tour:save:open':'Backup: export / import','tour:vic:close':'View the bracket',
  'tour:shuf':'Shuffle order','tour:fit':'Fit','tour:go':'Start tournament','tour:back':'Edit','tour:resetres':'Reset results'
});
function tourDefault(){ return {v:1,uid:1,phase:'setup',run:null,cfg:{format:'swiss',bo:1,rounds:4,team:1,mode:'bring',bring:3,ban:1,dbans:2},entrants:[]}; }
function tourClamp(n,a,b){ n=Math.round(+n); return isFinite(n)?Math.min(b,Math.max(a,n)):a; }
function tourNorm(s){
  const c=s.cfg;
  if(!['single','double','swiss'].includes(c.format)) c.format='single';
  c.bo=[1,3,5].includes(+c.bo)?+c.bo:1;
  c.rounds=tourClamp(c.rounds,1,9);
  c.team=[1,2,3].includes(+c.team)?+c.team:1;
  if(!['none','bring','draft'].includes(c.mode)) c.mode='none';
  if(c.format==='swiss'){ c.team=1; c.bo=1; }
  if(c.team>1&&c.mode==='bring') c.mode='none';
  c.bring=tourClamp(c.bring,2,6); c.ban=tourClamp(c.ban,1,c.bring-1); c.dbans=tourClamp(c.dbans,0,6);
  const seen=new Set(); let mx=0;
  s.entrants=(Array.isArray(s.entrants)?s.entrants:[]).slice(0,TOUR_MAX).map(e=>{
    e=e||{}; let id=+e.id||0; if(!id||seen.has(id)) id=0; if(id) seen.add(id); mx=Math.max(mx,id);
    const pl=Array.isArray(e.players)?e.players:[];
    return {id,name:String(e.name||'').slice(0,40),
      players:c.team>1?Array.from({length:c.team},(_,i)=>String(pl[i]||'').slice(0,40)):[],
      heroes:tourCleanHeroes(e.heroes)};
  });
  s.entrants.forEach(e=>{ if(!e.id) e.id=++mx; });
  s.uid=Math.max(+s.uid||1,mx+1);
  const r=s.run;
  if(r&&Array.isArray(r.order)&&r.order.length>=2&&['single','double','swiss'].includes(r.fmt)&&r.order.every(id=>s.entrants.some(e=>e.id===id))){
    r.bo=[1,3,5].includes(+r.bo)?+r.bo:1; r.team=[1,2,3].includes(+r.team)?+r.team:1; if(!['none','bring','draft'].includes(r.mode)) r.mode='none';
    const g={}; if(r.games&&typeof r.games==='object') Object.keys(r.games).forEach(k=>{ if(Array.isArray(r.games[k])) g[k]=r.games[k].filter(x=>x&&typeof x==='object'&&(x.w===undefined||x.w===null||x.w==='a'||x.w==='b')).map(x=>{ const y=tourCleanGame(x); if(y.w==='t') delete y.w; return y; }); });
    if(r.fmt==='swiss'){
      r.rounds=tourClamp(r.rounds,1,9); r.team=1; r.bo=1;
      const okId=x=>r.order.includes(x), sw=[];
      (Array.isArray(r.sw)?r.sw:[]).some(rd=>{
        if(!rd||!Array.isArray(rd.pairs)) return true;
        const pairs=rd.pairs.filter(pr=>pr&&okId(pr.a)&&okId(pr.b)&&pr.a!==pr.b).map(pr=>({a:pr.a,b:pr.b,r:(pr.r==='a'||pr.r==='b'||pr.r==='t')?pr.r:null,
          ha:(typeof pr.ha==='number'&&isFinite(pr.ha)&&pr.ha>=0)?Math.min(999,Math.round(pr.ha)):null,hb:(typeof pr.hb==='number'&&isFinite(pr.hb)&&pr.hb>=0)?Math.min(999,Math.round(pr.hb)):null,g:(pr.g&&typeof pr.g==='object')?tourCleanGame(pr.g):null}));
        if(!pairs.length&&!(rd.bye!=null)) return true;
        sw.push({pairs,bye:okId(rd.bye)?rd.bye:null}); return sw.length>=r.rounds;
      });
      r.sw=sw; if(!sw.length) s.run=null;
    }
    r.games=g; const at={}; if(r.at&&typeof r.at==='object') Object.keys(r.at).forEach(k=>{ if(Array.isArray(r.at[k])&&r.at[k].length===2) at[k]=r.at[k]; }); r.at=at;
  }else s.run=null;
  s.phase=(s.run&&s.phase==='run')?'run':'setup';
  return s;
}
function tourCleanHeroes(a){
  const r=(Array.isArray(a)?a:[]).slice(0,6).map(x=>(typeof x==='string'&&H.some(h=>h.id===x))?x:null);
  while(r.length&&r[r.length-1]===null) r.pop();
  return r;
}
function tourLoad(){
  let s=null;
  try{ const r=localStorage.getItem(TOUR_KEY); if(r){ const o=JSON.parse(r); if(o&&o.v===1&&o.cfg) s=o; } }catch(e){}
  if(!s) s=tourDefault();
  s.cfg=Object.assign(tourDefault().cfg,s.cfg);
  return tourNorm(s);
}
let tourS=tourLoad(), tourIsOpen=false, tourPrev='heroes', tourWipeT=0, tourSaveOK=true;
function tourSave(){ try{ localStorage.setItem(TOUR_KEY,JSON.stringify(tourS)); tourSaveOK=true; }catch(e){ tourSaveOK=false; } }

const tourEl=document.getElementById('tour'), tourListEl=document.getElementById('tlist'), tourNameIn=document.getElementById('tname');
const tourInfoEl=document.getElementById('tinfo'), tourEmptyEl=document.getElementById('tempty'), tourCountEl=document.getElementById('tcount');
const tourWipeBtn=document.getElementById('tourwipe');
function tourEN(){ return LANG==='en'; }
function tourPlural(n,one,many){ return n===1?one:many; }

/* ----- rendu de la liste des participants ----- */
function tourRow(e,i,isNew){
  const c=tourS.cfg, li=mk('li','tent'+(isNew?' new':'')); li.dataset.id=e.id;
  li.appendChild(mk('span','seed',String(i+1)));
  const inp=document.createElement('input'); inp.type='text'; inp.className='tname'; inp.maxLength=40; inp.value=e.name;
  inp.placeholder=c.team>1?(tourEN()?'Team name':"Nom de l'équipe"):(tourEN()?'Name':'Nom');
  inp.setAttribute('aria-label',tourEN()?'Participant name':'Nom du participant');
  inp.addEventListener('input',()=>{ e.name=inp.value; tourSave(); });
  li.appendChild(inp);
  const acts=mk('div','tacts'), en0=tourEN();
  const up=mk('button','tup','▲'), dn=mk('button','tdn','▼'); up.type=dn.type='button';
  up.setAttribute('aria-label',en0?'Move up (better seed)':'Monter (meilleure tête de série)'); dn.setAttribute('aria-label',en0?'Move down':'Descendre');
  up.disabled=i===0; dn.disabled=i===tourS.entrants.length-1;
  up.addEventListener('click',()=>tourMove(e.id,-1)); dn.addEventListener('click',()=>tourMove(e.id,1));
  const del=mk('button','tdel','×'); del.type='button'; del.setAttribute('aria-label',en0?'Remove this participant':'Retirer ce participant');
  del.addEventListener('click',()=>tourRemove(e.id,li));
  acts.appendChild(up); acts.appendChild(dn); acts.appendChild(del); li.appendChild(acts);
  const ns=tourSlots();
  if(c.team>1){
    const mem=mk('div','tmembers');
    e.players.forEach((p,k)=>{
      const cell=mk('div','tmem');
      const pi=document.createElement('input'); pi.type='text'; pi.maxLength=40; pi.value=p;
      pi.placeholder=(tourEN()?'Player ':'Joueur ')+(k+1);
      pi.setAttribute('aria-label',pi.placeholder);
      pi.addEventListener('input',()=>{ e.players[k]=pi.value; tourSave(); });
      cell.appendChild(pi);
      if(ns>k) cell.appendChild(tourSlotEl(e,k));
      mem.appendChild(cell);
    });
    li.appendChild(mem);
  }else if(ns>0){
    const box=mk('div','tslots');
    for(let k=0;k<ns;k++) box.appendChild(tourSlotEl(e,k));
    li.appendChild(box);
  }
  return li;
}
function tourRenderList(newId){
  tourListEl.textContent='';
  tourS.entrants.forEach((e,i)=>tourListEl.appendChild(tourRow(e,i,e.id===newId)));
  tourEmptyEl.hidden=tourS.entrants.length>0;
  tourSyncInfo();
}
function tourAdd(raw){
  const names=String(raw).split(/[\n\r,;]+/).map(x=>x.trim()).filter(Boolean);
  if(!names.length) return 0;
  const c=tourS.cfg; let n=0, last=0;
  for(const nm of names){
    if(tourS.entrants.length>=TOUR_MAX) break;
    const e={id:tourS.uid++,name:nm.slice(0,40),players:c.team>1?Array.from({length:c.team},()=>''):[],heroes:[]};
    tourS.entrants.push(e); n++; last=e.id;
  }
  tourSave(); tourRenderList(names.length===1?last:0);
  if(n>1||!last) return n;
  const li=tourListEl.querySelector('[data-id="'+last+'"]'); if(li&&li.scrollIntoView) li.scrollIntoView({block:'nearest',behavior:still.matches?'auto':'smooth'});
  return n;
}
function tourMove(id,d){
  const a=tourS.entrants, i=a.findIndex(e=>e.id===id), j=i+d; if(i<0||j<0||j>=a.length) return;
  [a[i],a[j]]=[a[j],a[i]]; tourSave(); tourRenderList();
  const li=tourListEl.querySelector('[data-id="'+id+'"]'); if(li){ const b=li.querySelector(d<0?'.tup':'.tdn'); if(b&&!b.disabled) b.focus({preventScroll:true}); }
}
function tourShuffle(){
  const a=tourS.entrants; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  tourSave(); tourRenderList();
}
function tourRemove(id,li){
  const go=()=>{ tourS.entrants=tourS.entrants.filter(e=>e.id!==id); tourSave(); tourRenderList(); };
  if(still.matches||!li){ go(); return; }
  li.classList.add('gone'); setTimeout(go,180);
}

/* ----- configuration : chips, steppers, descriptions ----- */
function tourNextPow2(n){ let p=1; while(p<n) p*=2; return p; }
function tourSyncInfo(){
  const c=tourS.cfg, n=tourS.entrants.length, en=tourEN(), out=[];
  tourCountEl.textContent=n+' '+tourPlural(n,'participant','participants')+(c.team>1?(en?' ('+n+tourPlural(n,' team',' teams')+')':' ('+n+tourPlural(n,' équipe',' équipes')+')'):'');
  if(n<2) out.push(en?'At least 2 participants are needed.':'Il faut au moins 2 participants.');
  else if(c.format==='swiss'){
    if(n%2) out.push(en?'Odd number: one bye each round.':'Nombre impair : un bye à chaque ronde.');
    if(c.rounds>n-1) out.push('<span class="warn">'+(en?'Too many rounds for '+n+' players: rematches are unavoidable.':'Trop de rondes pour '+n+' joueurs : des rematchs sont inévitables.')+'</span>');
  }else{
    const b=tourNextPow2(n)-n;
    out.push(b?(en?'Bracket of '+tourNextPow2(n)+': '+b+' automatic '+tourPlural(b,'bye','byes')+'.':'Bracket de '+tourNextPow2(n)+' : '+b+' '+tourPlural(b,'bye','byes')+' automatique'+(b>1?'s':'')+'.')
             :(en?'Full bracket of '+n+', no bye.':'Bracket complet de '+n+', aucun bye.'));
  }
  if(n>=2&&c.format!=='swiss') out.push(en?'Seeding follows the list order (1 = top seed). Use ▲ ▼ or Shuffle.':"Têtes de série = ordre de la liste (1 = la meilleure). Utilise ▲ ▼ ou Mélanger.");
  if(c.format==='swiss'&&n>=2) out.push(en?'Round 1 is paired at random. Then by points, without rematches. A bye counts as a win (3 pts).':'Ronde 1 : appariements au hasard. Ensuite par points, sans rematch. Un bye compte comme une victoire (3 pts).');
  document.getElementById('tgo').disabled=!(n>=2);
  if(n>=TOUR_MAX) out.push('<span class="warn">'+(en?'Maximum reached ('+TOUR_MAX+').':'Maximum atteint ('+TOUR_MAX+').')+'</span>');
  if(!tourSaveOK) out.push('<span class="warn">'+(en?'Saving is blocked in this browser: changes will be lost on reload.':"L'enregistrement est bloqué dans ce navigateur : les changements seront perdus au rechargement.")+'</span>');
  tourInfoEl.innerHTML=out.join('<br>');
  tourSyncDock();
}
function tourSyncCfg(){
  const c=tourS.cfg, en=tourEN(), sw=c.format==='swiss';
  tourEl.querySelectorAll('[data-k]').forEach(b=>{
    const k=b.dataset.k; b.setAttribute('aria-pressed',String(c[k]==b.dataset.v));
    let dis=false, why='';
    if(k==='team'&&b.dataset.v!=='1'&&sw){ dis=true; why=en?'Teams are not available in Swiss.':'Les équipes ne sont pas disponibles en Swiss.'; }
    if(k==='mode'&&b.dataset.v==='bring'&&c.team>1){ dis=true; why=en?'Bring N, Ban M is solo only.':'Bring N, Ban M est réservé au solo.'; }
    b.disabled=dis; if(why) b.title=why; else b.removeAttribute('title');
  });
  document.getElementById('tgbo').hidden=sw;
  document.getElementById('tgrounds').hidden=!sw;
  document.getElementById('tsbring').hidden=c.mode!=='bring';
  document.getElementById('tsban').hidden=c.mode!=='bring';
  document.getElementById('tsdbans').hidden=c.mode!=='draft';
  ['rounds','bring','ban','dbans'].forEach(k=>{ document.getElementById('tv'+k).textContent=c[k]; });
  const lim={rounds:[1,9],bring:[2,6],ban:[1,c.bring-1],dbans:[0,6]};
  tourEl.querySelectorAll('[data-step]').forEach(b=>{ const l=lim[b.dataset.step], v=c[b.dataset.step], d=+b.dataset.d; b.disabled=(d<0&&v<=l[0])||(d>0&&v>=l[1]); });
  const fd={single:en?"One loss and you're out. Automatic byes when the number of participants isn't a power of 2.":"Une défaite et tu sors. Byes automatiques si le nombre de participants n'est pas une puissance de 2.",
    double:en?'Two losses to be out: winners bracket, losers bracket, then grand final.':'Deux défaites pour sortir : winners bracket, losers bracket, puis grande finale.',
    swiss:en?'Everyone plays every round, one game per round. Win 3 pts, tie 1, loss 0. Most points wins.':'Tout le monde joue chaque ronde, une partie par ronde. Victoire 3 pts, égalité 1, défaite 0. Le plus de points gagne.'};
  document.getElementById('tdescfmt').textContent=fd[c.format];
  const k=(c.bo+1)/2;
  document.getElementById('tdescbo').textContent=en?'BO'+c.bo+': first to win '+k+(k>1?' games.':' game.'):'BO'+c.bo+' : le premier à gagner '+k+' manche'+(k>1?'s':'')+'.';
  document.getElementById('tdescteam').textContent=c.team>1?(en?'One game per match: each teammate plays one hero.':'Une seule partie par match : chaque coéquipier joue un héros.'):(sw?(en?'Swiss is played solo.':'Le Swiss se joue en solo.'):'');
  const p=c.team, b=c.dbans; let md='';
  if(c.mode==='none') md=p>1?(en?'Each teammate brings a single hero, fixed for the whole tournament. No pick, no ban.':'Chaque coéquipier vient avec un seul héros, fixé pour tout le tournoi. Ni pick ni ban.')
                            :(en?'Each participant brings a single hero, fixed for the whole tournament. No pick, no ban.':'Chaque participant vient avec un seul héros, fixé pour tout le tournoi. Ni pick ni ban.');
  else if(c.mode==='bring') md=en?'Each participant registers '+c.bring+' heroes for the whole tournament. Every game, each side bans '+c.ban+' of the opponent\'s heroes, then plays one of those left.'
                                 :'Chaque participant inscrit '+c.bring+' héros pour tout le tournoi. À chaque partie, chacun bannit '+c.ban+' des héros de l\'adversaire, puis joue l\'un de ceux qui restent.';
  else md=en?'No heroes registered in advance. New draft every game: '+b+' ban'+(b===1?'':'s')+' per side, then '+p+' pick'+(p===1?'':'s')+' per side.'
            :'Aucun héros inscrit à l\'avance. Nouveau draft à chaque manche : '+b+' ban'+(b>1?'s':'')+' par camp, puis '+p+' pick'+(p>1?'s':'')+' par camp.';
  document.getElementById('tdescmode').textContent=md;
  tourNameIn.setAttribute('aria-label',en?'Participant name':'Nom du participant'); document.getElementById('tsavex').setAttribute('aria-label',en?'Close':'Fermer');
  tourNameIn.placeholder=c.team>1?(en?'Team name, or paste a list':"Nom d'équipe, ou colle une liste"):UI('tour:add:ph','Nom, ou colle une liste');
  tourSyncInfo(); tourSyncDock();
}
function tourRefresh(){ tourWipeBtn.classList.remove('armed'); clearTimeout(tourWipeT); tourWipeBtn.textContent=UI('tour:wipe','Tout effacer'); tourDisarm(); tourBuildLib(); tourSyncCfg(); tourRenderList(); tourApplyPhase(); if(tourOpenMatchId&&tourS.run) tourFillMatch(); }

tourEl.addEventListener('click',e=>{
  const st=e.target.closest('[data-step]');
  if(st&&!st.disabled){ const k=st.dataset.step; tourS.cfg[k]+=+st.dataset.d; tourNorm(tourS); tourSave(); tourSyncCfg(); if(k==='bring') tourRenderList(); return; }
  const b=e.target.closest('[data-k]'); if(!b||b.disabled) return;
  const k=b.dataset.k; tourS.cfg[k]=(k==='format'||k==='mode')?b.dataset.v:+b.dataset.v;
  tourNorm(tourS); tourSave(); tourSyncCfg();
  if(k==='team'||k==='format'||k==='mode') tourRenderList();
});
document.getElementById('taddgo').addEventListener('click',()=>{ if(tourAdd(tourNameIn.value)) tourNameIn.value=''; tourNameIn.focus({preventScroll:true}); });
/* un champ à une seule ligne aplatit les retours à la ligne : on intercepte le collage d'une liste */
tourNameIn.addEventListener('paste',e=>{
  const t=(e.clipboardData||window.clipboardData).getData('text')||'';
  if(/[\n\r]/.test(t)){ e.preventDefault(); if(tourAdd(t)) tourNameIn.value=''; }
});
tourNameIn.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); if(tourAdd(tourNameIn.value)) tourNameIn.value=''; } });
tourWipeBtn.addEventListener('click',()=>{
  if(!tourWipeBtn.classList.contains('armed')){
    tourWipeBtn.classList.add('armed'); tourWipeBtn.textContent=UI('tour:wipe:ask',tourEN()?'Confirm?':'Confirmer ?');
    tourWipeT=setTimeout(()=>{ tourWipeBtn.classList.remove('armed'); tourWipeBtn.textContent=UI('tour:wipe','Tout effacer'); },3200); return;
  }
  clearTimeout(tourWipeT); tourS=tourNorm(tourDefault()); tourSave(); tourNameIn.value=''; tourRefresh();
});

/* ----- ouverture / fermeture de l'overlay ----- */
function tourSel(on){ tabs.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',on?(b.dataset.pane==='tour'?'true':'false'):(b.dataset.pane===tourPrev?'true':'false'))); }
function openTour(){
  if(tourIsOpen) return; tourIsOpen=true;
  const sel=tabs.querySelector('[aria-selected="true"]'); tourPrev=sel&&sel.dataset.pane!=='tour'?sel.dataset.pane:'heroes';
  tourSel(true); tourChampInit=false; tourRefresh();
  tourEl.classList.add('on'); tourEl.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  const fine=window.matchMedia('(pointer:fine)').matches;
  (fine&&!tourS.entrants.length&&tourS.phase==='setup'?tourNameIn:document.getElementById('tourexit')).focus({preventScroll:true});
}
function closeTour(){
  if(!tourIsOpen) return; tourIsOpen=false; tourCloseMatch(); tourCloseVic(); tourCloseSave(); if(tourBrFx) tourBrFx.stop(); if(tourDrag.p) tourDragEnd(true); tourDisarm();
  tourEl.classList.remove('on'); tourEl.setAttribute('aria-hidden','true'); document.body.style.overflow='';
  showPane(tourPrev);
}
document.getElementById('tourexit').addEventListener('click',closeTour);
document.addEventListener('keydown',e=>{ if(e.key!=='Escape'||!tourIsOpen) return;
  if(!document.getElementById('tvic').hidden){ tourCloseVic(); return; }
  if(!document.getElementById('tsave').hidden){ tourCloseSave(); return; }
  if(tourOpenMatchId){ tourCloseMatch(); return; }
  if(tourDrag.p){ tourDragEnd(true); return; }
  if(tourArm){ tourDisarm(); return; }
  closeTour(); });

/* ================= Étape 2 : emplacements de héros, bibliothèque, glisser-déposer ================= */
/* Emplacements par participant : Sans pick/ban = 1 par joueur ; Bring = N ; Draft = aucun.
   `e.heroes` est positionnel (null = vide) ; un même héros n'apparaît qu'une fois par participant
   (deux participants peuvent jouer le même héros : miroir autorisé). */
let tourArm=null, tourLibSet='all', tourHintT=0;
const tourDrag={p:null,on:false,ghost:null,raf:0,over:null,swallow:0};
function tourSlots(){ const c=tourS.cfg; return c.mode==='none'?c.team:(c.mode==='bring'?c.bring:0); }
function tourHeroById(id){ return id?H.find(h=>h.id===id)||null:null; }
function tourEntById(id){ return tourS.entrants.find(e=>e.id===id)||null; }
function tourDupIn(list,n){ const seen=new Set(); for(let i=0;i<n;i++){ const x=list[i]; if(!x) continue; if(seen.has(x)) return true; seen.add(x); } return false; }

function tourSlotEl(e,si){
  const d=mk('div','tslot'); d.dataset.e=e.id; d.dataset.s=si;
  const m=mk('button','tslot-main'); m.type='button'; d.appendChild(m);
  const x=mk('button','tslot-x','×'); x.type='button'; x.hidden=true; d.appendChild(x);
  tourPaintSlot(d,e); return d;
}
function tourPaintSlot(d,e){
  const si=+d.dataset.s, h=tourHeroById(e.heroes[si]), m=d.querySelector('.tslot-main'), x=d.querySelector('.tslot-x'), en=tourEN();
  m.textContent=''; d.classList.toggle('filled',!!h);
  const lab=(en?'Hero slot ':'Emplacement héros ')+(si+1)+(e.name?' — '+e.name:'')+' : ';
  if(h){
    if(h.plate){ const im=document.createElement('img'); im.className='tplate'; im.src=h.plate; im.alt=''; im.draggable=false; m.appendChild(im); }
    else m.appendChild(mk('span','tplate-txt',trHeroName(h)));
    x.hidden=false; x.setAttribute('aria-label',(en?'Remove ':'Retirer ')+trHeroName(h)); d.title=trHeroName(h);
    m.setAttribute('aria-label',lab+trHeroName(h));
  }else{
    m.appendChild(mk('span','tslot-empty','+')); x.hidden=true; d.removeAttribute('title');
    m.setAttribute('aria-label',lab+(en?'empty':'vide'));
  }
}
function tourSlotNode(eid,si){ return tourListEl.querySelector('.tslot[data-e="'+eid+'"][data-s="'+si+'"]'); }
function tourRepaint(eid,si){ const d=tourSlotNode(eid,si), e=tourEntById(eid); if(d&&e) tourPaintSlot(d,e); }
function tourFx(node,cls){ if(!node||still.matches) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); setTimeout(()=>node.classList.remove(cls),420); }

/* pose un héros dans un emplacement (depuis la bibliothèque, ou déplacement/échange depuis un autre emplacement) */
function tourAssign(eid,si,id,from){
  const e=tourEntById(eid), n=tourSlots(); if(!e||si>=n) return false;
  const a=e.heroes.slice(); while(a.length<6) a.push(null);
  let other=null, b=null;
  if(from){
    other=tourEntById(from.e); if(!other) return false;
    if(other===e){ const t=a[si]; a[si]=a[from.s]; a[from.s]=t; b=a; }
    else{ b=other.heroes.slice(); while(b.length<6) b.push(null); const t=a[si]; a[si]=b[from.s]; b[from.s]=t; }
  }else a[si]=id;
  if(tourDupIn(a,n)||(b&&b!==a&&tourDupIn(b,n))){
    tourHint(tourEN()?'This hero is already in this line-up.':'Ce héros est déjà chez ce participant.',true); tourFx(tourSlotNode(eid,si),'shake'); return false;
  }
  const trim=x=>{ while(x.length&&x[x.length-1]===null) x.pop(); return x; };
  e.heroes=trim(a); if(other&&other!==e) other.heroes=trim(b);
  tourSave(); tourRepaint(eid,si); if(from) tourRepaint(from.e,from.s);
  tourFx(tourSlotNode(eid,si),'pop'); tourSyncLib(); return true;
}
function tourClearSlot(eid,si){
  const e=tourEntById(eid); if(!e||!e.heroes[si]) return;
  e.heroes[si]=null; while(e.heroes.length&&e.heroes[e.heroes.length-1]===null) e.heroes.pop();
  tourSave(); tourRepaint(eid,si); tourSyncLib();
}
/* tirage : remplit les emplacements vides depuis la bibliothèque affichée, en évitant d'abord les héros déjà pris ailleurs */
function tourRandomFill(){
  const n=tourSlots(); if(!n) return;
  const pool=H.filter(h=>tourLibSet==='all'||h.set===tourLibSet).map(h=>h.id); if(!pool.length) return;
  const used=new Set(); tourS.entrants.forEach(e=>{ for(let i=0;i<n;i++) if(e.heroes[i]) used.add(e.heroes[i]); });
  let changed=false;
  tourS.entrants.forEach(e=>{
    for(let i=0;i<n;i++){
      if(e.heroes[i]) continue;
      const mine=new Set(e.heroes.slice(0,n).filter(Boolean));
      let cand=pool.filter(id=>!used.has(id)&&!mine.has(id));
      if(!cand.length) cand=pool.filter(id=>!mine.has(id));
      if(!cand.length) continue;
      const id=cand[Math.floor(Math.random()*cand.length)];
      while(e.heroes.length<i) e.heroes.push(null);
      e.heroes[i]=id; used.add(id); changed=true;
    }
  });
  if(!changed){ tourHint(tourEN()?'Nothing to fill.':'Rien à remplir.',false); return; }
  tourSave(); tourRenderList(); tourSyncLib();
  tourListEl.querySelectorAll('.tslot.filled').forEach(d=>tourFx(d,'pop'));
}

/* ----- bibliothèque (dock) ----- */
function tourHint(msg,warn){
  const el=document.getElementById('tlibhint'); clearTimeout(tourHintT);
  if(!msg){ el.classList.remove('on','warn'); return; }
  el.textContent=msg; el.classList.toggle('warn',!!warn); el.classList.add('on');
  if(warn||!tourArm) tourHintT=setTimeout(tourHintRefresh,2600);
}
function tourHintRefresh(){
  const el=document.getElementById('tlibhint');
  if(tourArm){ const h=tourHeroById(tourArm); tourHint((tourEN()?'Selected: ':'Sélectionné : ')+trHeroName(h)+(tourEN()?'. Tap a slot, or drag the hero.':'. Touche un emplacement, ou glisse le héros.'),false); }
  else el.classList.remove('on','warn');
}
function tourDisarm(){ tourArm=null; tourEl.classList.remove('arming'); tourEl.querySelectorAll('.tlib-disc[aria-pressed="true"]').forEach(b=>b.setAttribute('aria-pressed','false')); tourHintRefresh(); }
function tourToggleArm(id){
  if(tourArm===id){ tourDisarm(); return; }
  tourArm=id; tourEl.classList.add('arming');
  tourEl.querySelectorAll('.tlib-disc').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===id?'true':'false'));
  tourHintRefresh();
}
function tourBuildLib(){
  const rowEl=document.getElementById('tlibrow'), setsEl2=document.getElementById('tlibsets');
  const so=x=>{ const i=SET_ORDER.indexOf(x.set); return i<0?99:i; };
  const list=[...H].sort((a,b)=>so(a)-so(b)||trHeroName(a).localeCompare(trHeroName(b)));
  rowEl.textContent='';
  list.forEach(h=>{
    const li=mk('li','tlib'); li.dataset.set=h.set; li.dataset.id=h.id;
    const b=mk('button','tlib-disc'); b.type='button'; b.dataset.id=h.id; b.setAttribute('aria-pressed',String(tourArm===h.id));
    b.setAttribute('aria-label',trHeroName(h)); b.title=trHeroName(h);
    const d=mk('span','d'); const im=document.createElement('img'); im.src=h.icon; im.alt=''; im.draggable=false; d.appendChild(im);
    const cnt=mk('span','tlib-n'); cnt.hidden=true;
    b.appendChild(d); b.appendChild(cnt); b.appendChild(mk('span','tlib-nm',trHeroName(h)));
    li.appendChild(b); rowEl.appendChild(li);
  });
  setsEl2.textContent='';
  const sets=['all',...SET_ORDER.filter(x=>H.some(h=>h.set===x))];
  if(!sets.includes(tourLibSet)) tourLibSet='all';
  sets.forEach(k=>{
    const c=mk('button','chip',k==='all'?(tourEN()?'All':'Tous'):trSet(k)); c.type='button'; c.dataset.lib=k; c.setAttribute('aria-pressed',String(k===tourLibSet)); setsEl2.appendChild(c);
  });
  tourApplyLibFilter(); tourSyncLib();
}
function tourApplyLibFilter(){
  document.getElementById('tlibrow').querySelectorAll('.tlib').forEach(li=>{ li.hidden=!(tourLibSet==='all'||li.dataset.set===tourLibSet); });
  document.getElementById('tlibsets').querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.lib===tourLibSet)));
}
function tourSyncLib(){
  const n=tourSlots(), cnt=new Map();
  tourS.entrants.forEach(e=>{ for(let i=0;i<n;i++) if(e.heroes[i]) cnt.set(e.heroes[i],(cnt.get(e.heroes[i])||0)+1); });
  document.getElementById('tlibrow').querySelectorAll('.tlib').forEach(li=>{
    const k=cnt.get(li.dataset.id)||0, b=li.querySelector('.tlib-n'); b.hidden=!k; b.textContent=k;
  });
}
function tourSyncDock(){
  const n=tourSlots(), setup=tourS.phase!=='run';
  document.getElementById('tdock').hidden=n===0||!setup; tourEl.classList.toggle('hasdock',n>0&&setup);
  document.getElementById('trand').hidden=n===0||!tourS.entrants.length;
  document.getElementById('tshuf').hidden=tourS.entrants.length<2;
  if(!n) tourDisarm();
}
document.getElementById('tlibsets').addEventListener('click',e=>{ const c=e.target.closest('[data-lib]'); if(!c) return; tourLibSet=c.dataset.lib; tourApplyLibFilter(); });
document.getElementById('trand').addEventListener('click',tourRandomFill);

/* ----- clics : sélection (tap) puis pose dans un emplacement ----- */
tourEl.addEventListener('click',e=>{
  if(performance.now()<tourDrag.swallow){ if(e.target.closest('.tlib-disc,.tslot')){ e.stopPropagation(); e.preventDefault(); } return; }
  const disc=e.target.closest('.tlib-disc');
  if(disc){ tourToggleArm(disc.dataset.id); return; }
  const x=e.target.closest('.tslot-x');
  if(x){ const d=x.closest('.tslot'); tourClearSlot(+d.dataset.e,+d.dataset.s); return; }
  const m=e.target.closest('.tslot-main');
  if(m){
    const d=m.closest('.tslot');
    if(tourArm){ if(tourAssign(+d.dataset.e,+d.dataset.s,tourArm,null)) tourDisarm(); }
    else if(!d.classList.contains('filled')) tourHint(tourEN()?'Pick a hero in the library first.':"Choisis d'abord un héros dans la bibliothèque.",false);
  }
});

/* ----- glisser-déposer (Pointer Events : souris, stylet, tactile) ----- */
/* souris/stylet : le glisser démarre après 5 px ; tactile : appui long (230 ms) pour ne pas bloquer le défilement */
function tourDropTarget(x,y){
  const el=document.elementFromPoint(x,y); if(!el) return null;
  const slot=el.closest('.tslot');
  if(slot&&tourEl.contains(slot)) return {e:+slot.dataset.e,s:+slot.dataset.s,node:slot};
  const row=el.closest('.tent');
  if(row&&tourEl.contains(row)){
    const eid=+row.dataset.id, ent=tourEntById(eid), n=tourSlots(); if(!ent||!n) return null;
    let s=-1; for(let i=0;i<n;i++) if(!ent.heroes[i]){ s=i; break; }
    if(s<0&&n===1) s=0;
    if(s>=0) return {e:eid,s,node:tourSlotNode(eid,s)||row,row};
  }
  return null;
}
function tourOnDock(x,y){ const el=document.elementFromPoint(x,y); return !!(el&&el.closest('#tdock')); }
function tourPress(ev,id,from,src){
  if(tourDrag.p||!id) return;
  const p={id,from,src,x0:ev.clientX,y0:ev.clientY,x:ev.clientX,y:ev.clientY,pid:ev.pointerId,touch:ev.pointerType==='touch',t:0,moved:false,tgt:null};
  tourDrag.p=p; tourDrag.on=false;
  if(p.touch) p.t=setTimeout(tourDragBegin,230);
  document.addEventListener('pointermove',tourPMove); document.addEventListener('pointerup',tourPUp); document.addEventListener('pointercancel',tourPUp);
}
function tourPMove(ev){
  const p=tourDrag.p; if(!p||ev.pointerId!==p.pid) return;
  p.x=ev.clientX; p.y=ev.clientY;
  const dist=Math.hypot(p.x-p.x0,p.y-p.y0);
  if(!tourDrag.on){
    if(p.touch){ if(dist>10){ clearTimeout(p.t); tourDragEnd(false); } return; }
    if(dist<=5) return; tourDragBegin();
  }
  if(dist>10) p.moved=true;
  if(ev.cancelable) ev.preventDefault();
  tourDragFrame();
}
function tourDragBegin(){
  const p=tourDrag.p; if(!p||tourDrag.on) return; tourDrag.on=true;
  const h=tourHeroById(p.id), g=mk('div','tghost'); const im=document.createElement('img'); im.src=h.icon; im.alt=''; g.appendChild(im);
  tourEl.appendChild(g); tourDrag.ghost=g; document.body.classList.add('tour-dragging');
  if(p.from){ const d=tourSlotNode(p.from.e,p.from.s); if(d) d.classList.add('lifting'); }
  if(p.touch&&navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
  tourDragFrame(); tourDrag.raf=requestAnimationFrame(tourDragLoop);
}
function tourDragFrame(){
  const p=tourDrag.p; if(!p||!tourDrag.on) return;
  tourDrag.ghost.style.transform='translate('+(p.x-29)+'px,'+(p.y-29+(p.touch?-34:0))+'px) scale(1.08)';
  const t=tourDropTarget(p.x,p.y-(p.touch?34:0)); p.tgt=t;
  if(tourDrag.over&&(!t||tourDrag.over!==t.node)){ tourDrag.over.classList.remove('over'); tourDrag.over=null; }
  if(t&&t.node&&tourDrag.over!==t.node){ t.node.classList.add('over'); tourDrag.over=t.node; }
}
function tourDragLoop(){
  const p=tourDrag.p; if(!p||!tourDrag.on) return;
  const sc=document.getElementById('tourscroll'), dock=document.getElementById('tdock');
  const top=90, bot=window.innerHeight-(dock.hidden?0:dock.offsetHeight)-50, y=p.y;
  let v=0; if(y<top) v=-Math.min(18,(top-y)/4+2); else if(y>bot&&!tourOnDock(p.x,p.y)) v=Math.min(18,(y-bot)/4+2);
  if(v){ sc.scrollTop+=v; tourDragFrame(); }
  tourDrag.raf=requestAnimationFrame(tourDragLoop);
}
function tourPUp(ev){
  const p=tourDrag.p; if(!p||ev.pointerId!==p.pid) return;
  const was=tourDrag.on;
  if(was&&ev.type==='pointerup'){
    tourDragFrame(); const t=p.tgt;
    if(t){ if(tourAssign(t.e,t.s,p.id,p.from)) tourDisarm(); }
    else if(p.from&&tourOnDock(p.x,p.y)) tourClearSlot(p.from.e,p.from.s);
  }
  tourDragEnd(was&&p.moved);
}
function tourDragEnd(swallow){
  const p=tourDrag.p; if(!p) return;
  clearTimeout(p.t); cancelAnimationFrame(tourDrag.raf);
  document.removeEventListener('pointermove',tourPMove); document.removeEventListener('pointerup',tourPUp); document.removeEventListener('pointercancel',tourPUp);
  if(tourDrag.ghost) tourDrag.ghost.remove();
  if(tourDrag.over) tourDrag.over.classList.remove('over');
  tourListEl.querySelectorAll('.lifting').forEach(d=>d.classList.remove('lifting'));
  document.body.classList.remove('tour-dragging');
  tourDrag.p=null; tourDrag.on=false; tourDrag.ghost=null; tourDrag.over=null;
  if(swallow) tourDrag.swallow=performance.now()+350;
}
document.getElementById('tlibrow').addEventListener('pointerdown',ev=>{
  const b=ev.target.closest('.tlib-disc'); if(!b||(ev.pointerType==='mouse'&&ev.button!==0)) return; tourPress(ev,b.dataset.id,null,b);
});
tourListEl.addEventListener('pointerdown',ev=>{
  const m=ev.target.closest('.tslot.filled .tslot-main'); if(!m||(ev.pointerType==='mouse'&&ev.button!==0)) return;
  const d=m.closest('.tslot'), e=tourEntById(+d.dataset.e); if(!e) return;
  tourPress(ev,e.heroes[+d.dataset.s],{e:e.id,s:+d.dataset.s},m);
});
tourEl.addEventListener('contextmenu',ev=>{ if(ev.target.closest('.tlib-disc,.tslot-main')) ev.preventDefault(); });
document.addEventListener('touchmove',ev=>{ if(tourDrag.on&&ev.cancelable) ev.preventDefault(); },{passive:false});

/* ================= Étape 3 : moteur de bracket (élimination directe / double élimination) =================
   On ne stocke que `run` = {fmt,bo,team,mode,order:[id],games:{matchId:[{w:'a'|'b'}]},at:{matchId:[idA,idB]}}.
   La structure du bracket et tous les résultats sont recalculés à chaque affichage (tourResolve) : annuler une
   manche ou changer un résultat en amont reste cohérent. Un côté `null` = vide (bye, ou perdant d'un bye). */
let tourOpenMatchId=null, tourBackT=0, tourResetT=0, tourZ=1, tourZAuto=true;
function tourSeedOrder(P){ let a=[1]; while(a.length<P){ const n=a.length*2; a=a.flatMap(x=>[x,n+1-x]); } return a; }
function tourBuild(run){
  const ids=run.order, n=ids.length, P=tourNextPow2(Math.max(2,n)), R=Math.round(Math.log2(P)), dbl=run.fmt==='double';
  const M=[], by={};
  const add=(br,r,i)=>{ const id=br==='G'?'GF'+r:br+r+'-'+i; const m={id,br,r,i,a:undefined,b:undefined,w:undefined,l:undefined,auto:false,games:[],at:null,sa:0,sb:0,to:{w:null,l:null}}; M.push(m); by[id]=m; return m; };
  for(let r=1;r<=R;r++) for(let i=0;i<P/2**r;i++) add('W',r,i);
  const ord=tourSeedOrder(P);
  for(let i=0;i<P/2;i++){ const m=by['W1-'+i]; const x=ids[ord[2*i]-1], y=ids[ord[2*i+1]-1]; m.seed=[x===undefined?null:x,y===undefined?null:y]; }
  for(let r=1;r<R;r++) for(let i=0;i<P/2**r;i++) by['W'+r+'-'+i].to.w=['W'+(r+1)+'-'+(i>>1),i%2?'b':'a'];
  const sec={W:[],L:[],G:[]};
  for(let r=1;r<=R;r++) sec.W.push(M.filter(m=>m.br==='W'&&m.r===r));
  if(dbl){
    for(let k=1;k<=R-1;k++){ const c=P/2**(k+1); for(let j=0;j<2;j++) for(let i=0;i<c;i++) add('L',2*k-1+j,i); }
    if(R>=2) for(let i=0;i<P/2;i++) by['W1-'+i].to.l=['L1-'+(i>>1),i%2?'b':'a'];
    for(let k=1;k<=R-1;k++){
      const c=P/2**(k+1);
      for(let i=0;i<c;i++){
        by['L'+(2*k-1)+'-'+i].to.w=['L'+(2*k)+'-'+i,'a'];
        by['W'+(k+1)+'-'+i].to.l=['L'+(2*k)+'-'+(k%2===1?c-1-i:i),'b'];
        if(k<=R-2) by['L'+(2*k)+'-'+i].to.w=['L'+(2*k+1)+'-'+(i>>1),i%2?'b':'a'];
      }
    }
    for(let r=1;r<=2*R-2;r++) sec.L.push(M.filter(m=>m.br==='L'&&m.r===r));
    add('G',1,0); add('G',2,0);
    by['W'+R+'-0'].to.w=['GF1','a'];
    if(R>=2) by['L'+(2*R-2)+'-0'].to.w=['GF1','b']; else by['W1-0'].to.l=['GF1','b'];
    sec.G=[[by.GF1],[by.GF2]];
  }
  return {M,by,sec,P,R,dbl,n};
}
function tourResolve(run){
  const st=tourBuild(run), M=st.M, by=st.by, k=(run.bo+1)/2;
  M.forEach(m=>{ if(m.seed){ m.a=m.seed[0]; m.b=m.seed[1]; } m.games=(run.games[m.id]||[]).slice(); m.at=run.at[m.id]||null; });
  const put=(ref,val)=>{ if(ref) by[ref[0]][ref[1]]=val; };
  const route=m=>{
    if(m.id==='GF1'){ if(m.w!==null&&m.w===m.b){ by.GF2.a=m.a; by.GF2.b=m.b; } else { by.GF2.a=null; by.GF2.b=null; } return; }
    put(m.to.w,m.w); put(m.to.l,m.l);
  };
  let ch=true, guard=0;
  while(ch&&guard++<80){
    ch=false;
    for(const m of M){
      if(m.w!==undefined||m.a===undefined||m.b===undefined) continue;
      if(m.a===null||m.b===null){ m.auto=true; m.w=m.a===null?m.b:m.a; m.l=null; if(m.a===null&&m.b===null) m.w=null; }
      else{
        if(m.at&&(m.at[0]!==m.a||m.at[1]!==m.b)){ m.games=[]; m.at=null; delete run.games[m.id]; delete run.at[m.id]; }
        let A=0,B=0; for(const g of m.games){ if(!g.w) continue; if(A>=k||B>=k) break; if(g.w==='a') A++; else B++; }
        m.sa=A; m.sb=B;
        if(A>=k){ m.w=m.a; m.l=m.b; } else if(B>=k){ m.w=m.b; m.l=m.a; }
      }
      if(m.w!==undefined){ route(m); ch=true; }
    }
  }
  let champ;
  if(!st.dbl){ const f=by['W'+st.R+'-0']; champ=f.w; }
  else{ const g1=by.GF1, g2=by.GF2; if(g1.w!==undefined) champ=(g2.a===null&&g2.b===null)?g1.w:g2.w; }
  st.champ=(champ===null)?undefined:champ;
  return st;
}
function tourLabel(id){
  const i=tourS.entrants.findIndex(e=>e.id===id); if(i<0) return '?';
  const e=tourS.entrants[i], en=tourEN();
  return e.name||e.players.filter(Boolean).join(' & ')||((en?'Participant ':'Participant ')+(i+1));
}
function tourRoundLabel(st,m){
  const en=tourEN();
  if(m.br==='G') return m.r===1?(en?'Grand final':'Grande finale'):(en?'Grand final reset':'Grande finale : reset');
  if(m.br==='W'){
    const d=st.R-m.r;
    if(st.dbl&&d===0) return en?'Winners final':'Finale winners';
    if(d===0) return en?'Final':'Finale';
    if(d===1) return en?'Semifinals':'Demi-finales';
    if(d===2) return en?'Quarterfinals':'Quarts de finale';
    if(d===3) return en?'Round of 16':'Huitièmes de finale';
    return (en?'Round ':'Tour ')+m.r;
  }
  if(m.r===2*st.R-2) return en?'Losers final':'Finale losers';
  return (en?'Losers round ':'Losers ronde ')+m.r;
}
function tourPlateImg(h,cls){
  if(h.plate){ const im=document.createElement('img'); im.className=cls; im.src=h.plate; im.alt=trHeroName(h); im.title=trHeroName(h); im.draggable=false; return im; }
  return mk('span','ts-n mute',trHeroName(h));
}
function tourBanner(e,run,games,sd){
  const d=mk('span','ts-b'); if(!e) return d;
  const gl=(games||[]).filter(g=>g&&g.picks&&g.picks[sd]&&g.picks[sd].length);
  if(run.mode!=='none'&&gl.length){
    if(run.team>1){ d.classList.add('team'); gl[gl.length-1].picks[sd].forEach(id=>{ const h=tourHeroById(id); if(h) d.appendChild(tourPlateImg(h,'pl')); }); return d; }
    d.classList.add('pile');
    gl.forEach((g,k)=>{ const h=tourHeroById(g.picks[sd][0]); if(!h) return; const im=tourPlateImg(h,'pl '+(g.w?(g.w===sd?'won':(g.w==='t'?'':'lost')):'cur')); im.style.zIndex=String(k+1); d.appendChild(im); });
    return d;
  }
  const h0=run.mode!=='draft'?e.heroes:[];
  if(run.mode==='none'){
    if(run.team>1) d.classList.add('team');
    for(let i=0;i<run.team;i++){ const h=tourHeroById(h0[i]); if(h) d.appendChild(tourPlateImg(h,'pl')); }
  }else if(run.mode==='bring'){
    for(let i=0;i<tourRunBring(run)&&i<6;i++){ const h=tourHeroById(h0[i]); if(!h) continue; const im=document.createElement('img'); im.className='ic'; im.src=h.icon; im.alt=trHeroName(h); im.title=trHeroName(h); im.draggable=false; d.appendChild(im); }
  }
  return d;
}
function tourNameEl(id,run,mute,txt){
  const w=mk('span','ts-name'); const n=mk('span','ts-n'+(mute?' mute':''),txt!==undefined?txt:tourLabel(id)); w.appendChild(n);
  if(!mute&&run.team>1){ const e=tourEntById(id); const pl=e?e.players.filter(Boolean).join(' · '):''; if(pl&&pl!==n.textContent) w.appendChild(mk('small','ts-pl',pl)); }
  return w;
}
function tourSideEl(m,side,run){
  const id=m[side], decided=m.w!==undefined&&m.w!==null, en=tourEN();
  const el=mk('span','ts');
  if(id===null||id===undefined){
    el.appendChild(tourNameEl(id,run,true,id===null?'Bye':(en?'To be determined':'À déterminer'))); el.appendChild(mk('span','ts-b')); el.appendChild(mk('span','ts-sc')); return el;
  }
  el.appendChild(tourNameEl(id,run,false));
  el.appendChild(tourBanner(tourEntById(id),run,m.games,side));
  const sc=mk('span','ts-sc'); const v=side==='a'?m.sa:m.sb; if(!m.auto&&(decided||m.sa+m.sb>0)) sc.textContent=String(v); el.appendChild(sc);
  if(decided&&!m.auto){ if(m.w===id){ el.classList.add('win'); el.style.setProperty('--sd',(-Math.random()*4.6).toFixed(2)+'s'); } else el.classList.add('lose'); }
  else if(decided&&m.auto&&m.w===id) el.classList.add('walk');
  return el;
}
function tourMatchEl(m,run){
  const both=typeof m.a==='number'&&typeof m.b==='number';
  const void_=m.auto&&m.a===null&&m.b===null;
  const b=mk('button','tm'+(void_?' void':'')+(m.auto&&!void_?' auto':'')+(both&&m.w===undefined?' live':'')+(m.w!==undefined&&!m.auto?' done':'')+((m.a===undefined||m.b===undefined)?' wait':''));
  b.type='button'; b.dataset.m=m.id;
  b.appendChild(tourSideEl(m,'a',run)); b.appendChild(tourSideEl(m,'b',run));
  if(both) b.setAttribute('aria-label',tourLabel(m.a)+' – '+tourLabel(m.b)); else{ b.tabIndex=-1; b.setAttribute('aria-disabled','true'); }
  if(void_) b.setAttribute('aria-hidden','true');
  if(both) b.dataset.play='1';
  return b;
}
function tourRenderBracket(){
  const run=tourS.run; if(!run) return;
  if(run.fmt==='swiss'){ tourRenderSwiss(); return; }
  document.getElementById('tswbar').hidden=true; document.getElementById('tbrcanvas').classList.remove('swiss');
  const st=tourResolve(run), en=tourEN(), cv=document.getElementById('tbrcanvas');
  cv.textContent='';
  const node={};
  const mkSec=(rounds,title)=>{
    const box=mk('div','tsec'); if(title) box.appendChild(mk('h3','tsec-t',title));
    const cols=mk('div','tcols');
    rounds.forEach(ms=>{
      const col=mk('div','tcol'); col.appendChild(mk('div','tcol-h',tourRoundLabel(st,ms[0])));
      const body=mk('div','tcol-b'); ms.forEach(m=>{ const el=tourMatchEl(m,run); node[m.id]=el; body.appendChild(el); }); col.appendChild(body); cols.appendChild(col);
    });
    box.appendChild(cols); return box;
  };
  const left=mk('div','tstack');
  left.appendChild(mkSec(st.sec.W,st.dbl?(en?'Winners bracket':'Winners bracket'):''));
  if(st.dbl&&st.sec.L.length) left.appendChild(mkSec(st.sec.L,en?'Losers bracket':'Losers bracket'));
  cv.appendChild(left);
  if(st.dbl){
    const gf=mk('div','tgf'); st.sec.G.forEach(ms=>ms.forEach(m=>{ const w=mk('div','tgfc'); w.appendChild(mk('div','tcol-h',tourRoundLabel(st,m))); const el=tourMatchEl(m,run); node[m.id]=el; w.appendChild(el); if(m.auto&&m.a===null&&m.b===null) w.classList.add('void'); gf.appendChild(w); }));
    cv.appendChild(gf);
  }
  cv.style.gridTemplateColumns=st.dbl?'':'auto';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','tbr-lines'); svg.setAttribute('aria-hidden','true'); cv.appendChild(svg);
  tourBr={st,node,svg,cv};
  // en-tête
  const fm=run.fmt==='double'?(en?'Double elimination':'Double élimination'):(en?'Single elimination':'Élimination directe');
  const nn=run.order.length;
  document.getElementById('tbrtitle').textContent=en?'Tournament':'Tournoi';
  document.getElementById('tbrsub').textContent=fm+' · BO'+run.bo+' · '+nn+' '+(en?'participants':'participants')+(run.team>1?(en?' · teams of ':' · équipes de ')+run.team:'');
  const ch=document.getElementById('tchamp');
  if(st.champ!==undefined){
    ch.hidden=false; ch.textContent='';
    ch.appendChild(mk('small',null,en?'WINNER':'VAINQUEUR')); ch.appendChild(mk('b',null,tourLabel(st.champ)));
    const cb=mk('div','tcb'); const ent=tourEntById(st.champ);
    if(ent&&run.mode==='none') for(let i=0;i<run.team;i++){ const h=tourHeroById(ent.heroes[i]); if(h&&h.plate){ const im=document.createElement('img'); im.src=h.plate; im.alt=trHeroName(h); cb.appendChild(im); } }
    if(cb.childNodes.length) ch.appendChild(cb);
  }else ch.hidden=true;
  if(st.champ!==undefined){ const cbtn=mk('button','tchamp-btn',en?'Celebrate again':'Célébrer à nouveau'); cbtn.type='button'; cbtn.addEventListener('click',()=>tourCelebrate([st.champ])); ch.appendChild(cbtn); }
  tourChampCheck(st.champ!==undefined?[st.champ]:[]);
  tourApplyZoom(tourZAuto); requestAnimationFrame(tourDrawLines); tourBracketSparks();
}
let tourBr=null;
function tourApplyZoom(fit){
  const sc=document.getElementById('tbrscroll'), cv=document.getElementById('tbrcanvas'), zm=document.getElementById('tbrzoom');
  const w=cv.offsetWidth, h=cv.offsetHeight; if(!w||!h) return;
  if(fit){ const aw=sc.clientWidth-44, ah=sc.clientHeight-40; tourZ=Math.max(sc.clientWidth<700?.62:.4,Math.min(1,aw/w,ah/h)); }
  cv.style.transform='scale('+tourZ+')'; zm.style.width=Math.ceil(w*tourZ)+'px'; zm.style.height=Math.ceil(h*tourZ)+'px';
}
function tourDrawLines(){
  const b=tourBr; if(!b||!b.st||!tourIsOpen) return;
  const {st,node,svg,cv}=b, base=cv.getBoundingClientRect();
  svg.setAttribute('width',cv.offsetWidth); svg.setAttribute('height',cv.offsetHeight); svg.textContent='';
  const z=tourZ||1;
  const ns='http://www.w3.org/2000/svg';
  st.M.forEach(m=>{
    if(!m.to.w&&m.id!=='GF1') return;
    const targets=m.id==='GF1'?['GF2']:[m.to.w[0]];
    targets.forEach(tid=>{
      const s=node[m.id], t=node[tid]; if(!s||!t||s.classList.contains('void')||t.classList.contains('void')) return;
      const a=s.getBoundingClientRect(), c=t.getBoundingClientRect();
      const x1=(a.right-base.left)/z, y1=(a.top+a.height/2-base.top)/z, x2=(c.left-base.left)/z, y2=(c.top+c.height/2-base.top)/z;
      if(x2<=x1) return;
      const mid=x1+(x2-x1)/2, path=document.createElementNS(ns,'path');
      path.setAttribute('d','M'+x1+' '+y1+' H'+mid+' V'+y2+' H'+x2);
      if(m.w!==undefined&&m.w!==null&&!m.auto) path.setAttribute('class','done');
      svg.appendChild(path);
    });
  });
}
window.addEventListener('resize',()=>{ if(tourIsOpen&&tourS.phase==='run'&&tourBr){ tourApplyZoom(tourZAuto); requestAnimationFrame(tourDrawLines); } });
document.getElementById('tzoom').addEventListener('click',e=>{
  const b=e.target.closest('[data-z]'); if(!b) return; const d=+b.dataset.z;
  if(d===0){ tourZAuto=true; tourApplyZoom(true); }
  else{ tourZAuto=false; tourZ=Math.min(1.4,Math.max(.3,tourZ*(d>0?1.2:1/1.2))); tourApplyZoom(false); }
  requestAnimationFrame(tourDrawLines);
});


/* ----- paillettes : particules aléatoires (position, vitesse, durée, taille) qui dérivent dans la case du gagnant ----- */
const TS_SPR=(()=>{ const f=rgb=>{ const c=document.createElement('canvas'); c.width=c.height=48; const g=c.getContext('2d'), r=g.createRadialGradient(24,24,0,24,24,24);
  r.addColorStop(0,'rgba('+rgb+',1)'); r.addColorStop(.2,'rgba('+rgb+',.6)'); r.addColorStop(1,'rgba('+rgb+',0)'); g.fillStyle=r; g.fillRect(0,0,48,48); return c; };
  return [f('255,255,255'),f('222,234,255'),f('244,247,252')]; })();
function tourSparks(cv,clipFn,scaleFn){
  const ctx=cv.getContext('2d'); let em=[], raf=0, last=0, on=false;
  const R=(a,b)=>a+Math.random()*(b-a);
  function fit(){ const r=cv.getBoundingClientRect(), d=Math.min(window.devicePixelRatio||1,2), w=Math.max(1,Math.round(r.width*d)), h=Math.max(1,Math.round(r.height*d));
    if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; } return {r,d}; }
  function born(){ const star=Math.random()<.32;
    return {u:R(.04,.96),v:R(.08,.92),vx:R(-.12,.12),vy:R(-.12,.12),age:0,life:R(1.1,3.2),s:star?R(4,8.5):R(1.3,3),star,fr:R(6,17),ph:R(0,6.3),spr:TS_SPR[(Math.random()*3)|0]}; }
  function tick(t){
    raf=0; if(!on) return;
    const dt=Math.min(.05,Math.max(.001,(t-last)/1000||.016)); last=t;
    const {r:cr,d}=fit(); ctx.setTransform(d,0,0,d,0,0); ctx.clearRect(0,0,cr.width,cr.height);
    const clip=clipFn?clipFn():null, sc=scaleFn?scaleFn():1;
    for(const e of em){
      const er=e.el.getBoundingClientRect(); if(er.width<6||er.height<6) continue;
      if(clip&&(er.bottom<clip.top||er.top>clip.bottom||er.right<clip.left||er.left>clip.right)) continue;
      const hov=!!(e.tm&&e.tm.matches(':hover')), target=Math.round(e.n*(hov?2.4:1));
      if(e.p.length<target&&Math.random()<Math.min(1,(target-e.p.length)*dt*1.8)) e.p.push(born());
      for(let i=e.p.length-1;i>=0;i--){
        const p=e.p[i]; p.age+=dt; if(p.age>=p.life){ e.p.splice(i,1); continue; }
        p.vx=Math.max(-.24,Math.min(.24,p.vx+(Math.random()-.5)*1.1*dt)); p.vy=Math.max(-.24,Math.min(.24,p.vy+(Math.random()-.5)*1.1*dt));
        p.u+=p.vx*dt; p.v+=p.vy*dt;
        if(p.u<.02){ p.u=.02; p.vx=Math.abs(p.vx); } else if(p.u>.98){ p.u=.98; p.vx=-Math.abs(p.vx); }
        if(p.v<.04){ p.v=.04; p.vy=Math.abs(p.vy); } else if(p.v>.96){ p.v=.96; p.vy=-Math.abs(p.vy); }
        const x=er.left-cr.left+p.u*er.width, y=er.top-cr.top+p.v*er.height;
        if(clip&&(x+cr.left<clip.left||x+cr.left>clip.right||y+cr.top<clip.top||y+cr.top>clip.bottom)) continue;
        const a=Math.sin(Math.PI*p.age/p.life)*(.5+.5*Math.sin(p.age*p.fr+p.ph)); if(a<=.03) continue;
        const sz=p.s*sc; ctx.globalAlpha=Math.min(1,a*(p.star?1:.9));
        ctx.drawImage(p.spr,x-sz,y-sz,sz*2,sz*2);
        if(p.star){ ctx.fillStyle='#fff'; ctx.fillRect(x-sz*1.05,y-.5,sz*2.1,1); ctx.fillRect(x-.5,y-sz*1.05,1,sz*2.1); }
      }
    }
    ctx.globalAlpha=1; raf=requestAnimationFrame(tick);
  }
  return{
    set(list){ em=list.map(o=>({el:o.el,n:o.n,tm:o.tm||null,p:[]})); },
    start(){ if(on||still.matches||IDLE.off) return; on=true; last=performance.now(); raf=requestAnimationFrame(tick); },
    stop(){ on=false; if(raf) cancelAnimationFrame(raf); raf=0; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height); },
    running(){ return on; }
  };
}
let tourBrFx=null, tourPanelFx=null;
function tourBracketSparks(){
  const cv=document.getElementById('tbrfx'), sc=document.getElementById('tbrscroll');
  if(!tourBrFx) tourBrFx=tourSparks(cv,()=>sc.getBoundingClientRect(),()=>Math.max(.75,Math.min(1.15,tourZ*1.15)));
  if(tourS.phase!=='run'||!tourIsOpen){ tourBrFx.stop(); return; }
  tourBrFx.set([...document.getElementById('tbrcanvas').querySelectorAll('.ts.win, .tstd tr.champ')].map(el=>({el,n:el.tagName==='TR'?22:16,tm:el.closest('.tm')})));
  tourBrFx.start();
}
function tourPanelSparks(card){
  if(tourPanelFx){ tourPanelFx.stop(); tourPanelFx=null; }
  const cv=card.querySelector('canvas.tmp-fx'); if(!cv) return;
  tourPanelFx=tourSparks(cv,null,()=>1.45); tourPanelFx.set([{el:cv,n:70}]); tourPanelFx.start();
}
document.addEventListener('visibilitychange',()=>{ if(!tourBrFx) return; if(document.hidden) tourBrFx.stop(); else if(tourIsOpen&&tourS.phase==='run') tourBracketSparks(); });

/* ----- fenêtre d'un match ----- */
function tourSaveRun(){ tourSave(); tourRenderBracket(); if(tourOpenMatchId) tourFillMatch(); }
let tourPanelFresh=false;
function tourOpenMatch(id){ tourOpenMatchId=id; tourPanelFresh=true; document.getElementById('tmp').hidden=false; tourFillMatch(); const x=document.querySelector('#tmp .tmp-x'); if(x) x.focus({preventScroll:true}); }
function tourCloseMatch(){ if(tourPanelFx){ tourPanelFx.stop(); tourPanelFx=null; } if(!tourOpenMatchId) return; const id=tourOpenMatchId; tourOpenMatchId=null; document.getElementById('tmp').hidden=true; const n=tourBr&&tourBr.node[id]; if(n&&tourIsOpen) n.focus({preventScroll:true}); }
/* ================= Étape 5 : parties, jets de dés, bans, picks, historique =================
   Une « partie » = {bf,fp,d1,d2,bans:{a,b},picks:{a,b},w?}. bf = qui bannit en premier, fp = premier joueur, d1/d2 = jets de dés.
   Élimination : run.games[matchId] = [parties] (la dernière, sans `w`, est la manche en cours). Swiss : pr.g.
   Bring N, Ban M : chaque camp bannit M héros inscrits de l'adversaire, puis joue l'un des restants.
   Draft : M bans par camp dans la bibliothèque commune, puis picks alternés (1 par joueur). Miroir autorisé. */
function tourOth(s){ return s==='a'?'b':'a'; }
function tourGameNew(){ return {bf:null,fp:null,d1:null,d2:null,bans:{a:[],b:[]},picks:{a:[],b:[]}}; }
function tourCleanGame(x){
  x=x||{};
  const ok=id=>typeof id==='string'&&H.some(h=>h.id===id), sd=v=>(v==='a'||v==='b')?v:null;
  const arr=a=>(Array.isArray(a)?a:[]).filter(ok).slice(0,8);
  const die=d=>(Array.isArray(d)&&d.length===2&&d.every(n=>Number.isInteger(n)&&n>=1&&n<=6))?[d[0],d[1]]:null;
  const g={bf:sd(x.bf),fp:sd(x.fp),d1:die(x.d1),d2:die(x.d2),bans:{a:arr(x.bans&&x.bans.a),b:arr(x.bans&&x.bans.b)},picks:{a:arr(x.picks&&x.picks.a),b:arr(x.picks&&x.picks.b)}};
  if(x.w==='a'||x.w==='b'||x.w==='t') g.w=x.w;
  return g;
}
function tourRunBring(run){ return tourClamp(run.bring||tourS.cfg.bring,2,6); }
function tourRunBans(run){ return run.mode==='bring'?tourClamp(run.ban||tourS.cfg.ban,1,tourRunBring(run)-1):(run.mode==='draft'?tourClamp(run.dbans!=null?run.dbans:tourS.cfg.dbans,0,6):0); }
function tourRunPicks(run){ return run.mode==='draft'?run.team:(run.mode==='bring'?1:0); }
function tourSeq(first,n){ const a=[]; for(let i=0;i<n;i++){ a.push(first); a.push(tourOth(first)); } return a; }
function tourStageOf(run,g){
  const M=tourRunBans(run), P=tourRunPicks(run), mode=run.mode;
  const banSeq=(g.bf&&M>0)?tourSeq(g.bf,M):[], pickSeq=(g.fp&&P>0)?tourSeq(g.fp,P):[];
  const nb=g.bans.a.length+g.bans.b.length, np=g.picks.a.length+g.picks.b.length;
  let stage='result', actor=null;
  if(mode!=='none'){
    if(M>0&&!g.bf) stage='roll';
    else if(M>0&&nb<2*M){ stage='ban'; actor=banSeq[nb]; }
    else if(!g.fp) stage='roll';
    else if(np<2*P){ stage='pick'; actor=pickSeq[np]; }
  }
  return {stage,actor,M,P,nb,np,banSeq,pickSeq};
}
function tourAvail(run,g,ctx,kind,actor){
  const opp=tourOth(actor), regs=sd=>{ const e=tourEntById(ctx[sd]); return e?e.heroes.slice(0,tourRunBring(run)).filter(Boolean):[]; };
  if(run.mode==='bring'){
    if(kind==='ban') return regs(opp).filter(id=>!g.bans[actor].includes(id));
    return regs(actor).filter(id=>!g.bans[opp].includes(id));
  }
  const banned=new Set(g.bans.a.concat(g.bans.b)), all=H.map(h=>h.id).filter(id=>!banned.has(id));
  return kind==='ban'?all:all.filter(id=>!g.picks[actor].includes(id));
}
function tourEnsureGame(id){
  const run=tourS.run, arr=run.games[id]||(run.games[id]=[]);
  const last=arr[arr.length-1]; if(last&&!last.w) return last;
  const g=tourGameNew(); arr.push(g);
  const m=tourBr&&tourBr.st&&tourBr.st.by[id]; if(m&&typeof m.a==='number'&&typeof m.b==='number') run.at[id]=[m.a,m.b];
  tourSave(); return g;
}
function tourAct(kind,actor,id,g,ctx){
  const run=tourS.run; if(!tourAvail(run,g,ctx,kind,actor).includes(id)) return;
  g[kind==='ban'?'bans':'picks'][actor].push(id); tourSaveRun();
}
function tourUndoAct(g,run){
  const st=tourStageOf(run,g);
  if(st.np>0){ g.picks[st.pickSeq[st.np-1]].pop(); }
  else if(st.nb>0){ g.bans[st.banSeq[st.nb-1]].pop(); }
  else if(g.fp){ g.fp=null; g.d2=null; }
  else if(g.bf){ g.bf=null; g.d1=null; }
  tourSaveRun();
}

/* tuiles de bannières (bring) et icônes barrées (bans) */
function tourTile(h,state,clickable,fn){
  const b=mk(clickable?'button':'div','ttile'+(state?' '+state:'')+(clickable?' can':'')); if(clickable){ b.type='button'; b.addEventListener('click',fn); }
  if(h.plate){ const im=document.createElement('img'); im.src=h.plate; im.alt=trHeroName(h); im.draggable=false; b.appendChild(im); } else b.appendChild(mk('span','ttxt',trHeroName(h)));
  b.title=trHeroName(h); if(state==='ban') b.setAttribute('aria-label',trHeroName(h)+(tourEN()?' (banned)':' (banni)'));
  return b;
}
function tourBanIcon(h){ const s=mk('span','tbi'); const im=document.createElement('img'); im.src=h.icon; im.alt=trHeroName(h); im.draggable=false; s.appendChild(im); s.title=trHeroName(h)+(tourEN()?' (banned)':' (banni)'); return s; }
function tourSideBox(run,ctx,g,sd,st,resSide){
  const id=ctx[sd], en=tourEN(), opp=tourOth(sd), ent=tourEntById(id);
  const d=mk('div','tmp-side'+(resSide===sd?' win':(resSide&&resSide!=='t'?' lose':'')));
  if(resSide===sd){ const c=mk('canvas','tmp-fx'); c.setAttribute('aria-hidden','true'); d.appendChild(c); d.style.setProperty('--sd','-1s'); }
  d.appendChild(mk('b',null,tourLabel(id)));
  if(run.team>1){ const pl=ent?ent.players.filter(Boolean).join(' · '):''; if(pl&&pl!==tourLabel(id)) d.appendChild(mk('small',null,pl)); }
  if(run.mode==='none'){
    const cb=mk('div','tcb'); if(ent) for(let i=0;i<run.team;i++){ const h=tourHeroById(ent.heroes[i]); if(h&&h.plate){ const im=document.createElement('img'); im.src=h.plate; im.alt=trHeroName(h); cb.appendChild(im); } }
    d.appendChild(cb);
  }else if(run.mode==='bring'){
    const tiles=mk('div','ttiles'), regs=ent?ent.heroes.slice(0,tourRunBring(run)):[];
    regs.forEach(hid=>{
      const h=tourHeroById(hid); if(!h) return;
      const banned=!!g&&g.bans[opp].includes(hid), picked=!!g&&g.picks[sd].includes(hid); let can=false, fn=null;
      if(g&&st&&!resSide){
        if(st.stage==='ban'&&st.actor===opp&&!banned){ can=true; fn=()=>tourAct('ban',opp,hid,g,ctx); }
        if(st.stage==='pick'&&st.actor===sd&&!banned&&!picked){ can=true; fn=()=>tourAct('pick',sd,hid,g,ctx); }
      }
      tiles.appendChild(tourTile(h,banned?'ban':(picked?'chosen':((g&&st&&st.stage==='result'&&(g.picks.a.length||g.picks.b.length))?'rest':'')),can,fn));
    });
    d.appendChild(tiles);
  }else{
    const pk=g?g.picks[sd]:[], tiles=mk('div','ttiles');
    for(let i=0;i<run.team;i++){ const h=tourHeroById(pk[i]); tiles.appendChild(h?tourTile(h,'chosen',false):mk('div','ttile vac','pick')); }
    d.appendChild(tiles);
    if(g&&g.bans[sd].length){ const bl=mk('div','tbans'); bl.appendChild(mk('span','tbans-l','Bans')); g.bans[sd].forEach(hid=>{ const h=tourHeroById(hid); if(h) bl.appendChild(tourBanIcon(h)); }); d.appendChild(bl); }
  }
  return d;
}

/* dés */
const TOUR_PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function tourDieEl(n){ const d=mk('span','die'); for(let i=0;i<9;i++) d.appendChild(document.createElement('i')); tourDieSet(d,n); return d; }
function tourDieSet(d,n){ d.dataset.n=n||''; [...d.children].forEach((c,i)=>c.classList.toggle('on',!!n&&TOUR_PIPS[n].indexOf(i)>=0)); }
function tourRollDice(host,g,dk){
  const A=host.querySelector('.die.a'), B=host.querySelector('.die.b'), go=host.querySelector('.tdice-go'), note=host.querySelector('.tdice-note');
  if(go) go.disabled=true;
  const r6=()=>1+Math.floor(Math.random()*6);
  const attempt=()=>{
    if(note) note.textContent='';
    if(still.matches){ const x=r6(), y=r6(); return end(x,y); }
    A.classList.add('roll'); B.classList.add('roll'); let n=0;
    const t=setInterval(()=>{ tourDieSet(A,r6()); tourDieSet(B,r6()); if(++n<14) return; clearInterval(t); A.classList.remove('roll'); B.classList.remove('roll'); end(r6(),r6()); },70);
  };
  const end=(x,y)=>{
    tourDieSet(A,x); tourDieSet(B,y);
    if(x===y){ if(note) note.textContent=tourEN()?'Tie: rolling again…':'Égalité : on relance…'; setTimeout(attempt,650); return; }
    setTimeout(()=>{ g[dk]=[x,y]; tourSaveRun(); },still.matches?0:520);
  };
  attempt();
}
function tourRollBlock(run,ctx,g,kind){
  const en=tourEN(), dk=kind==='bf'?'d1':'d2', lab=sd=>tourLabel(ctx[sd]);
  const blk=mk('div','tdice'); blk.dataset.dk=dk;
  const optional=run.mode==='none';
  blk.appendChild(mk('h4',null,kind==='bf'?(en?'Roll 1 · first to ban':'Jet 1 · premier banneur'):(optional?(en?'First player (optional)':'Premier joueur (facultatif)'):(en?'Roll 2 · first player':'Jet 2 · premier joueur'))));
  const row=mk('div','tdice-row');
  const dice=g[dk];
  row.appendChild(mk('span','tdice-n',lab('a'))); row.appendChild(tourDieEl(dice?dice[0]:null)); row.lastChild.classList.add('a');
  row.appendChild(tourDieEl(dice?dice[1]:null)); row.lastChild.classList.add('b'); row.appendChild(mk('span','tdice-n r',lab('b')));
  blk.appendChild(row);
  const say=(sd)=> kind==='bf'?lab(sd)+(en?' bans first':' bannit en premier'):lab(sd)+(en?' is first player':' est premier joueur');
  const mkb=(txt,fn,cls)=>{ const b=mk('button','tmp-btn'+(cls?' '+cls:''),txt); b.type='button'; b.addEventListener('click',fn); return b; };
  const clear=()=>{ g[kind]=null; g[dk]=null; if(kind==='bf'){ g.bans={a:[],b:[]}; g.picks={a:[],b:[]}; } else g.picks={a:[],b:[]}; tourSaveRun(); };
  if(g[kind]){
    const st=mk('div','tdice-st'); st.appendChild(mk('b',null,say(g[kind]))); st.appendChild(mkb(en?'Change':'Modifier',clear,'sub tiny')); blk.appendChild(st);
  }else if(dice){
    const w=dice[0]>dice[1]?'a':'b', l=tourOth(w), acts=mk('div','tdice-acts');
    blk.appendChild(mk('p','tdice-note',lab(w)+(en?' wins the roll':' gagne le jet')+' ('+Math.max(dice[0],dice[1])+' – '+Math.min(dice[0],dice[1])+')'+(en?'. Choice:':'. Choix :')));
    if(kind==='bf'){ acts.appendChild(mkb(lab(w)+(en?' bans first':' bannit en premier'),()=>{ g.bf=w; tourSaveRun(); })); acts.appendChild(mkb(lab(w)+(en?' bans second':' bannit en second'),()=>{ g.bf=l; tourSaveRun(); })); }
    else{ acts.appendChild(mkb(lab(w)+(en?' is first player':' est premier joueur'),()=>{ g.fp=w; tourSaveRun(); })); acts.appendChild(mkb(lab(l)+(en?' is first player':' est premier joueur'),()=>{ g.fp=l; tourSaveRun(); })); }
    blk.appendChild(acts);
    blk.appendChild(mkb(en?'Roll again':'Relancer',()=>{ g[dk]=null; tourSaveRun(); },'sub tiny'));
  }else{
    const acts=mk('div','tdice-acts');
    const go=mkb(en?'Roll the dice':'Lancer les dés',()=>tourRollDice(blk,g,dk),'tdice-go'); acts.appendChild(go); blk.appendChild(acts);
    blk.appendChild(mk('p','tdice-note',''));
    const alt=mk('div','tdice-alt'); alt.appendChild(mk('span',null,en?'or set directly:':'ou choisir sans dés :'));
    ['a','b'].forEach(sd=>alt.appendChild(mkb(say(sd),()=>{ g[kind]=sd; g[dk]=null; tourSaveRun(); },'sub tiny')));
    blk.appendChild(alt);
  }
  return blk;
}

/* sélecteur de héros (draft) */
let tourPickSet='all';
function tourPickerEl(run,ctx,g,st){
  const en=tourEN(), box=mk('div','tpick'), avail=new Set(tourAvail(run,g,ctx,st.stage,st.actor));
  const chips=mk('div','tpick-sets'); ['all'].concat(SET_ORDER.filter(x=>H.some(h=>h.set===x))).forEach(k=>{
    const c=mk('button','chip',k==='all'?(en?'All':'Tous'):trSet(k)); c.type='button'; c.setAttribute('aria-pressed',String(k===tourPickSet)); c.addEventListener('click',()=>{ tourPickSet=k; tourFillMatch(); }); chips.appendChild(c); });
  box.appendChild(chips);
  const grid=mk('div','tpick-grid'), so=x=>{ const i=SET_ORDER.indexOf(x.set); return i<0?99:i; };
  const banned=new Set(g.bans.a.concat(g.bans.b));
  [...H].filter(h=>tourPickSet==='all'||h.set===tourPickSet).sort((a,b)=>so(a)-so(b)||trHeroName(a).localeCompare(trHeroName(b))).forEach(h=>{
    const ok=avail.has(h.id), b=mk('button','tpk'+(banned.has(h.id)?' banned':'')+(ok?'':' off')); b.type='button'; b.disabled=!ok; b.title=trHeroName(h);
    const d=mk('span','d'); const im=document.createElement('img'); im.src=h.icon; im.alt=''; im.draggable=false; d.appendChild(im); b.appendChild(d); b.appendChild(mk('span','nm',trHeroName(h)));
    b.addEventListener('click',()=>tourAct(st.stage,st.actor,h.id,g,ctx)); grid.appendChild(b);
  });
  box.appendChild(grid); return box;
}
function tourEditorEl(run,ctx,g,st){
  const en=tourEN(), box=mk('div','ted'), lab=sd=>tourLabel(ctx[sd]);
  if(run.mode!=='none'&&st.M>0) box.appendChild(tourRollBlock(run,ctx,g,'bf'));
  box.appendChild(tourRollBlock(run,ctx,g,'fp'));
  if(run.mode!=='none'){
    const pr=mk('p','tprompt'+(st.stage==='ban'||st.stage==='pick'?' act':''));
    const opp=st.actor?tourOth(st.actor):null;
    if(st.stage==='roll') pr.textContent=en?'Finish the dice rolls above.':"Termine d'abord les jets de dés ci-dessus.";
    else if(st.stage==='ban'){ const k=g.bans[st.actor].length+1;
      pr.textContent=run.mode==='bring'?(en?lab(st.actor)+' bans a hero of '+lab(opp)+' ('+k+'/'+st.M+'). Click a banner.':lab(st.actor)+' bannit un héros de '+lab(opp)+' ('+k+'/'+st.M+'). Clique sur une bannière.')
                                       :(en?lab(st.actor)+' bans a hero ('+k+'/'+st.M+').':lab(st.actor)+' bannit un héros ('+k+'/'+st.M+').'); }
    else if(st.stage==='pick'){ const k=g.picks[st.actor].length+1;
      pr.textContent=run.mode==='bring'?(en?lab(st.actor)+' picks a hero. Click a banner.':lab(st.actor)+' choisit son héros. Clique sur une bannière.')
                                       :(en?lab(st.actor)+' picks a hero ('+k+'/'+st.P+').':lab(st.actor)+' choisit un héros ('+k+'/'+st.P+').'); }
    else pr.textContent=en?'Draft complete.':'Draft terminé.';
    box.appendChild(pr);
    if(run.mode==='draft'&&(st.stage==='ban'||st.stage==='pick')) box.appendChild(tourPickerEl(run,ctx,g,st));
    const acts=mk('div','tmp-acts two');
    const u=mk('button','tmp-btn sub',en?'Undo last step':"Annuler la dernière étape"); u.type='button'; u.addEventListener('click',()=>tourUndoAct(g,run));
    const r=mk('button','tmp-btn sub',en?'Restart the draft':'Recommencer le draft'); r.type='button'; r.addEventListener('click',()=>{ Object.assign(g,tourGameNew()); tourSaveRun(); });
    if(g.bf||g.fp||st.nb||st.np){ acts.appendChild(u); acts.appendChild(r); box.appendChild(acts); }
  }
  return box;
}
function tourGameRow(run,ctx,g,i){
  const en=tourEN(), li=mk('li','tgh');
  const head=mk('div','tgh-h'); head.appendChild(mk('span',null,(en?'Game ':'Manche ')+(i+1))); head.appendChild(mk('span','w',g.w==='t'?(en?'Tie':'Égalité'):tourLabel(ctx[g.w]))); li.appendChild(head);
  if(run.mode!=='none'){
    const body=mk('div','tgh-b');
    ['a','b'].forEach(sd=>{
      const c=mk('div','tgh-c'+(g.w===sd?' win':'')); c.appendChild(mk('span','tgh-n',tourLabel(ctx[sd])));
      const pk=mk('span','tgh-p'); g.picks[sd].forEach(id=>{ const h=tourHeroById(id); if(h) pk.appendChild(h.plate?tourPlateImg(h,'pl'):mk('span','ts-n mute',trHeroName(h))); }); c.appendChild(pk);
      if(g.bans[sd].length){ const bn=mk('span','tgh-x'); bn.appendChild(mk('span','tbans-l','Bans')); g.bans[sd].forEach(id=>{ const h=tourHeroById(id); if(h) bn.appendChild(tourBanIcon(h)); }); c.appendChild(bn); }
      body.appendChild(c);
    });
    li.appendChild(body);
  }
  return li;
}
function tourFillMatch(){
  const run=tourS.run, box=document.getElementById('tmp'), en=tourEN(); if(!run||!tourBr){ tourCloseMatch(); return; }
  const sw=run.fmt==='swiss', id=tourOpenMatchId;
  let m, pr=null, title;
  if(sw){ m=tourBr.sw&&tourBr.sw.byId[id]; if(!m){ tourCloseMatch(); return; } pr=run.sw[m.k].pairs[m.i]; title=(en?'Round ':'Ronde ')+(m.k+1)+' · Table '+(m.i+1); }
  else{ m=tourBr.st&&tourBr.st.by[id]; if(!m||typeof m.a!=='number'||typeof m.b!=='number'){ tourCloseMatch(); return; } title=tourRoundLabel(tourBr.st,m); }
  const ctx={a:m.a,b:m.b}, decided=!sw&&m.w!==undefined;
  const cur=decided?null:(sw?(pr.g||(pr.g=tourGameNew())):tourEnsureGame(id));
  const decidedGames=sw?[]:m.games.filter(g=>g.w);
  const view=cur||decidedGames[decidedGames.length-1]||null;
  const resSide=sw?(pr.r||null):(m.w===undefined?null:(m.w===m.a?'a':'b'));
  const st=cur?tourStageOf(run,cur):null;
  const prevCard=box.querySelector('.tmp-card'), prevGrid=box.querySelector('.tpick-grid'), keepTop=(prevCard&&box.dataset.m===id)?prevCard.scrollTop:0, keepGrid=prevGrid?prevGrid.scrollTop:0;
  box.dataset.m=id; box.textContent='';
  const card=mk('div','tmp-card'+(tourPanelFresh?' in':'')); tourPanelFresh=false; card.setAttribute('role','dialog'); card.setAttribute('aria-modal','true'); card.setAttribute('aria-label',title);
  const x=mk('button','tmp-x','×'); x.type='button'; x.setAttribute('aria-label',en?'Close':'Fermer'); x.addEventListener('click',tourCloseMatch); card.appendChild(x);
  const t=mk('h3','tmp-t',title); if(!sw) t.appendChild(mk('small',null,'BO'+run.bo)); card.appendChild(t);
  const vs=mk('div','tmp-vs');
  vs.appendChild(tourSideBox(run,ctx,view,'a',st,resSide));
  vs.appendChild(mk('div','tmp-sc',sw?(pr.r?tourSwPts(pr.r,'a')+' – '+tourSwPts(pr.r,'b'):'– –'):(m.sa+' – '+m.sb)));
  vs.appendChild(tourSideBox(run,ctx,view,'b',st,resSide));
  card.appendChild(vs);
  if(decidedGames.length){ const ul=mk('ul','tmp-hist'); decidedGames.forEach((g,i)=>ul.appendChild(tourGameRow(run,ctx,g,i))); card.appendChild(ul); }
  if(cur) card.appendChild(tourEditorEl(run,ctx,cur,st));
  if(sw){
    card.appendChild(mk('h4','tmp-h4',en?'Result':'Résultat'));
    const res=mk('div','tmp-res');
    const btn=(val,label)=>{ const b=mk('button','tmp-btn',label); b.type='button'; b.setAttribute('aria-pressed',String(pr.r===val)); b.addEventListener('click',()=>{ pr.r=(pr.r===val)?null:val; tourSaveRun(); }); return b; };
    res.appendChild(btn('a',tourLabel(m.a)+(en?' wins':' gagne'))); res.appendChild(btn('t',en?'Tie':'Égalité')); res.appendChild(btn('b',tourLabel(m.b)+(en?' wins':' gagne')));
    card.appendChild(res);
    const hp=mk('div','tmp-hp');
    [['a','ha'],['b','hb']].forEach(([sd,key])=>{
      const lab=document.createElement('label'); lab.appendChild(mk('span',null,(en?'Health left: ':'Health restante : ')+tourLabel(m[sd])));
      const inp=document.createElement('input'); inp.type='number'; inp.min='0'; inp.max='999'; inp.inputMode='numeric'; inp.placeholder='0'; inp.value=pr[key]==null?'':String(pr[key]);
      inp.addEventListener('input',()=>{ const v=inp.value.trim(); pr[key]=v===''?null:Math.min(999,Math.max(0,Math.round(+v)||0)); tourSave(); tourRenderBracket(); });
      lab.appendChild(inp); hp.appendChild(lab);
    });
    card.appendChild(hp);
    card.appendChild(mk('p','tmp-hint',en?'Health left is optional: it only serves as the third tie-break.':'La Health restante est facultative : elle sert seulement au troisième départage.'));
  }else if(!decided){
    card.appendChild(mk('h4','tmp-h4',en?'Result':'Résultat'));
    const acts=mk('div','tmp-acts two'), n=decidedGames.length+1;
    ['a','b'].forEach(sd=>{ const b=mk('button','tmp-btn',(run.bo>1?(en?'Game ':'Manche ')+n+' : ':'')+tourLabel(m[sd])+(en?' wins':' gagne')); b.type='button'; b.addEventListener('click',()=>tourSetWinner(m.id,sd)); acts.appendChild(b); });
    card.appendChild(acts);
  }else card.appendChild(mk('p','tmp-done',(en?'Winner: ':'Vainqueur : ')+tourLabel(m.w)));
  if(!sw&&decidedGames.length){ const acts=mk('div','tmp-acts'); const b=mk('button','tmp-btn sub',en?'Undo last game':'Annuler la dernière manche'); b.type='button'; b.addEventListener('click',()=>tourUndoGame(m.id)); acts.appendChild(b); card.appendChild(acts); }
  box.appendChild(card);
  card.scrollTop=keepTop; const ng=card.querySelector('.tpick-grid'); if(ng) ng.scrollTop=keepGrid;
  tourPanelSparks(card);
}
function tourSetWinner(id,sd){
  const run=tourS.run, m=tourBr.st&&tourBr.st.by[id]; if(!run||!m||m.w!==undefined) return;
  const g=tourEnsureGame(id); g.w=sd; run.at[id]=[m.a,m.b]; tourSaveRun();
}
function tourUndoGame(id){
  const run=tourS.run, arr=run.games[id]; if(!run||!arr) return;
  for(let i=arr.length-1;i>=0;i--) if(arr[i].w){ arr.splice(i,1); break; }
  if(!arr.length){ delete run.games[id]; delete run.at[id]; }
  tourSaveRun();
}

document.getElementById('tbrcanvas').addEventListener('click',e=>{ const b=e.target.closest('.tm[data-play]'); if(b) tourOpenMatch(b.dataset.m); });
document.getElementById('tmp').addEventListener('click',e=>{ if(e.target.id==='tmp') tourCloseMatch(); });


/* ================= Étape 4 : Swiss =================
   run = {fmt:'swiss',rounds:N,order:[id],sw:[{pairs:[{a,b,r:null|'a'|'b'|'t',ha,hb}],bye:id|null}]}.
   Victoire 3 pts, égalité 1, défaite 0, bye = victoire. Départages dans l'ordre : victoires contre les joueurs à
   égalité de points, Median-Buchholz, différence de Health ; puis ordre d'inscription. Les appariements sont
   stockés (ronde 1 au hasard) ; la ronde suivante n'est générée que quand la précédente est terminée. */
function tourSwPts(r,side){ return r==='t'?1:(r===side?3:0); }
function tourSwState(run){
  const P=new Map(run.order.map((id,i)=>[id,{id,seed:i,pts:0,w:0,t:0,l:0,opps:[],beats:[],hd:0,bye:0,played:0,tb1:0,tb2:0,rank:0}]));
  const rounds=run.sw.map((rd,k)=>{
    const matches=rd.pairs.map((pr,i)=>({id:'S'+(k+1)+'-'+i,k,i,a:pr.a,b:pr.b,r:pr.r,ha:pr.ha,hb:pr.hb,g:pr.g||null}));
    return {k,matches,bye:rd.bye,done:matches.every(m=>m.r)};
  });
  rounds.forEach(rd=>{
    if(rd.bye!=null){ const p=P.get(rd.bye); if(p){ p.pts+=3; p.w++; p.bye++; } }
    rd.matches.forEach(m=>{
      if(!m.r) return; const A=P.get(m.a), B=P.get(m.b); if(!A||!B) return;
      A.pts+=tourSwPts(m.r,'a'); B.pts+=tourSwPts(m.r,'b'); A.played++; B.played++;
      if(m.r==='a'){ A.w++; B.l++; A.beats.push(m.b); } else if(m.r==='b'){ B.w++; A.l++; B.beats.push(m.a); } else { A.t++; B.t++; }
      A.opps.push(m.b); B.opps.push(m.a); A.hd+=(m.ha||0)-(m.hb||0); B.hd+=(m.hb||0)-(m.ha||0);
    });
  });
  const rows=[...P.values()];
  rows.forEach(p=>{
    p.tb1=p.beats.filter(q=>P.get(q).pts===p.pts).length;
    const sc=p.opps.map(q=>P.get(q).pts).sort((x,y)=>x-y);
    p.tb2=(sc.length>2?sc.slice(1,-1):sc).reduce((a,x)=>a+x,0);
  });
  rows.sort((x,y)=>y.pts-x.pts||y.tb1-x.tb1||y.tb2-x.tb2||y.hd-x.hd||x.seed-y.seed);
  rows.forEach((p,i)=>{ const q=rows[i-1]; p.rank=(q&&q.pts===p.pts&&q.tb1===p.tb1&&q.tb2===p.tb2&&q.hd===p.hd)?q.rank:i+1; });
  const all=rounds.length===run.rounds&&rounds.every(r=>r.done);
  const byId={}; rounds.forEach(rd=>rd.matches.forEach(m=>{ byId[m.id]=m; }));
  return {rows,rounds,byId,all,champ:all?rows.filter(p=>p.rank===1).map(p=>p.id):undefined};
}
function tourSwPair(run,st,first){
  const shuf=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  let pool=first?shuf(run.order):st.rows.map(r=>r.id), bye=null;
  const played=new Set(); run.sw.forEach(rd=>rd.pairs.forEach(p=>{ played.add(p.a+'|'+p.b); played.add(p.b+'|'+p.a); }));
  const had=new Set(run.sw.map(rd=>rd.bye).filter(x=>x!=null));
  if(pool.length%2){
    for(let i=pool.length-1;i>=0;i--) if(!had.has(pool[i])){ bye=pool[i]; break; }
    if(bye===null) bye=pool[pool.length-1];
    pool=pool.filter(x=>x!==bye);
  }
  let nodes=0;
  const solve=(list,strict)=>{
    if(!list.length) return []; if(++nodes>40000) return null;
    const p=list[0], rest=list.slice(1);
    const cand=strict?rest.filter(q=>!played.has(p+'|'+q)):rest.slice().sort((x,y)=>(played.has(p+'|'+x)?1:0)-(played.has(p+'|'+y)?1:0));
    for(const q of cand){ const sub=solve(rest.filter(x=>x!==q),strict); if(sub) return [[p,q]].concat(sub); }
    return null;
  };
  let pairs=solve(pool,true); if(!pairs){ nodes=0; pairs=solve(pool,false)||[]; }
  return {pairs:pairs.map(x=>({a:x[0],b:x[1],r:null,ha:null,hb:null,g:null})),bye};
}
function tourSwNewRound(run){ const st=tourSwState(run); run.sw.push(tourSwPair(run,st,run.sw.length===0)); }

function tourSwMatchEl(m,run){
  const done=!!m.r, b=mk('button','tm '+(done?'done':'live')); b.type='button'; b.dataset.m=m.id; b.dataset.play='1';
  ['a','b'].forEach(sd=>{
    const id=m[sd], el=mk('span','ts'); el.appendChild(tourNameEl(id,run,false)); el.appendChild(tourBanner(tourEntById(id),run,m.g?[Object.assign({},m.g,{w:m.r||undefined})]:[],sd));
    const sc=mk('span','ts-sc'); if(done) sc.textContent=String(tourSwPts(m.r,sd)); el.appendChild(sc);
    if(done){ if(m.r==='t') el.classList.add('tie'); else if(m.r===sd){ el.classList.add('win'); el.style.setProperty('--sd',(-Math.random()*4.6).toFixed(2)+'s'); } else el.classList.add('lose'); }
    b.appendChild(el);
  });
  b.setAttribute('aria-label',tourLabel(m.a)+' – '+tourLabel(m.b));
  return b;
}
function tourSwByeEl(id,run){
  const b=mk('div','tm auto'), en=tourEN(), el=mk('span','ts');
  el.appendChild(tourNameEl(id,run,false)); el.appendChild(tourBanner(tourEntById(id),run,null,'a')); el.appendChild(mk('span','ts-sc','3')); el.classList.add('walk'); b.appendChild(el);
  const e2=mk('span','ts'); e2.appendChild(tourNameEl(null,run,true,'Bye')); e2.appendChild(mk('span','ts-b')); e2.appendChild(mk('span','ts-sc')); b.appendChild(e2);
  return b;
}
function tourSwStandingsEl(st,run){
  const en=tourEN(), box=mk('div','tstd');
  box.appendChild(mk('h3',null,en?'Standings':'Classement'));
  const t=document.createElement('table'), th=document.createElement('thead'), hr=document.createElement('tr');
  const cols=[['#','',''],[en?'Participant':'Participant','nm',''],['Pts','',en?'Points: win 3, tie 1, loss 0':'Points : victoire 3, égalité 1, défaite 0'],
    [en?'W-T-L':'V-N-D','',en?'Wins - ties - losses':'Victoires - nuls - défaites'],
    [en?'vs tied':'vs égaux','',en?'Tie-break 1: wins against participants tied on points':"Départage 1 : victoires contre les participants à égalité de points"],
    ['M-Buch.','',en?'Tie-break 2: Median-Buchholz (opponents\' points, best and worst removed)':"Départage 2 : Median-Buchholz (points des adversaires, meilleur et pire retirés)"],
    ['Δ Health','',en?'Tie-break 3: Health difference':'Départage 3 : différence de Health']];
  cols.forEach(c=>{ const h=document.createElement('th'); h.textContent=c[0]; if(c[1]) h.className=c[1]; if(c[2]) h.title=c[2]; hr.appendChild(h); });
  th.appendChild(hr); t.appendChild(th);
  const tb=document.createElement('tbody');
  st.rows.forEach(p=>{
    const tr=document.createElement('tr'); if(p.rank===1) tr.className='top'+(st.all?' champ':'');
    const cell=(txt,cls)=>{ const td=document.createElement('td'); if(cls) td.className=cls; td.textContent=txt; tr.appendChild(td); return td; };
    cell(String(p.rank));
    const nm=document.createElement('td'); nm.className='nm'; const inn=mk('div','in'); inn.appendChild(mk('span','t',tourLabel(p.id)));
    const ent=tourEntById(p.id), h=(ent&&run.mode==='none')?tourHeroById(ent.heroes[0]):null;
    if(h&&h.plate){ const im=document.createElement('img'); im.src=h.plate; im.alt=trHeroName(h); im.draggable=false; inn.appendChild(im); }
    nm.appendChild(inn); tr.appendChild(nm);
    cell(String(p.pts),'pts'); cell(p.w+'-'+p.t+'-'+p.l); cell(String(p.tb1)); cell(String(p.tb2)); cell((p.hd>0?'+':'')+p.hd);
    tb.appendChild(tr);
  });
  t.appendChild(tb); box.appendChild(t);
  box.appendChild(mk('p','tstd-note',en?'Order: points, wins vs tied, Median-Buchholz, Health difference, then registration order.':"Ordre : points, victoires vs égaux, Median-Buchholz, différence de Health, puis ordre d'inscription."));
  return box;
}
function tourRenderSwiss(){
  const run=tourS.run, st=tourSwState(run), en=tourEN(), cv=document.getElementById('tbrcanvas');
  cv.textContent=''; cv.classList.add('swiss'); cv.style.gridTemplateColumns='auto auto';
  cv.appendChild(tourSwStandingsEl(st,run));
  const wrap=mk('div','tswr'), node={};
  st.rounds.forEach(rd=>{
    const col=mk('div','tcol'), dn=rd.matches.filter(m=>m.r).length;
    col.appendChild(mk('div','tcol-h',(en?'Round ':'Ronde ')+(rd.k+1)+' · '+dn+'/'+rd.matches.length));
    const body=mk('div','tcol-b');
    rd.matches.forEach(m=>{ const el=tourSwMatchEl(m,run); node[m.id]=el; body.appendChild(el); });
    if(rd.bye!=null) body.appendChild(tourSwByeEl(rd.bye,run));
    col.appendChild(body); wrap.appendChild(col);
  });
  const total=run.rounds, empty=total-st.rounds.length;
  for(let k=st.rounds.length;k<total;k++){ const col=mk('div','tcol'); col.appendChild(mk('div','tcol-h',(en?'Round ':'Ronde ')+(k+1))); const body=mk('div','tcol-b'); const ph=mk('div','tm wait'); ph.appendChild((()=>{ const s2=mk('span','ts'); s2.appendChild(tourNameEl(null,run,true,en?'Not paired yet':'Pas encore appariée')); s2.appendChild(mk('span','ts-b')); s2.appendChild(mk('span','ts-sc')); return s2; })()); body.appendChild(ph); col.appendChild(body); wrap.appendChild(col); }
  cv.appendChild(wrap);
  tourBr={sw:st,node,svg:null,cv};
  document.getElementById('tbrtitle').textContent=en?'Tournament':'Tournoi';
  document.getElementById('tbrsub').textContent='Swiss · '+run.rounds+' '+(en?'rounds':'rondes')+' · '+run.order.length+' '+(en?'participants':'participants');
  tourSwBar(st,run);
  const ch=document.getElementById('tchamp');
  if(st.champ&&st.champ.length){
    ch.hidden=false; ch.textContent='';
    ch.appendChild(mk('small',null,st.champ.length>1?(en?'JOINT WINNERS':'EX ÆQUO'):(en?'WINNER':'VAINQUEUR')));
    ch.appendChild(mk('b',null,st.champ.map(tourLabel).join(' & ')));
    const cb=mk('div','tcb');
    st.champ.forEach(id=>{ const ent=tourEntById(id); if(ent&&run.mode==='none'){ const h=tourHeroById(ent.heroes[0]); if(h&&h.plate){ const im=document.createElement('img'); im.src=h.plate; im.alt=trHeroName(h); cb.appendChild(im); } } });
    if(cb.childNodes.length) ch.appendChild(cb);
  }else ch.hidden=true;
  if(st.champ&&st.champ.length){ const cbtn=mk('button','tchamp-btn',en?'Celebrate again':'Célébrer à nouveau'); cbtn.type='button'; cbtn.addEventListener('click',()=>tourCelebrate(st.champ)); ch.appendChild(cbtn); }
  tourChampCheck(st.champ||[]);
  tourApplyZoom(tourZAuto); tourBracketSparks();
}
function tourSwBar(st,run){
  const bar=document.getElementById('tswbar'), en=tourEN(); bar.textContent=''; bar.hidden=false;
  const last=st.rounds[st.rounds.length-1], left=last.matches.filter(m=>!m.r).length;
  if(st.all){ bar.appendChild(mk('span',null,en?'Tournament finished.':'Tournoi terminé.')); }
  else if(!last.done){ bar.appendChild(mk('span',null,(en?'Round ':'Ronde ')+(last.k+1)+' / '+run.rounds+' · '+left+(en?(left===1?' result missing':' results missing'):(left===1?' résultat manquant':' résultats manquants')))); }
  else{
    const b=mk('button','tsw-btn main',(en?'Start round ':'Lancer la ronde ')+(last.k+2)); b.type='button';
    b.addEventListener('click',()=>{ tourSwNewRound(run); tourSave(); tourRenderBracket(); });
    bar.appendChild(b);
  }
  if(st.rounds.length>1){
    const c=mk('button','tsw-btn',(en?'Cancel round ':'Annuler la ronde ')+(last.k+1)); c.type='button';
    c.addEventListener('click',()=>{
      const has=last.matches.some(m=>m.r);
      if(has&&!c.classList.contains('armed')){ c.classList.add('armed'); c.textContent=en?'Erase results?':'Effacer les résultats ?'; setTimeout(()=>{ if(c.isConnected){ c.classList.remove('armed'); c.textContent=(en?'Cancel round ':'Annuler la ronde ')+(last.k+1); } },3200); return; }
      tourCloseMatch(); run.sw.pop(); tourSave(); tourRenderBracket();
    });
    bar.appendChild(c);
  }
}

/* ----- phases : configuration <-> bracket ----- */
function tourApplyPhase(){
  const run=tourS.phase==='run'&&tourS.run;
  tourEl.dataset.phase=run?'run':'setup';
  document.getElementById('tbr').hidden=!run;
  document.getElementById('tourback').hidden=!run; document.getElementById('tourreset').hidden=!run; document.getElementById('tourwipe').hidden=!!run;
  tourWipeBtn.classList.remove('armed');
  ['tourback','tourreset'].forEach(id=>{ const b=document.getElementById(id); b.classList.remove('armed'); b.textContent=UI('tour:'+(id==='tourback'?'back':'resetres'),id==='tourback'?'Modifier':'Remettre à zéro'); });
  clearTimeout(tourBackT); clearTimeout(tourResetT);
  tourSyncDock();
  if(run) tourRenderBracket(); else if(tourBrFx) tourBrFx.stop();
}
function tourLaunch(){
  const c=tourS.cfg, n=tourS.entrants.length; if(n<2) return;
  tourS.run={fmt:c.format,bo:c.format==='swiss'?1:c.bo,team:c.format==='swiss'?1:c.team,mode:c.mode,bring:c.bring,ban:c.ban,dbans:c.dbans,order:tourS.entrants.map(e=>e.id),games:{},at:{}};
  if(c.format==='swiss'){ tourS.run.rounds=c.rounds; tourS.run.sw=[]; tourSwNewRound(tourS.run); }
  tourS.phase='run'; tourZAuto=true; tourChampInit=false; tourSave(); tourApplyPhase();
  const sc=document.getElementById('tbrscroll'); sc.scrollTo(0,0);
}
function tourHasGames(){ const r=tourS.run; if(r&&r.fmt==='swiss') return r.sw.some(rd=>rd.pairs.some(p=>p.r)); return !!(r&&Object.keys(r.games).some(k=>r.games[k].some(g=>g.w))); }
function tourArmBtn(btn,timerKey,askKey,askFb,idleKey,idleFb,action){
  if(!btn.classList.contains('armed')&&tourHasGames()){
    btn.classList.add('armed'); btn.textContent=UI(askKey,askFb);
    const t=setTimeout(()=>{ btn.classList.remove('armed'); btn.textContent=UI(idleKey,idleFb); },3200);
    if(timerKey==='back') tourBackT=t; else tourResetT=t; return;
  }
  action();
}
document.getElementById('tgo').addEventListener('click',tourLaunch);
document.getElementById('tshuf').addEventListener('click',tourShuffle);
document.getElementById('tourback').addEventListener('click',()=>tourArmBtn(document.getElementById('tourback'),'back','tour:back:ask',tourEN()?'Erase results?':'Effacer les résultats ?','tour:back','Modifier',()=>{
  tourCloseMatch(); tourCloseVic(); tourS.run=null; tourS.phase='setup'; tourChampInit=false; tourSave(); tourApplyPhase(); tourRenderList(); }));
document.getElementById('tourreset').addEventListener('click',()=>tourArmBtn(document.getElementById('tourreset'),'reset','tour:resetres:ask',tourEN()?'Confirm?':'Confirmer ?','tour:resetres','Remettre à zéro',()=>{
  tourCloseMatch(); tourCloseVic(); tourChampInit=false; tourS.run.games={}; tourS.run.at={}; if(tourS.run.fmt==='swiss'){ tourS.run.sw=[]; tourSwNewRound(tourS.run); } tourSave(); tourApplyPhase(); }));

/* ================= Étape 6 : écran du vainqueur (feux d'artifice) et sauvegarde JSON ================= */
let tourChampKey='', tourChampInit=false, tourVicFx=null, tourVicSp=null;
function tourChampCheck(ids){
  const key=ids.join(',');
  if(!tourChampInit){ tourChampInit=true; tourChampKey=key; return; }
  if(key&&key!==tourChampKey){ tourChampKey=key; tourCelebrate(ids); } else tourChampKey=key;
}
function tourChampHeroes(id){
  const run=tourS.run, out=[]; if(!run) return out;
  const push=g=>g.forEach(x=>{ const h=tourHeroById(x); if(h) out.push(h); });
  if(run.mode==='none'){ const ent=tourEntById(id); if(ent) push(ent.heroes.slice(0,run.team)); return out; }
  if(run.fmt==='swiss'&&tourBr&&tourBr.sw){
    const rs=tourBr.sw.rounds;
    for(let k=rs.length-1;k>=0;k--){ const m=rs[k].matches.find(x=>x.a===id||x.b===id); if(m&&m.g){ push(m.g.picks[m.a===id?'a':'b']); if(out.length) return out; } }
    return out;
  }
  if(tourBr&&tourBr.st){
    const M=tourBr.st.M;
    for(let i=M.length-1;i>=0;i--){ const m=M[i]; if(m.a!==id&&m.b!==id) continue; const gs=m.games.filter(g=>g.w), g=gs[gs.length-1]; if(g){ push(g.picks[m.a===id?'a':'b']); if(out.length) return out; } }
  }
  return out;
}
function tourFireworks(cv){
  const ctx=cv.getContext('2d'); let rk=[], pt=[], raf=0, on=false, last=0, t=0, next=0, W=1, Hh=1, d=1, timers=[];
  const R=(a,b)=>a+Math.random()*(b-a), PAL=[0,18,42,55,120,160,190,215,265,300,330];
  function fit(){ const r=cv.getBoundingClientRect(); d=Math.min(window.devicePixelRatio||1,2); const w=Math.max(1,Math.round(r.width*d)), h=Math.max(1,Math.round(r.height*d)); if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; } W=r.width; Hh=r.height; }
  function launch(xr){ rk.push({x:(xr!=null?xr:R(.08,.92))*W,y:Hh+8,vx:R(-34,34),vy:-R(Hh*.75,Hh*1.05),ty:R(Hh*.13,Hh*.5),hue:PAL[(Math.random()*PAL.length)|0],tr:[]}); }
  function burst(x,y,hue){
    if(pt.length>1500) return;
    const sc=Math.max(.55,Math.min(1,W/900)), kind=(Math.random()*3)|0, n=Math.round(R(52,100)*sc), h2=(hue+R(30,170))%360, big=R(.85,1.3);
    for(let i=0;i<n;i++){
      const a=kind===0?Math.PI*2*i/n:Math.random()*Math.PI*2, sp=(kind===1?R(50,350):R(160,310))*big;
      pt.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,age:0,life:kind===2?R(1.6,2.6):R(1.0,1.9),h:Math.random()<.35?h2:hue,sz:R(1.3,3.1),tr:[],will:kind===2});
    }
  }
  function tick(ts){
    raf=0; if(!on) return;
    const dt=Math.min(.05,Math.max(.001,(ts-last)/1000||.016)); last=ts; t+=dt; fit();
    ctx.setTransform(d,0,0,d,0,0); ctx.clearRect(0,0,W,Hh); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
    const ff=Math.max(1,900/Math.max(W,1)*.8);
    if(t>=next){ launch(); if(t<6&&Math.random()<.55/ff) launch(); next=t+(t<6?R(.2,.48):R(.55,1.15))*ff; }
    for(let i=rk.length-1;i>=0;i--){
      const r=rk[i]; r.vy+=170*dt; r.x+=r.vx*dt; r.y+=r.vy*dt; r.tr.push([r.x,r.y]); if(r.tr.length>6) r.tr.shift();
      ctx.strokeStyle='hsla('+r.hue+',100%,68%,.75)'; ctx.lineWidth=2; ctx.beginPath(); r.tr.forEach((q,k)=>k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])); ctx.stroke();
      if(r.vy>-55||r.y<=r.ty){ burst(r.x,r.y,r.hue); rk.splice(i,1); }
    }
    const k=Math.pow(.22,dt);
    for(let i=pt.length-1;i>=0;i--){
      const p=pt[i]; p.age+=dt; if(p.age>=p.life){ pt.splice(i,1); continue; }
      p.vx*=k; p.vy=p.vy*k+(p.will?170:115)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.tr.push([p.x,p.y]); if(p.tr.length>6) p.tr.shift();
      const f=1-Math.pow(p.age/p.life,1.7), tw=.75+.25*Math.sin(p.age*38+p.x), hue=p.will?44:p.h;
      ctx.strokeStyle='hsla('+hue+',100%,'+(52+12*f)+'%,'+(f*.9*tw)+')'; ctx.lineWidth=p.sz; ctx.beginPath(); p.tr.forEach((q,j)=>j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])); ctx.stroke();
      ctx.fillStyle='hsla('+hue+',100%,82%,'+(f*tw)+')'; ctx.beginPath(); ctx.arc(p.x,p.y,p.sz*.75,0,6.283); ctx.fill();
    }
    ctx.globalCompositeOperation='source-over'; raf=requestAnimationFrame(tick);
  }
  return{
    start(){ if(on||still.matches||IDLE.off) return; on=true; rk=[]; pt=[]; t=0; next=.5; last=performance.now(); fit(); for(let i=0;i<5;i++) timers.push(setTimeout(()=>{ if(on) launch(.15+i*.175); },i*170)); raf=requestAnimationFrame(tick); },
    stop(){ on=false; timers.forEach(clearTimeout); timers=[]; if(raf) cancelAnimationFrame(raf); raf=0; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height); rk=[]; pt=[]; }
  };
}
function tourCelebrate(ids){
  if(!ids||!ids.length||!tourS.run) return;
  const run=tourS.run, en=tourEN(), box=document.getElementById('tvic');
  tourCloseMatch(); tourCloseSave();
  document.getElementById('tviclbl').textContent=ids.length>1?(en?'JOINT WINNERS':'EX ÆQUO'):(en?'WINNER':'VAINQUEUR');
  document.getElementById('tvicname').textContent=ids.map(tourLabel).join(' & ');
  const hb=document.getElementById('tvicheroes'); hb.textContent='';
  ids.forEach(id=>tourChampHeroes(id).forEach(h=>{ if(h.plate){ const im=document.createElement('img'); im.src=h.plate; im.alt=trHeroName(h); im.draggable=false; hb.appendChild(im); } }));
  const fm=run.fmt==='double'?(en?'Double elimination':'Double élimination'):(run.fmt==='swiss'?'Swiss':(en?'Single elimination':'Élimination directe'));
  let sub=fm+' · '+run.order.length+' participants';
  if(run.fmt==='swiss'&&tourBr&&tourBr.sw){ const row=tourBr.sw.rows.find(r=>r.id===ids[0]); if(row) sub+=' · '+row.pts+' pts'; }
  document.getElementById('tvicsub').textContent=sub;
  box.hidden=false;
  if(!tourVicFx) tourVicFx=tourFireworks(document.getElementById('tvicfw'));
  if(!tourVicSp) tourVicSp=tourSparks(document.getElementById('tvicsp'),null,()=>1.8);
  tourVicSp.set([{el:document.getElementById('tvicname'),n:90},{el:hb,n:24}]);
  tourVicFx.stop(); tourVicFx.start(); tourVicSp.stop(); tourVicSp.start();
  document.getElementById('tvicclose').focus({preventScroll:true});
}
function tourCloseVic(){
  const box=document.getElementById('tvic'); if(box.hidden) return; box.hidden=true;
  if(tourVicFx) tourVicFx.stop(); if(tourVicSp) tourVicSp.stop();
}
document.getElementById('tvicclose').addEventListener('click',tourCloseVic);

/* ----- sauvegarde : export / import JSON ----- */
function tourSaveMsg(txt,kind){ const m=document.getElementById('tsmsg'); m.textContent=txt; m.className='tsave-msg'+(kind?' '+kind:''); }
function tourExportJSON(){ return JSON.stringify({app:'dice-throne-tournoi',v:1,exportedAt:new Date().toISOString(),state:tourS},null,1); }
function tourOpenSave(){
  tourCloseMatch(); const box=document.getElementById('tsave');
  document.getElementById('tsout').value=tourExportJSON(); document.getElementById('tsin').value=''; tourSaveMsg('','');
  const b=document.getElementById('tsimp'); b.classList.remove('armed'); b.textContent=UI('tour:save:go','Importer');
  box.hidden=false; document.querySelector('#tsave .tmp-x').focus({preventScroll:true});
}
function tourCloseSave(){ const box=document.getElementById('tsave'); if(box.hidden) return; box.hidden=true; }
async function tourDownload(){
  const en=tourEN(), json=tourExportJSON(), name='tournoi-dice-throne-'+new Date().toISOString().slice(0,10)+'.json';
  try{
    const dl=(window.claude&&typeof claude.use==='function')?await claude.use('downloads'):null;
    if(dl){ await dl.save({filename:name,data:json}); tourSaveMsg(en?'File handed over for saving.':'Fichier transmis pour enregistrement.','ok'); return; }
  }catch(e){ if(e&&e.code==='declined'){ tourSaveMsg(en?'Download cancelled.':'Téléchargement annulé.',''); return; } }
  try{
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'})), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000); tourSaveMsg(en?'Download started.':'Téléchargement lancé.','ok');
  }catch(e){ tourSaveMsg(en?'Download is not available here: use “Copy the content”.':'Le téléchargement n’est pas disponible ici : utilise « Copier le contenu ».','err'); }
}
async function tourCopyJSON(){
  const en=tourEN(), ta=document.getElementById('tsout'); ta.value=tourExportJSON();
  try{ await navigator.clipboard.writeText(ta.value); tourSaveMsg(en?'Copied to the clipboard.':'Copié dans le presse-papier.','ok'); }
  catch(e){ ta.focus(); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e2){} tourSaveMsg(ok?(en?'Copied to the clipboard.':'Copié dans le presse-papier.'):(en?'Select the text above and copy it (Ctrl+C).':'Sélectionne le texte ci-dessus et copie-le (Ctrl+C).'),ok?'ok':''); }
}
function tourParseImport(txt){
  const en=tourEN(); let o;
  try{ o=JSON.parse(txt); }catch(e){ return {err:en?'This is not valid JSON.':"Ce contenu n'est pas du JSON valide."}; }
  const st=o&&typeof o==='object'?(o.state||o):null;
  if(!st||typeof st!=='object'||!Array.isArray(st.entrants)||!st.cfg||typeof st.cfg!=='object') return {err:en?'This file is not a tournament export.':"Ce fichier n'est pas une sauvegarde de tournoi."};
  const s=Object.assign(tourDefault(),{uid:st.uid,entrants:st.entrants,run:st.run||null,phase:st.phase});
  s.cfg=Object.assign(tourDefault().cfg,st.cfg); tourNorm(s);
  return {s};
}
function tourDoImport(){
  const en=tourEN(), txt=document.getElementById('tsin').value.trim(), btn=document.getElementById('tsimp');
  if(!txt){ tourSaveMsg(en?'Paste the JSON or choose a file first.':"Colle d'abord le JSON ou choisis un fichier.",'err'); return; }
  const r=tourParseImport(txt); if(r.err){ tourSaveMsg(r.err,'err'); return; }
  if((tourS.entrants.length||tourS.run)&&!btn.classList.contains('armed')){
    btn.classList.add('armed'); btn.textContent=en?'Replace the current tournament?':'Remplacer le tournoi actuel ?';
    setTimeout(()=>{ btn.classList.remove('armed'); btn.textContent=UI('tour:save:go','Importer'); },3600); return;
  }
  btn.classList.remove('armed'); btn.textContent=UI('tour:save:go','Importer');
  tourS=r.s; tourSave(); tourDisarm(); tourNameIn.value=''; tourChampInit=false; tourCloseMatch(); tourRefresh();
  document.getElementById('tsout').value=tourExportJSON();
  tourSaveMsg((en?'Tournament imported: ':'Tournoi importé : ')+tourS.entrants.length+' participants'+(tourS.run?(en?' (in progress)':' (en cours)'):'')+'.','ok');
}
document.querySelectorAll('.tsave-open').forEach(b=>b.addEventListener('click',tourOpenSave));
document.getElementById('tsavex').addEventListener('click',tourCloseSave);
document.getElementById('tsave').addEventListener('click',e=>{ if(e.target.id==='tsave') tourCloseSave(); });
document.getElementById('tsdl').addEventListener('click',tourDownload);
document.getElementById('tscopy').addEventListener('click',tourCopyJSON);
document.getElementById('tsimp').addEventListener('click',tourDoImport);
document.getElementById('tsout').addEventListener('focus',e=>e.target.select());
document.getElementById('tsfile').addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0]; if(!f) return; const en=tourEN();
  const rd=new FileReader(); rd.onload=()=>{ document.getElementById('tsin').value=String(rd.result||''); tourSaveMsg((en?'File loaded: ':'Fichier chargé : ')+f.name+(en?'. Click Import.':'. Clique sur Importer.'),'ok'); };
  rd.onerror=()=>tourSaveMsg(en?'This file could not be read.':'Impossible de lire ce fichier.','err'); rd.readAsText(f); e.target.value='';
});

applyStaticI18N(); tourBuildLib(); tourSyncCfg(); tourRenderList(); tourApplyPhase();

/* ---------- Icône CP : toute mention « CP » / « PC » du site devient l'icône (peu importe la langue) ----------
   Un MutationObserver traite tout texte inséré ou modifié (fiches, jetons, règles, boss, tournoi, succès,
   réponses de l'IA…). Les icônes se mettent à jour au changement de langue (cpRefresh). */
const CP_RE=/(^|[^\w])([+\-−–]?)(\d{1,3})[\s ]*(CP|PC)\b|\b(CP|PC)\b/g;
const CP_SKIP='script,style,textarea,input,select,option,noscript,.cpi,[contenteditable="true"],[data-nocp]';
function cpLab(){ return LANG==='fr'?'PC':'CP'; }
function cpMk(sign,num){
  const sp=document.createElement('span');
  const bare=num==null;
  sp.className='cpi '+(bare?'b':'v '+(sign?'s':'u')+' d'+Math.min(3,String(num).length));
  sp.setAttribute('role','img');
  const bg=document.createElement('span'); bg.className='bg'; sp.appendChild(bg);
  const tx=document.createElement('span'); tx.className='tx';
  if(!bare){
    const vl=document.createElement('span'); vl.className='vl';
    if(sign){ const sg=document.createElement('span'); sg.className='sg'; sg.textContent=sign; vl.appendChild(sg); }
    vl.appendChild(document.createTextNode(num)); tx.appendChild(vl);
    const gp=document.createElement('span'); gp.className='gp'; gp.textContent=' '; tx.appendChild(gp);
  }
  const lb=document.createElement('span'); lb.className='lb'; lb.textContent=cpLab(); tx.appendChild(lb);
  sp.appendChild(tx);
  sp.setAttribute('aria-label',(bare?'':(sign||'')+num+' ')+cpLab());
  return sp;
}
function cpText(nd){
  const v=nd.nodeValue; if(!v||v.indexOf('CP')<0&&v.indexOf('PC')<0) return;
  const p=nd.parentElement; if(!p||p.closest(CP_SKIP)) return;
  CP_RE.lastIndex=0; let m,last=0,frag=null;
  while((m=CP_RE.exec(v))){
    if(!frag) frag=document.createDocumentFragment();
    const lead=m[1]||'', st=m.index+lead.length;
    if(st>last) frag.appendChild(document.createTextNode(v.slice(last,st)));
    if(m[3]!=null){ let sg=m[2]||''; if(sg) sg=sg==='+'?'+':'-'; frag.appendChild(cpMk(sg,m[3])); }
    else frag.appendChild(cpMk('',null));
    last=m.index+m[0].length;
  }
  if(!frag) return;
  if(last<v.length) frag.appendChild(document.createTextNode(v.slice(last)));
  nd.parentNode.replaceChild(frag,nd);
}
function cpScan(root){
  if(!root) return;
  if(root.nodeType===3){ cpText(root); return; }
  if(root.nodeType!==1||root.closest(CP_SKIP)) return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null), L=[]; let n;
  while(n=w.nextNode()) L.push(n);
  L.forEach(cpText);
}
function cpRefresh(){
  document.documentElement.setAttribute('data-cpl',LANG==='fr'?'fr':'x');
  const lab=cpLab();
  document.querySelectorAll('.cpi').forEach(e=>{
    const lb=e.querySelector('.lb'); if(lb) lb.textContent=lab;
    const al=e.getAttribute('aria-label')||''; e.setAttribute('aria-label',al.replace(/\b(CP|PC)$/,lab));
  });
}
const cpObs=new MutationObserver(ms=>{
  const seen=new Set();
  ms.forEach(r=>{
    if(r.type==='characterData'){ seen.add(r.target); return; }
    r.addedNodes.forEach(n=>{ if(n.nodeType===1||n.nodeType===3) seen.add(n); });
  });
  seen.forEach(n=>{ if(n.isConnected!==false) cpScan(n); });
});
cpRefresh(); cpScan(document.body);
cpObs.observe(document.body,{childList:true,subtree:true,characterData:true});

/* ================= DTA Sheet : feuille de score de campagne interactive ================= */
const DTA_KEY='dtdb.dta.v1', DTA_N=20;
const DTA_DIFF={
  nice:{v:10,c:'#d6372e',im:'c_nice'}, normal:{v:20,c:'#2f8f3c',im:'c_normal'}, veteran:{v:30,c:'#2f6fd0',im:'c_veteran'},
  insane:{v:40,c:'#8a4fc8',im:'c_insane'}, hardcore:{v:50,c:'#e8871a',im:'c_hardcore'}
};
const DTA_ORDER=['nice','normal','veteran','insane','hardcore'];
const DTA_WITCH_SC=[2,4,6];
/* [franglais, français, anglais] */
const DTA_D={
  'exit':['← Quitter','← Quitter','← Quit'],
  'lib':['Héros','Bibliothèque de héros','Hero library'],
  'pdf':['PDF','PDF','PDF'], 'pdfe':['PDF éditable','PDF éditable','Editable PDF'],
  'save':['Sauvegarde','Sauvegarde','Save / load'], 'wipe':['Tout effacer','Tout effacer','Reset all'], 'wipe2':['Confirmer ?','Confirmer ?','Confirm?'],
  'title':['Campaign Scoring Sheet','Feuille de score de campagne','Campaign Scoring Sheet'],
  'team':["Nom d'équipe","Nom d'équipe",'Team name'], 'players':['Joueurs','Noms des joueurs','Player names'], 'heroes':['Héros choisis','Héros choisis','Chosen heroes'],
  'difflvl':['Difficulty Level','Niveau de difficulté','Difficulty level'],
  'scscore':['Scenario Score','Score de scénario','Scenario score'], 'scsub':['selon la carte Difficulty','selon la carte de difficulté','according to difficulty card'],
  'ph:team':['Nom de ton équipe','Nom de ton équipe','Your team name'], 'ph:player':['Joueur','Joueur','Player'], 'ph:hero':['Écris un héros…','Écris un héros…','Type a hero…'],
  'ph:diff':['Choisir…','Choisir…','Choose…'],
  'session':['SESSION','SESSION','SESSION'],
  'scen':['Scenario #','Scénario n°','Scenario #'],
  'start':['Starting Salves','Salves de départ','Starting Salves'],
  'start1':['Si victoire : Remaining Salves précédentes','Si victoire : salves restantes précédentes','If you won: previous remaining Salves'],
  'start2':['Si défaite : Starting Salves précédentes +3','Si défaite : salves de départ précédentes +3','If you lost: previous starting Salves +3'],
  'sess':['Session Score :','Score de session :','Session score:'],
  'rem':['Remaining Salves','Salves restantes','Remaining Salves'], 'rem2':['+1 par Salve non utilisée','+1 par Salve non utilisée','+1 for every unspent Salve'],
  'gold':['Unspent Gold','Or non dépensé','Unspent Gold'], 'gold2':['+1 par 5 Gold non dépensés','+1 par 5 Or non dépensés','+1 for every 5 gold unspent'],
  'loot':['Unclaimed Boss Loot','Butin de boss non réclamé','Unclaimed Boss Loot'], 'loot2':['+1 par Boss Loot non réclamé','+1 par butin de boss non réclamé','+1 for every unclaimed Boss Loot'],
  'tiles':['Explored all Tiles','Toutes les tuiles explorées','Explored all Tiles'], 'tiles2':['+5 si toutes les tuiles sont explorées','+5 si toutes les tuiles sont explorées','+5 if all tiles are explored'],
  'scs':['Scenario Score','Score de scénario','Scenario Score'], 'scs2':['Valeur indiquée en haut de la feuille','Valeur indiquée en haut de la feuille','Value shown at top of sheet'],
  'total':['Total Session Score','Score total de session','Total Session Score'],
  'tot1':['Victoire : total des cases vertes dans « WON », sinon vide.','Victoire : total des cases vertes dans « Gagné », sinon vide.','If you won: total of the green boxes in “Won”, else blank.'],
  'tot2':['Défaite : −10 dans « LOST », sinon vide.','Défaite : −10 dans « Perdu », sinon vide.','If you lost: “−10” in “Lost”, else blank.'],
  'won':['WON','GAGNÉ','WON'], 'lost':['LOST','PERDU','LOST'], 'or':['OR','OU','OR'],
  'camp':['Total Campaign Score','Score total de campagne','Total Campaign Score'],
  'camp2':['Après le Mad King : total de toutes les sessions','Après avoir vaincu le Mad King : total de toutes les sessions','After defeating the Mad King, write total of all session scores'],
  'keys':['Witch Keys','Clés de la Witch','Witch Keys'], 'keys2':['clés obtenues','clés obtenues','keys gained'],
  'keyhint':['Vault Witch dispo : elle peut remplacer le boss des scénarios 2, 4 et 6.','Vault Witch disponible : elle peut remplacer le boss des scénarios 2, 4 et 6.','Vault Witch available: she can replace the boss of scenarios 2, 4 and 6.'],
  'foot1':['Partage ton score et ton aventure, ou rejoins la communauté :','Partage ton score et ton aventure, ou rejoins la communauté :','Share your score and adventure on social media, or join our community:'],
  'foot2':['Envoie le score de ta campagne pour le comparer aux autres groupes :','Envoie le score de ta campagne pour le comparer aux autres groupes :','Submit your campaign score to compare it to other groups:'],
  'credit':['Inspirée de la feuille officielle « Campaign Scoring Sheet » de Dice Throne Adventures · © 2020 Dice Throne Inc. · usage personnel','Inspirée de la feuille officielle « Campaign Scoring Sheet » de Dice Throne Adventures · © 2020 Dice Throne Inc. · usage personnel','Inspired by the official Dice Throne Adventures Campaign Scoring Sheet · © 2020 Dice Throne Inc. · personal use'],
  'd:nice':['Nice Throne','Nice Throne','Nice Throne'], 'd:normal':['Normal','Normal','Normal'], 'd:veteran':['Veteran','Vétéran','Veteran'], 'd:insane':['Insane','Insane','Insane'], 'd:hardcore':['Hardcore','Hardcore','Hardcore'],
  'ddclr':['Aucune difficulté','Aucune difficulté','No difficulty'], 'ddhint':['Survole une carte pour l’agrandir, clique pour choisir.','Survole une carte pour l’agrandir, clique pour choisir.','Hover a card to enlarge it, click to choose.'],
  'witch':['Vault Witch','Vault Witch','Vault Witch'],
  'tip:scen1':['Scénario 1 : toujours le premier','Scénario 1 : toujours le premier','Scenario 1: always the first'],
  'tip:scenw':['Cliquer : Vault Witch à la place du boss','Cliquer : Vault Witch à la place du boss','Click: Vault Witch instead of the boss'],
  'tip:scenwb':['Cliquer : revenir au boss du scénario','Cliquer : revenir au boss du scénario','Click: back to the scenario boss'],
  'tip:scenauto':['Se remplit tout seul selon le résultat de la session précédente','Se remplit tout seul selon le résultat de la session précédente','Fills itself from the previous session’s result'],
  'tip:startauto':['Calculé selon le résultat de la session précédente','Calculé selon le résultat de la session précédente','Calculated from the previous session’s result'],
  'tip:num':['Saisis la valeur à la main','Saisis la valeur à la main','Type the value by hand'],
  'tip:tile':['Clique : +5 ON/OFF (une seule valeur possible)','Clique : +5 ON/OFF (une seule valeur possible)','Click: +5 ON/OFF (only one possible value)'],
  'tip:sc':['Clique : valeur de la difficulté ON/OFF','Clique : valeur de la difficulté ON/OFF','Click: difficulty value ON/OFF'],
  'tip:scnone':['Choisis d’abord la difficulté en haut à droite','Choisis d’abord la difficulté en haut à droite','Pick the difficulty first (top right)'],
  'tip:won':['Cliquer : victoire — calcule le total de la session','Cliquer : victoire — calcule le total de la session','Click: victory — computes the session total'],
  'tip:lost':['Cliquer : défaite (−10)','Cliquer : défaite (−10)','Click: defeat (−10)'],
  'tip:wait':['Cette session se débloque quand la précédente a un résultat','Cette session se débloque quand la précédente a un résultat','This session unlocks once the previous one has a result'],
  'tip:done':['Campagne terminée','Campagne terminée','Campaign complete'],
  'tip:over':['Game Over (Hardcore)','Game Over (Hardcore)','Game Over (Hardcore)'],
  'tip:kzoom':['Clique pour afficher la carte Witch Key en grand','Clique pour afficher la carte Witch Key en grand','Click to show the Witch Key card enlarged'],
  'tip:key':['Clique pour ajouter / retirer une clé','Clique pour ajouter / retirer une clé','Click to add / remove a key'],
  'tip:hx':['Retirer ce héros','Retirer ce héros','Remove this hero'],
  'tip:heroslot':['Écris un nom, ou choisis dans la bibliothèque de héros','Écris un nom, ou choisis dans la bibliothèque de héros','Type a name, or pick from the hero library'],
  'tip:sk1':['Nice Throne : tu peux rejouer ce scénario','Nice Throne : tu peux rejouer ce scénario','Nice Throne: you may retry this scenario'],
  'tip:sk2':['Nice Throne : marqué −10, on passe au scénario suivant','Nice Throne : marqué −10, on passe au scénario suivant','Nice Throne: marked −10, proceed to the next scenario'],
  'tip:camp':['Se remplit tout seul après la victoire du scénario 8','Se remplit tout seul après la victoire du scénario 8','Fills itself after winning scenario 8'],
  'tip:diff':['Choisir la difficulté','Choisir la difficulté','Choose the difficulty'],
  'tip:text':['Cliquer pour écrire','Cliquer pour écrire','Click to type'],
  'tip:link':['Ouvre le site officiel','Ouvre le site officiel','Opens the official site'],
  'lib:hint':['Clique ou glisse un héros vers un emplacement · glisse la barre pour défiler','Clique ou glisse un héros vers un emplacement · glisse la barre pour défiler','Click or drag a hero onto a slot · drag the bar to scroll'],
  'lib:full':['Les 4 emplacements sont pris : retire un héros d’abord.','Les 4 emplacements sont pris : retire un héros d’abord.','All 4 slots are taken: remove a hero first.'],
  'lib:all':['Tous','Tous','All'],
  'over':['Game Over','Game Over','Game Over'],
  'sv:title':['Sauvegarde de la feuille','Sauvegarde de la feuille','Save / load the sheet'],
  'sv:intro':['Exporte la feuille en fichier JSON (modifiable) pour la garder ou la partager, ou colle un export pour la recharger. La feuille est aussi enregistrée automatiquement dans ce navigateur.','Exporte la feuille en fichier JSON (modifiable) pour la garder ou la partager, ou colle un export pour la recharger. La feuille est aussi enregistrée automatiquement dans ce navigateur.','Export the sheet as a (editable) JSON file to keep or share it, or paste an export to reload it. The sheet is also saved automatically in this browser.'],
  'sv:dl':['Télécharger .json','Télécharger .json','Download .json'], 'sv:copy':['Copier','Copier','Copy'], 'sv:import':['Importer','Importer','Import'], 'sv:close':['Fermer','Fermer','Close'],
  'sv:paste':['Clique sur Importer pour choisir un fichier .json, ou colle un export ici…','Clique sur Importer pour choisir un fichier .json, ou colle un export ici…','Click Import to pick a .json file, or paste an export here…'],
  'sv:ok':['Fichier transmis pour enregistrement.','Fichier transmis pour enregistrement.','File handed over for saving.'],
  'sv:started':['Téléchargement lancé.','Téléchargement lancé.','Download started.'],
  'sv:cancel':['Téléchargement annulé.','Téléchargement annulé.','Download cancelled.'],
  'sv:unavail':['Téléchargement indisponible ici : utilise « Copier ».','Téléchargement indisponible ici : utilise « Copier ».','Download not available here: use “Copy”.'],
  'sv:copied':['Copié dans le presse-papier.','Copié dans le presse-papier.','Copied to the clipboard.'],
  'sv:copyfail':['Sélectionne le texte et copie-le (Ctrl+C).','Sélectionne le texte et copie-le (Ctrl+C).','Select the text and copy it (Ctrl+C).'],
  'sv:bad':['Ce contenu n’est pas une feuille DTA valide.','Ce contenu n’est pas une feuille DTA valide.','This is not a valid DTA sheet.'],
  'sv:imported':['Feuille importée.','Feuille importée.','Sheet imported.'],
  'ex:busy':['Génération du PDF…','Génération du PDF…','Generating the PDF…'],
  'ex:fail':['Impossible de générer le PDF ici (bibliothèque non chargée).','Impossible de générer le PDF ici (bibliothèque non chargée).','Could not generate the PDF here (library not loaded).']
};
function dtaT(k){ const a=DTA_D[k]; if(!a) return k; return LANG==='fr'?a[1]:(LANG==='en'?a[2]:a[0]); }
const dtaEl=document.getElementById('dta');
const dtaR={}; let dtaOpenF=false, dtaPrev='heroes', dtaBuilt=false, dtaTarget=-1, dtaLibSet='all', dtaC=null, dtaWipeT=0, dtaSaveOK=true;

/* ----- état ----- */
function dtaSess(){ return {r:null,w:0,k:0,rs:'',g:'',l:'',t:'',sc:0}; }
function dtaDefault(){ return {v:1,team:'',pl:['','','',''],he:[{id:null,t:''},{id:null,t:''},{id:null,t:''},{id:null,t:''}],diff:null,keys:0,s:Array.from({length:DTA_N},dtaSess)}; }
function dtaNorm(o){
  const d=dtaDefault(); if(!o||typeof o!=='object') return d;
  const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
  d.team=str(o.team,60);
  if(Array.isArray(o.pl)) for(let i=0;i<4;i++) d.pl[i]=str(o.pl[i],40);
  if(Array.isArray(o.he)) for(let i=0;i<4;i++){ const h=o.he[i]; if(h&&typeof h==='object'){ d.he[i]={id:(typeof h.id==='string'&&H.some(x=>x.id===h.id))?h.id:null,t:str(h.t,40)}; } }
  d.diff=DTA_DIFF[o.diff]?o.diff:null;
  d.keys=Math.max(0,Math.min(3,parseInt(o.keys,10)||0));
  if(Array.isArray(o.s)) for(let i=0;i<DTA_N;i++){
    const x=o.s[i]; if(!x||typeof x!=='object') continue; const t=d.s[i];
    t.r=x.r==='w'||x.r==='l'?x.r:null; t.w=x.w?1:0; t.k=x.k?1:0; t.sc=x.sc?1:0;
    ['rs','g','l'].forEach(f=>{ const n=parseInt(x[f],10); t[f]=isFinite(n)&&n>=0?String(Math.min(n,99)):''; });
    { const n=parseInt(x.t,10); t.t=isFinite(n)&&n>0?'5':''; }
  }
  return d;
}
function dtaLoad(){ try{ const r=localStorage.getItem(DTA_KEY); if(r) return dtaNorm(JSON.parse(r)); }catch(e){} return dtaDefault(); }
let dtaS=dtaLoad();
function dtaSave(){ try{ localStorage.setItem(DTA_KEY,JSON.stringify(dtaS)); dtaSaveOK=true; }catch(e){ dtaSaveOK=false; } }
const dnum=v=>{ const n=parseInt(v,10); return isFinite(n)&&n>0?Math.min(n,99):0; };

/* ----- calcul : enchaînement des sessions ----- */
function dtaCalc(){
  const S=dtaS, dv=S.diff?DTA_DIFF[S.diff].v:0, C={scen:[],start:[],act:[],tot:[],end:-1,over:-1,camp:null,run:0,wait:[]};
  let ended=false;
  for(let i=0;i<DTA_N;i++){
    let sc=null, st=null, act=false;
    if(!ended){
      if(i===0){ sc=1; st=2; act=true; }
      else{
        const p=S.s[i-1];
        if(p.r&&C.scen[i-1]!=null){
          const prev=C.scen[i-1], adv=p.r==='w'||(p.r==='l'&&p.k&&S.diff==='nice');
          sc=adv?prev+1:prev; st=p.r==='w'?dnum(p.rs):C.start[i-1]+3; act=true;
        }
      }
    }
    C.scen[i]=act?sc:null; C.start[i]=act?st:null; C.act[i]=act; C.tot[i]=null;
    if(act){
      const x=S.s[i];
      if(x.r==='w') C.tot[i]=dnum(x.rs)+dnum(x.g)+dnum(x.l)+dnum(x.t)+(x.sc?dv:0);
      else if(x.r==='l') C.tot[i]=-10;
      if(x.r==='w'&&sc===8){ C.end=i; ended=true; }
      else if(x.r==='l'&&S.diff==='hardcore'){ C.over=i; ended=true; }
      else if(x.r==='l'&&x.k&&S.diff==='nice'&&sc===8){ C.end=i; ended=true; }
    }
  }
  C.tot.forEach((t,i)=>{ if(t!=null&&C.act[i]) C.run+=t; });
  if(C.end>=0) C.camp=C.run;
  return C;
}

/* ----- construction du DOM ----- */
function dE(tag,cls,txt,attrs){
  const e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt;
  if(attrs) for(const k in attrs) e.setAttribute(k,attrs[k]); return e;
}
function dLab(cls,icon,tk,sk,extra){
  const d=dE('div','dl '+(cls||'')); if(icon){ const im=dE('img',icon.cls||'',null,{alt:'',draggable:'false'}); im.src=DTA_IMG[icon.k]; d.appendChild(im); }
  d.appendChild(dE('div','t',null,{'data-d':tk}));
  (sk||[]).forEach(k=>{ d.appendChild(dE('div','s'+(k[1]||''),null,{'data-d':k[0]})); });
  return d;
}
function dtaBuild(){
  if(dtaBuilt) return; dtaBuilt=true;
  const sh=dE('div','dsheet',null,{id:'dsheet'}); dtaR.sheet=sh;
  const bt=dE('div','bgt'); bt.style.backgroundImage='url('+DTA_IMG.bgtop+')'; const bb=dE('div','bgb'); bb.style.backgroundImage='url('+DTA_IMG.bgbot+')'; sh.append(bt,bb);
  const lg=dE('img','dlogo',null,{alt:'Dice Throne Adventures',draggable:'false'}); lg.src=DTA_IMG.logo; sh.appendChild(lg);
  sh.appendChild(dE('div','dtitle hd',null,{'data-d':'title'}));
  /* en-têtes */
  const hd=dE('div','dhead'); sh.appendChild(hd);
  const r1=dE('div','drow'); r1.style.position='relative'; hd.appendChild(r1);
  r1.appendChild(dE('div','dlab hd',null,{'data-d':'team'}));
  const tf=dE('div','dfield'); const ti=dE('input','dtx',null,{type:'text',maxlength:'60','data-k':'team','data-dph':'ph:team','data-dt':'tip:text',autocomplete:'off',spellcheck:'false'}); tf.appendChild(ti); r1.appendChild(tf); dtaR.team=ti;
  const l2=dE('div','dlab hd'); l2.style.flex='0 0 150px'; l2.appendChild(dE('span',null,null,{'data-d':'difflvl'})); r1.appendChild(l2);
  const df=dE('div','dfield diffbox ph',null,{role:'button',tabindex:'0','data-act':'dd','data-dt':'tip:diff','aria-haspopup':'true','aria-expanded':'false'}); df.style.flex='0 0 108px';
  const dv=dE('span','dv',null,{'data-val':''}); df.appendChild(dv); r1.appendChild(df); dtaR.diffBox=df; dtaR.diffV=dv;
  const l3=dE('div','dlab hd'); l3.style.flex='0 0 150px'; l3.style.padding='0 10px'; l3.style.flexDirection='column'; l3.style.alignItems='flex-end'; l3.style.justifyContent='center'; { const sp=dE('span',null,null,{'data-d':'scscore'}); sp.style.whiteSpace='nowrap'; sp.style.fontSize='15.5px'; l3.appendChild(sp); } l3.appendChild(dE('small',null,null,{'data-d':'scsub'})); r1.appendChild(l3);
  const sb=dE('div','dfield diffbox num ph',null,{role:'button',tabindex:'0','data-act':'dd','data-dt':'tip:diff','aria-haspopup':'true'}); sb.style.flex='0 0 52px'; const sv=dE('span','dv',null,{'data-val':''}); sb.appendChild(sv); r1.appendChild(sb); dtaR.scoreBox=sb; dtaR.scoreV=sv;
  /* menu déroulant des difficultés */
  const dd=dE('div','ddiff',null,{id:'ddiff',role:'listbox'}); const grid=dE('div','dgrid'); dd.appendChild(grid); dtaR.dd=dd; dtaR.ddi={};
  DTA_ORDER.forEach(k=>{
    const b=dE('button','ddi',null,{type:'button',role:'option','data-act':'pick','data-d2':k}); b.style.color=DTA_DIFF[k].c;
    const im=dE('img','cimg',null,{alt:'',draggable:'false'}); im.src=DTA_IMG[DTA_DIFF[k].im]; b.appendChild(im);
    b.appendChild(dE('b',null,null,{'data-d':'d:'+k})); b.appendChild(dE('i',null,String(DTA_DIFF[k].v)));
    grid.appendChild(b); dtaR.ddi[k]=b;
  });
  const clr=dE('button','dclr',null,{type:'button','data-act':'pick','data-d2':'','data-d':'ddclr'}); dd.appendChild(clr);
  { const pv=dE('div','ddprev',null,{'aria-hidden':'true'}); const pi=dE('img',null,null,{alt:'',draggable:'false'}); pv.appendChild(pi); dtaEl.appendChild(pv); dtaR.pv=pv; dtaR.pvi=pi;
    const hide=()=>pv.classList.remove('on');
    grid.addEventListener('pointerover',e=>{ if(e.pointerType==='touch'||e.pointerType==='pen') return; const b=e.target.closest('.ddi'); if(!b||!grid.contains(b)){ hide(); return; } const k=b.dataset.d2; pi.src=DTA_IMG[DTA_DIFF[k].im]; pv.classList.add('on'); });
    grid.addEventListener('pointerleave',hide); }
  dd.appendChild(dE('p','dhint',null,{'data-d':'ddhint'}));
  r1.appendChild(dd);
  /* joueurs */
  const r2=dE('div','drow'); hd.appendChild(r2); r2.appendChild(dE('div','dlab hd',null,{'data-d':'players'}));
  const pl=dE('div','dpl'); r2.appendChild(pl); dtaR.pl=[];
  for(let i=0;i<4;i++){ const f=dE('div','dfield'); const inp=dE('input','dtx',null,{type:'text',maxlength:'40','data-k':'pl','data-i':String(i),'data-dph':'ph:player','data-dt':'tip:text',autocomplete:'off',spellcheck:'false'}); f.appendChild(inp); pl.appendChild(f); dtaR.pl.push(inp); }
  /* héros */
  const r3=dE('div','drow'); hd.appendChild(r3); r3.appendChild(dE('div','dlab hd',null,{'data-d':'heroes'}));
  const hp=dE('div','dpl'); r3.appendChild(hp); dtaR.hs=[];
  for(let i=0;i<4;i++){
    const f=dE('div','dfield dhs',null,{'data-i':String(i)});
    const inp=dE('input','dtx htxt',null,{type:'text',maxlength:'40','data-k':'he','data-i':String(i),'data-dph':'ph:hero','data-dt':'tip:heroslot',autocomplete:'off',spellcheck:'false',role:'combobox','aria-autocomplete':'list'});
    const pw=dE('div','hplate',null,{'data-act':'hslot','data-i':String(i)}); pw.hidden=true; pw.appendChild(dE('img',null,null,{alt:'',draggable:'false'}));
    const x=dE('button','hx','×',{type:'button','data-act':'hclear','data-i':String(i),'data-dt':'tip:hx'}); pw.appendChild(x);
    const sg=dE('div','hsug',null,{role:'listbox'}); sg.hidden=true;
    f.append(inp,pw,sg); hp.appendChild(f); dtaR.hs.push({f,inp,pw,img:pw.firstChild,sg,sel:-1,list:[]});
  }
  /* tableau */
  const tb=dE('div','dtab'); sh.appendChild(tb);
  const put=(el,r,c)=>{ el.style.gridRow=String(r); el.style.gridColumn=String(c); tb.appendChild(el); return el; };
  put(dE('div'),1,1);
  put(dLab('',{k:'star',cls:'star'},'scen',[]),2,1);
  put(dLab('',{k:'salve'},'start',[['start1'],['start2',' r']]),3,1);
  const bandl=put(dLab('band',null,'sess',[]),4,1);
  put(dLab('',{k:'salve'},'rem',[['rem2']]),5,1);
  put(dLab('',{k:'gold'},'gold',[['gold2']]),6,1);
  put(dLab('',{k:'chest'},'loot',[['loot2']]),7,1);
  put(dLab('',{k:'tile',cls:'tile'},'tiles',[['tiles2']]),8,1);
  put(dLab('',null,'scs',[['scs2']]),9,1);
  put(dLab('tot',null,'total',[['tot1'],['tot2',' r']]),10,1);
  dtaR.cols=[];
  for(let i=0;i<DTA_N;i++){
    const c=i+2, K={};
    K.ss=put(dE('div','dss'),1,c); K.ssT=dE('span',null,null); K.ss.appendChild(K.ssT);
    K.sk=dE('button','sk',null,{type:'button','data-act':'sk','data-i':String(i)}); K.sk.hidden=true; K.ss.appendChild(K.sk);
    K.scen=put(dE('button','dc off',null,{type:'button',tabindex:'-1','data-act':'scen','data-i':String(i)}),2,c);
    K.scenV=dE('span','v',null,{'data-val':''}); K.scen.appendChild(K.scenV);
    K.st=put(dE('div','dc off'),3,c); K.stV=dE('span','v',null,{'data-val':''}); K.st.appendChild(K.stV);
    K.band=put(dE('div','dband'),4,c);
    if(i<DTA_N-1){ K.band.innerHTML='<svg viewBox="0 0 52 46" aria-hidden="true"><path d="M6 42 L36 10" fill="none" stroke-linecap="round"/><path d="M27 7 L45 3 L40 21 Z" stroke-linejoin="round"/></svg>'; }
    K.g={};
    ['rs','g','l','t','sc'].forEach((f,j)=>{
      const g=put(dE('div','dgc'+(f==='sc'?' sc last':(f==='t'?' tl':''))),5+j,c); K.g[f]={w:g};
      if(f==='sc'||f==='t'){ const b=dE('button','dn',null,{type:'button','data-act':f==='sc'?'sc':'tile','data-i':String(i)}); g.appendChild(b); K.g[f].b=b; K.g[f].v=b; b.setAttribute('data-val',''); }
      else{ const inp=dE('input','dn',null,{type:'text',inputmode:'numeric',maxlength:'2','data-f':f,'data-i':String(i),autocomplete:'off',autocapitalize:'off'}); g.appendChild(inp); K.g[f].inp=inp; }
      g.appendChild(dE('span','tip',null,{'data-tipk':f==='sc'?'tip:sc':(f==='t'?'tip:tile':'tip:num')}));
    });
    K.tot=put(dE('div','dtot'),10,c);
    const inn=dE('div','in'); K.tot.appendChild(inn);
    K.bw=dE('button','bw',null,{type:'button','data-act':'won','data-i':String(i),'data-dt':'tip:won'});
    K.bl=dE('button','bl',null,{type:'button','data-act':'lost','data-i':String(i),'data-dt':'tip:lost'});
    K.hw=dE('div','hl w'); K.hl=dE('div','hl l');
    K.vw=dE('div','vw',null,{'data-val':''}); K.vl=dE('div','vl',null,{'data-val':''});
    K.tot.append(K.bw,K.bl,K.hw,K.hl,K.vw,K.vl,dE('div','lbw',null,{'data-d':'won'}),dE('div','lbl',null,{'data-d':'lost'}),dE('div','or',null,{'data-d':'or'}));
    dtaR.cols.push(K);
  }
  /* superposition game over */
  dtaR.over=dE('div','dover'); dtaR.over.appendChild(dE('span',null,null,{'data-d':'over'})); sh.appendChild(dtaR.over);
  /* clés */
  const ky=dE('div','dkeys'); sh.appendChild(ky);
  const kl=dE('div','dklab'); kl.appendChild(dE('div','t',null,{'data-d':'keys'})); kl.appendChild(dE('div','s',null,{'data-d':'keys2'}));
  const cp=dE('img','cardprev',null,{alt:'',draggable:'false'}); cp.src=DTA_IMG.c_wkcard; kl.appendChild(cp); ky.appendChild(kl);
  kl.setAttribute('role','button'); kl.tabIndex=0; kl.setAttribute('data-act','kzoom'); kl.setAttribute('data-dt','tip:kzoom');
  const kz=dE('div','dkz',null,{id:'dkz','aria-hidden':'true'}); const kzi=dE('img',null,null,{alt:'Witch Key',draggable:'false'}); kzi.src=DTA_IMG.c_wkbig; kz.appendChild(kzi); dtaEl.appendChild(kz); dtaR.kz=kz;
  kz.addEventListener('click',e=>{ if(e.target.tagName!=='IMG') dtaKZoom(false); });
  dtaR.keys=[];
  for(let n=1;n<=3;n++){
    const b=dE('button','dkey',null,{type:'button','data-act':'key','data-n':String(n),'data-dt':'tip:key'});
    const a=dE('img','unl',null,{alt:'',draggable:'false'}); a.src=DTA_IMG.keyoff; const bI=dE('img','lit',null,{alt:'',draggable:'false'}); bI.src=DTA_IMG.key; b.append(a,bI); ky.appendChild(b); dtaR.keys.push(b);
  }
  dtaR.cnt=dE('span','cnt',null,{'data-val':''}); ky.appendChild(dtaR.cnt);
  dtaR.vwh=dE('span','vwh',null,{'data-d':'keyhint'}); ky.appendChild(dtaR.vwh);
  /* total de campagne */
  const cl=dLab('dcampl',null,'camp',[['camp2']]); sh.appendChild(cl);
  const cw=dE('div','dcampw'); const hr=dE('img','horn',null,{alt:'',draggable:'false'}); hr.src=DTA_IMG.horn; cw.appendChild(hr);
  dtaR.camp=dE('div','bx',null,{'data-val':'','data-dt':'tip:camp'}); cw.appendChild(dtaR.camp); sh.appendChild(cw);
  const br=dE('div','dbrk'); br.appendChild(dE('i',null,'=')); sh.appendChild(br);
  /* pied */
  const ft=dE('div','dfoot'); sh.appendChild(ft);
  [['foot1','community.dicethrone.com'],['foot2','myscore.dicethrone.com']].forEach(a=>{
    const l=dE('a',null,null,{href:'https://'+a[1],target:'_blank',rel:'noopener noreferrer','data-dt':'tip:link'});
    l.appendChild(dE('small',null,null,{'data-d':a[0]})); const b=dE('b'); b.appendChild(dE('span',null,'HTTP://')); b.appendChild(document.createTextNode(a[1].toUpperCase())); l.appendChild(b); ft.appendChild(l);
  });
  sh.appendChild(dE('div','dcredit',null,{'data-d':'credit'}));
  const fit=document.getElementById('dtafit'); fit.appendChild(sh); dtaR.fit=fit;
  dtaBuildDock();
  dtaBindEvents();
}

/* ----- bibliothèque de héros ----- */
function dtaBuildDock(){
  const row=document.getElementById('ddrow'), sets=document.getElementById('ddsets'); row.textContent=''; sets.textContent='';
  const ss=['all'].concat([...new Set(H.map(h=>h.set))]);
  ss.forEach(k=>{ const c=dE('button','dchip',k==='all'?dtaT('lib:all'):trSet(k),{type:'button','data-act':'dset','data-s':k}); c.setAttribute('aria-pressed',String(k===dtaLibSet)); sets.appendChild(c); });
  H.forEach(h=>{
    const li=dE('li'); const b=dE('button','hb',null,{type:'button','data-act':'dhero','data-id':h.id,title:trHeroName(h)}); b.dataset.set=h.set;
    const im=dE('img',null,null,{alt:'',draggable:'false'}); im.src=h.icon; b.appendChild(im); b.appendChild(dE('span',null,trHeroName(h))); li.appendChild(b); row.appendChild(li);
  });
  document.getElementById('ddhint').textContent=dtaT('lib:hint');
  dtaDockSync();
}
function dtaDockSync(){
  const sel=new Set(dtaS.he.map(h=>h.id).filter(Boolean));
  document.querySelectorAll('#ddrow .hb').forEach(b=>{ b.classList.toggle('sel',sel.has(b.dataset.id)); b.parentNode.hidden=!(dtaLibSet==='all'||b.dataset.set===dtaLibSet); });
  document.querySelectorAll('#ddsets .dchip').forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.s===dtaLibSet)));
}
const dNorm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function dtaSuggest(q,i){
  const nq=dNorm(q), used=new Set(dtaS.he.map((h,j)=>j===i?null:h.id).filter(Boolean));
  const res=H.filter(h=>!used.has(h.id)&&(!nq||dNorm(trHeroName(h)).includes(nq)||dNorm(h.name).includes(nq)||dNorm(h.id).includes(nq)));
  res.sort((a,b)=>{ const sa=dNorm(trHeroName(a)).startsWith(nq)||dNorm(a.name).startsWith(nq)?0:1, sb=dNorm(trHeroName(b)).startsWith(nq)||dNorm(b.name).startsWith(nq)?0:1; return sa-sb; });
  return res.slice(0,8);
}
function dtaShowSug(i){
  const S=dtaR.hs[i], q=S.inp.value; if(!q.trim()){ S.sg.hidden=true; S.list=[]; return; }
  S.list=dtaSuggest(q,i); S.sel=S.list.length?0:-1; S.sg.textContent='';
  S.list.forEach((h,k)=>{ const b=dE('button',k===0?'on':'',null,{type:'button','data-act':'sugpick','data-i':String(i),'data-id':h.id,tabindex:'-1'}); const im=dE('img',null,null,{alt:'',draggable:'false'}); im.src=h.icon; b.appendChild(im); b.appendChild(dE('span',null,trHeroName(h))); S.sg.appendChild(b); });
  S.sg.hidden=!S.list.length;
}
function dtaPick(i,id){
  dtaS.he[i]={id,t:''}; dtaR.hs[i].sg.hidden=true; dtaTarget=-1; dtaSave(); dtaRender();
}
function dtaClear(i){ dtaS.he[i]={id:null,t:''}; dtaSave(); dtaRender(); }
function dtaDockClick(id){
  const at=dtaS.he.findIndex(h=>h.id===id);
  if(at>=0){ dtaClear(at); return; }
  let t=(dtaTarget>=0&&!dtaS.he[dtaTarget].id)?dtaTarget:dtaS.he.findIndex(h=>!h.id);
  if(t<0){ dtaR.hs.forEach(s=>{ s.f.classList.remove('flash'); void s.f.offsetWidth; s.f.classList.add('flash'); }); document.getElementById('ddhint').textContent=dtaT('lib:full'); setTimeout(()=>{ document.getElementById('ddhint').textContent=dtaT('lib:hint'); },2600); return; }
  dtaPick(t,id);
}

/* ----- rendu ----- */
function dtaSetText(el,val){
  const s=String(val); if(el.textContent===s) return false; el.textContent=s; return true;
}
function dtaPop(el){ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function dtaTint(hex,a){ const n=parseInt(hex.slice(1),16), r=n>>16&255, g=n>>8&255, b=n&255; const m=x=>Math.round(x*(1-a)+255*a); return 'rgb('+m(r)+','+m(g)+','+m(b)+')'; }
function dtaFmt(n){ return n<0?'−'+Math.abs(n):String(n); }
function dtaRender(){
  const S=dtaS, C=dtaC=dtaCalc(), dd=S.diff?DTA_DIFF[S.diff]:null;
  if(dtaR.team.value!==S.team&&document.activeElement!==dtaR.team) dtaR.team.value=S.team;
  dtaR.pl.forEach((inp,i)=>{ if(document.activeElement!==inp&&inp.value!==S.pl[i]) inp.value=S.pl[i]; });
  /* difficulté */
  const nm=S.diff?dtaT('d:'+S.diff):'';
  [[dtaR.diffBox,dtaR.diffV,nm,dtaT('ph:diff')],[dtaR.scoreBox,dtaR.scoreV,dd?String(dd.v):'','']].forEach(a=>{
    const b=a[0]; b.classList.toggle('ph',!dd); b.classList.toggle('on',!!dd);
    b.style.color=dd?dd.c:''; b.style.borderColor=dd?dd.c:''; b.style.background=dd?dtaTint(dd.c,.9):'';
    a[1].textContent=dd?a[2]:a[3];
    if(a[1]===dtaR.diffV) a[1].style.fontSize=dd&&a[2].length>8?'14px':'';
  });
  DTA_ORDER.forEach(k=>dtaR.ddi[k].classList.toggle('sel',k===S.diff));
  /* héros */
  dtaR.hs.forEach((s,i)=>{
    const h=S.he[i], hero=h.id?H.find(x=>x.id===h.id):null;
    s.pw.hidden=!hero; s.inp.hidden=!!hero;
    if(hero){ if(s.img.dataset.id!==hero.id){ s.img.dataset.id=hero.id; if(hero.plate){ s.img.src=hero.plate; s.img.style.display=''; } else { s.img.removeAttribute('src'); s.img.style.display='none'; } }
      if(hero.plate) dtaPlateDark(s,hero.plate,hero.dk); else { s.pw.dataset.lsrc=''; s.f.classList.remove('dk'); } s.img.alt=trHeroName(hero); s.pw.title=trHeroName(hero); let tt=s.pw.querySelector('.hn'); if(!hero.plate){ if(!tt){ tt=dE('span','hn'); s.pw.insertBefore(tt,s.pw.firstChild); } tt.textContent=trHeroName(hero); tt.style.cssText='font:700 17px/1 "Barlow Condensed",sans-serif;color:#0a3a44;'; } else if(tt) tt.remove(); }
    else{ s.img.dataset.id=''; s.pw.dataset.lsrc=''; s.f.classList.remove('dk'); if(document.activeElement!==s.inp&&s.inp.value!==h.t) s.inp.value=h.t; }
    s.f.classList.toggle('target',dtaTarget===i);
  });
  dtaDockSync();
  /* sessions */
  const kc=S.keys, canW=kc>=1;
  for(let i=0;i<DTA_N;i++){
    const K=dtaR.cols[i], x=S.s[i], act=C.act[i], sc=C.scen[i];
    /* tab */
    K.ssT.textContent=dtaT('session')+' '+(i+1);
    K.ss.className='dss'+(!act?' idle':(C.end===i?' done':(x.r==='w'?' won':(x.r==='l'?' lost':' cur'))));
    K.ss.title=!act?dtaT('tip:wait'):(C.end===i?dtaT('tip:done'):(C.over===i?dtaT('tip:over'):''));
    const nsk=act&&x.r==='l'&&S.diff==='nice'; K.sk.hidden=!nsk;
    if(nsk){ K.sk.textContent=x.k?'→':'↻'; K.sk.classList.toggle('go',!!x.k); K.sk.title=x.k?dtaT('tip:sk2'):dtaT('tip:sk1'); }
    /* scénario */
    const wcap=act&&i>0&&DTA_WITCH_SC.includes(sc), wit=wcap&&x.w;
    K.scen.className='dc'+(act?'':' off')+(i===0&&act?' fix':'')+(wcap?' wcap':'')+(wit?' witch':'')+(wcap&&!wit&&canW?' canw':'');
    K.scen.setAttribute('aria-disabled',String(!wcap)); K.scen.tabIndex=wcap?0:-1;
    K.scen.title=!act?dtaT('tip:wait'):(wcap?(wit?dtaT('tip:scenwb'):dtaT('tip:scenw')):(i===0?dtaT('tip:scen1'):dtaT('tip:scenauto')));
    K.scen.querySelectorAll('.wi,.wn,.wtag').forEach(e=>e.remove());
    if(wit){
      const wb=HB.find(b=>b.id==='vault-witch'); const im=dE('img','wi',null,{alt:'Vault Witch',draggable:'false'}); if(wb) im.src=wb.icon; K.scen.insertBefore(im,K.scenV);
      const wn=dE('span','wn',String(sc),{'data-val':''}); K.scen.appendChild(wn); K.scenV.textContent=''; K.scenV.hidden=true;
    }else{ K.scenV.hidden=false; if(dtaSetText(K.scenV,act?sc:'')&&act) dtaPop(K.scenV); }
    if(wcap) K.scen.appendChild(dE('span','wtag',dtaT('witch')));
    /* salves de départ */
    K.st.className='dc'+(act?'':' off')+(i===0&&act?' fix':'');
    if(dtaSetText(K.stV,act?C.start[i]:'')&&act) dtaPop(K.stV);
    K.st.title=act?(i===0?'':dtaT('tip:startauto')):dtaT('tip:wait');
    /* flèche : la valeur de la ligne passe à la session suivante */
    if(i<DTA_N-1){ const nx=C.act[i+1]; K.band.classList.toggle('flow',!!(nx&&x.r==='w')); K.band.classList.toggle('flowl',!!(nx&&x.r==='l')); }
    /* cases vertes */
    ['rs','g','l'].forEach(f=>{
      const g=K.g[f]; g.w.classList.toggle('dis',!act); g.inp.disabled=!act;
      if(document.activeElement!==g.inp&&g.inp.value!==x[f]) g.inp.value=x[f];
      g.inp.title=act?'':dtaT('tip:wait');
    });
    { const tg=K.g.t, ton=act&&x.t==='5'; tg.w.classList.toggle('dis',!act); tg.w.classList.toggle('on',!!ton); tg.b.disabled=!act;
      if(dtaSetText(tg.b,ton?'5':'')&&ton) dtaPop(tg.b); tg.b.title=act?'':dtaT('tip:wait'); }
    const sg=K.g.sc, on=act&&x.sc&&dd;
    sg.w.classList.toggle('dis',!act); sg.b.disabled=!act;
    sg.w.classList.toggle('on',!!on);
    sg.w.style.borderColor=on?dd.c:''; sg.w.style.background=on?dtaTint(dd.c,.8):'';
    sg.b.style.color=on?dd.c:'';
    if(dtaSetText(sg.b,on?dd.v:'')&&on) dtaPop(sg.b);
    sg.b.title=act?(dd?'':dtaT('tip:scnone')):dtaT('tip:wait');
    sg.w.querySelector('.tip').textContent=dd?dtaT('tip:sc'):dtaT('tip:scnone');
    ['rs','g','l','t'].forEach(f=>{ K.g[f].w.querySelector('.tip').textContent=dtaT(f==='t'?'tip:tile':'tip:num'); });
    /* total de session */
    K.tot.classList.toggle('dis',!act); K.tot.dataset.r=x.r||''; K.bw.disabled=!act; K.bl.disabled=!act;
    const tw=act&&x.r==='w'?String(C.tot[i]):'', tl=act&&x.r==='l'?'−10':'';
    if(dtaSetText(K.vw,tw)&&tw){ K.vw.classList.remove('n'); void K.vw.offsetWidth; K.vw.classList.add('n'); }
    if(dtaSetText(K.vl,tl)&&tl){ K.vl.classList.remove('n'); void K.vl.offsetWidth; K.vl.classList.add('n'); }
    K.hw.classList.toggle('a',act&&x.r==='w'); K.hl.classList.toggle('a',act&&x.r==='l');
  }
  /* clés */
  dtaR.keys.forEach((b,j)=>{ b.classList.toggle('on',j<kc); b.setAttribute('aria-pressed',String(j<kc)); });
  dtaR.cnt.textContent=kc+'/3'; dtaR.vwh.classList.toggle('on',canW);
  /* total de campagne */
  const cm=C.camp; dtaR.camp.textContent=cm==null?'':dtaFmt(cm); dtaR.camp.classList.toggle('done',cm!=null); dtaR.camp.classList.toggle('neg',cm!=null&&cm<0);
  dtaR.camp.title=cm==null?dtaT('tip:camp')+' ('+dtaFmt(C.run)+')':dtaT('tip:done');
  dtaR.over.classList.toggle('on',C.over>=0);
  dtaText();
}
function dtaText(){
  dtaEl.querySelectorAll('[data-d]').forEach(e=>{ const t=dtaT(e.getAttribute('data-d')); if(e.textContent!==t) e.textContent=t; });
  dtaEl.querySelectorAll('[data-dph]').forEach(e=>{ e.placeholder=dtaT(e.getAttribute('data-dph')); });
  dtaEl.querySelectorAll('[data-dt]').forEach(e=>{ const t=dtaT(e.getAttribute('data-dt')); e.title=t; e.setAttribute('aria-label',t); });
  dtaEl.querySelectorAll('.dtot').forEach(e=>{});
  if(dtaR.pl) dtaR.hs.forEach(s=>{ s.inp.title=dtaT('tip:heroslot'); });
  const wipe=document.getElementById('dtawipe'); if(wipe&&!wipe.classList.contains('armed')) wipe.textContent=dtaT('wipe');
  dtaEl.querySelectorAll('.ddi[data-d2]').forEach(b=>{ b.title=dtaT('d:'+b.dataset.d2); });
}
function dtaRefresh(){ if(!dtaBuilt) return; const b=(id,k)=>{ const e=document.getElementById(id); if(e) e.textContent=dtaT(k); }; b('dtaexit','exit'); b('dtalib','lib'); b('dtapdf','pdf'); b('dtapdfe','pdfe'); b('dtasave','save'); dtaBuildDock(); dtaRender(); dtaSaveText(); }

/* ----- événements ----- */
function dtaKZoom(on){ if(!dtaR.kz) return; dtaR.kz.classList.toggle('on',on); dtaR.kz.setAttribute('aria-hidden',String(!on)); }
const dtaLumC={};
function dtaPlateDark(sl,src,pre){
  const ap=()=>{ if(sl.pw.dataset.lsrc!==src) return; sl.f.classList.toggle('dk',dtaLumC[src]>0.575); };
  sl.pw.dataset.lsrc=src;
  if(pre===0||pre===1){ dtaLumC[src]=pre?1:0; ap(); return; }
  if(dtaLumC[src]!==undefined){ ap(); return; }
  const im=new Image(); im.onload=()=>{ try{ const c=document.createElement('canvas'); c.width=32; c.height=16; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(im,0,0,32,16); const d=x.getImageData(0,0,32,16).data; let a=0,w=0; for(let i=0;i<d.length;i+=4){ const al=d[i+3]/255; if(al<.05) continue; a+=al*(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255; w+=al; } dtaLumC[src]=w?a/w:0; }catch(e){ dtaLumC[src]=0; } ap(); };
  im.onerror=()=>{ dtaLumC[src]=0; };
  im.src=src;
}
function dtaCloseDD(){ if(dtaR.pv) dtaR.pv.classList.remove('on'); dtaR.dd.classList.remove('on'); dtaR.diffBox.setAttribute('aria-expanded','false'); }
function dtaToggleDD(){ const on=!dtaR.dd.classList.contains('on'); dtaR.dd.classList.toggle('on',on); dtaR.diffBox.setAttribute('aria-expanded',String(on)); }
function dtaBindEvents(){
  const sh=dtaR.sheet;
  sh.addEventListener('click',e=>{
    const t=e.target.closest('[data-act]'); if(!t) return; const act=t.dataset.act, i=parseInt(t.dataset.i,10);
    const S=dtaS;
    if(act==='dd'){ dtaToggleDD(); return; }
    if(act==='pick'){ S.diff=t.dataset.d2||null; dtaCloseDD(); dtaSave(); dtaRender(); return; }
    if(act==='hclear'){ e.stopPropagation(); dtaClear(i); return; }
    if(act==='hslot'){ dtaTarget=i; dtaClear(i); return; }
    if(act==='sugpick'){ dtaPick(i,t.dataset.id); return; }
    if(act==='kzoom'){ dtaKZoom(true); return; }
    if(act==='key'){ const n=parseInt(t.dataset.n,10); S.keys=(S.keys===n)?n-1:n; dtaSave(); dtaRender(); return; }
    if(isNaN(i)) return; const x=S.s[i]; if(!dtaC.act[i]) return;
    if(act==='scen'){ const sc=dtaC.scen[i]; if(i>0&&DTA_WITCH_SC.includes(sc)){ x.w=x.w?0:1; dtaSave(); dtaRender(); } return; }
    if(act==='sc'){
      if(!S.diff){ dtaR.diffBox.classList.remove('flash'); dtaR.scoreBox.classList.remove('flash'); void dtaR.diffBox.offsetWidth; dtaR.diffBox.classList.add('flash'); dtaR.scoreBox.classList.add('flash'); dtaR.dd.classList.add('on'); dtaR.diffBox.setAttribute('aria-expanded','true'); return; }
      x.sc=x.sc?0:1; dtaSave(); dtaRender(); return;
    }
    if(act==='tile'){ x.t=x.t==='5'?'':'5'; dtaSave(); dtaRender(); return; }
    if(act==='won'){ x.r=x.r==='w'?null:'w'; dtaSave(); dtaRender(); return; }
    if(act==='lost'){ x.r=x.r==='l'?null:'l'; dtaSave(); dtaRender(); return; }
    if(act==='sk'){ x.k=x.k?0:1; dtaSave(); dtaRender(); return; }
  });
  sh.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.matches('.diffbox')){ e.preventDefault(); dtaToggleDD(); }
    if((e.key==='Enter'||e.key===' ')&&e.target.matches('.dklab')){ e.preventDefault(); dtaKZoom(true); }
  });
  sh.addEventListener('input',e=>{
    const t=e.target;
    if(t.matches('input.dn')){ const f=t.dataset.f, i=parseInt(t.dataset.i,10); let v=t.value.replace(/[^0-9]/g,'').replace(/^0+(?=\d)/,''); if(t.value!==v) t.value=v; dtaS.s[i][f]=v; dtaSave(); dtaRender(); return; }
    if(t.matches('input.dtx')){
      const k=t.dataset.k;
      if(k==='team'){ dtaS.team=t.value; } else if(k==='pl'){ dtaS.pl[parseInt(t.dataset.i,10)]=t.value; }
      else if(k==='he'){ const i=parseInt(t.dataset.i,10); dtaS.he[i].t=t.value; dtaTarget=i; dtaShowSug(i); }
      dtaSave();
    }
  });
  /* champs héros : focus, clavier, validation */
  dtaR.hs.forEach((s,i)=>{
    s.inp.addEventListener('focus',()=>{ dtaTarget=i; dtaR.hs.forEach((o,j)=>o.f.classList.toggle('target',j===i)); if(s.inp.value) dtaShowSug(i); });
    s.inp.addEventListener('keydown',e=>{
      const open=!s.sg.hidden&&s.list.length;
      if(e.key==='ArrowDown'&&open){ e.preventDefault(); s.sel=(s.sel+1)%s.list.length; [...s.sg.children].forEach((b,k)=>b.classList.toggle('on',k===s.sel)); }
      else if(e.key==='ArrowUp'&&open){ e.preventDefault(); s.sel=(s.sel-1+s.list.length)%s.list.length; [...s.sg.children].forEach((b,k)=>b.classList.toggle('on',k===s.sel)); }
      else if(e.key==='Enter'){ e.preventDefault(); if(open&&s.sel>=0) dtaPick(i,s.list[s.sel].id); else dtaHeroCommit(i); s.inp.blur(); }
      else if(e.key==='Escape'&&open){ e.stopPropagation(); s.sg.hidden=true; }
    });
    s.inp.addEventListener('blur',()=>{ setTimeout(()=>{ if(document.activeElement&&s.f.contains(document.activeElement)) return; s.sg.hidden=true; if(!dtaS.he[i].id) dtaHeroCommit(i); },140); });
    s.sg.addEventListener('mousedown',e=>e.preventDefault());
  });
}
function dtaHeroCommit(i){
  const h=dtaS.he[i]; if(h.id) return; const q=dNorm(dtaR.hs[i].inp.value); if(!q) return;
  const hit=H.find(x=>(dNorm(trHeroName(x))===q||dNorm(x.name)===q)&&!dtaS.he.some((o,j)=>j!==i&&o.id===x.id));
  if(hit) dtaPick(i,hit.id);
}
document.addEventListener('pointerdown',e=>{ if(!dtaOpenF||!dtaR.dd) return; if(!e.target.closest('.ddiff,.diffbox')) dtaCloseDD(); });

/* ----- sauvegarde / chargement JSON ----- */
function dtaExportJSON(){ return JSON.stringify({app:'dice-throne-adventures-sheet',v:1,exportedAt:new Date().toISOString(),state:dtaS},null,1); }
function dtaMsg(id,txt,kind){ const m=document.getElementById(id); if(!m) return; m.textContent=txt; m.className='msg'+(kind?' '+kind:''); }
function dtaSaveText(){
  const g=(id,k)=>{ const e=document.getElementById(id); if(e) e.textContent=dtaT(k); };
  g('dsvtitle','sv:title'); g('dsvintro','sv:intro'); g('dsvdl','sv:dl'); g('dsvcopy','sv:copy'); g('dsvimp','sv:import'); g('dsvclose','sv:close');
  const t=document.getElementById('dsvin'); if(t) t.placeholder=dtaT('sv:paste');
}
async function dtaGive(name,data,msgId){
  try{
    const dl=(window.claude&&typeof claude.use==='function')?await claude.use('downloads'):null;
    if(dl){ await dl.save({filename:name,data}); dtaMsg(msgId,dtaT('sv:ok'),'ok'); return true; }
  }catch(e){ if(e&&e.code==='declined'){ dtaMsg(msgId,dtaT('sv:cancel'),''); return false; } }
  try{
    const blob=data instanceof Blob?data:new Blob([data]); const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000); dtaMsg(msgId,dtaT('sv:started'),'ok'); return true;
  }catch(e){ dtaMsg(msgId,dtaT('sv:unavail'),'err'); return false; }
}
function dtaOpenSave(){
  const box=document.getElementById('dsave'); document.getElementById('dsvout').value=dtaExportJSON(); document.getElementById('dsvin').value=''; dtaMsg('dsvmsg','',''); dtaSaveText(); box.hidden=false; document.getElementById('dsvclose').focus({preventScroll:true});
}
function dtaCloseSave(){ document.getElementById('dsave').hidden=true; }
function dtaImport(){
  const txt=document.getElementById('dsvin').value.trim(); if(!txt){ document.getElementById('dsvfile').click(); return; }
  let o; try{ o=JSON.parse(txt); }catch(e){ dtaMsg('dsvmsg',dtaT('sv:bad'),'err'); return; }
  const st=o&&typeof o==='object'?(o.state||o):null; if(!st||!Array.isArray(st.s)||!Array.isArray(st.pl)){ dtaMsg('dsvmsg',dtaT('sv:bad'),'err'); return; }
  dtaS=dtaNorm(st); dtaSave(); dtaRender(); document.getElementById('dsvout').value=dtaExportJSON(); dtaMsg('dsvmsg',dtaT('sv:imported'),'ok');
}

/* ----- export PDF (à plat ou à champs modifiables) ----- */
const DTA_LIBS={h2c:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',pdf:'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'};
function dtaLoadScript(url,test){
  return new Promise((res,rej)=>{
    if(test()) return res();
    const s=document.createElement('script'); s.src=url; s.async=true; s.onload=()=>test()?res():rej(new Error('lib')); s.onerror=()=>rej(new Error('net')); document.head.appendChild(s);
  });
}
function dtaToast(txt,kind){ const m=document.getElementById('dtamsg'); if(!m) return; m.textContent=txt; m.className='dtamsg'+(kind?' '+kind:''); m.hidden=!txt; clearTimeout(dtaToast.t); if(txt&&kind!=='busy') dtaToast.t=setTimeout(()=>{ m.hidden=true; },4200); }
function dtaFieldList(){
  const sh=dtaR.sheet, r0=sh.getBoundingClientRect(), k=r0.width/1210, out=[];
  const add=(name,el,val,o)=>{ const r=el.getBoundingClientRect(); out.push(Object.assign({name,x:(r.left-r0.left)/k,y:(r.top-r0.top)/k,w:r.width/k,h:r.height/k,val:String(val==null?'':val)},o||{})); };
  add('team',dtaR.team.parentNode,dtaS.team,{al:'l',fs:13}); dtaR.pl.forEach((p,i)=>add('player'+(i+1),p.parentNode,dtaS.pl[i],{al:'l',fs:13}));
  add('difficulty',dtaR.diffBox,dtaS.diff?dtaT('d:'+dtaS.diff):'',{al:'c',fs:13}); add('scenario_score_value',dtaR.scoreBox,dtaS.diff?DTA_DIFF[dtaS.diff].v:'',{al:'c',fs:16});
  dtaR.hs.forEach((s,i)=>{ const h=dtaS.he[i]; add('hero'+(i+1),s.f,h.id?'':h.t,{al:'l',fs:13}); });
  const C=dtaC;
  for(let i=0;i<DTA_N;i++){
    const K=dtaR.cols[i], x=dtaS.s[i], n=i+1;
    add('s'+n+'_scenario',K.scen,C.act[i]?C.scen[i]:'',{al:'c',fs:14}); add('s'+n+'_starting_salves',K.st,C.act[i]?C.start[i]:'',{al:'c',fs:14});
    add('s'+n+'_remaining_salves',K.g.rs.w,x.rs,{al:'c',fs:14}); add('s'+n+'_unspent_gold',K.g.g.w,x.g,{al:'c',fs:14}); add('s'+n+'_boss_loot',K.g.l.w,x.l,{al:'c',fs:14}); add('s'+n+'_tiles',K.g.t.w,x.t,{al:'c',fs:14});
    add('s'+n+'_scenario_score',K.g.sc.w,(C.act[i]&&x.sc&&dtaS.diff)?DTA_DIFF[dtaS.diff].v:'',{al:'c',fs:14});
    const r=K.tot.getBoundingClientRect(), a=(r.left-r0.left)/k, b=(r.top-r0.top)/k, w=r.width/k, h=r.height/k;
    out.push({name:'s'+n+'_won',x:a+4,y:b+12,w:w-8,h:h*.32,val:C.act[i]&&x.r==='w'?String(C.tot[i]):'',al:'c',fs:13});
    out.push({name:'s'+n+'_lost',x:a+4,y:b+h*.62,w:w-8,h:h*.28,val:C.act[i]&&x.r==='l'?'-10':'',al:'c',fs:13});
  }
  add('total_campaign_score',dtaR.camp,C.camp==null?'':C.camp,{al:'c',fs:16});
  return out;
}
async function dtaExport(editable){
  const btn=document.getElementById(editable?'dtapdfe':'dtapdf'); if(btn.disabled) return;
  btn.disabled=true; dtaCloseDD(); dtaToast(dtaT('ex:busy'),'busy');
  try{
    await dtaLoadScript(DTA_LIBS.h2c,()=>window.html2canvas); await dtaLoadScript(DTA_LIBS.pdf,()=>window.PDFLib);
    try{ if(document.fonts&&document.fonts.ready) await document.fonts.ready; }catch(e){}
    const fields=editable?dtaFieldList():null;
    const sh=dtaR.sheet, cv=await window.html2canvas(sh,{
      scale:3,backgroundColor:'#d8eaea',useCORS:true,logging:false,width:1210,height:935,windowWidth:1500,windowHeight:1100,scrollX:0,scrollY:0,
      onclone:(doc)=>{
        const d=doc.getElementById('dta'), s=doc.getElementById('dsheet'); if(!d||!s) return;
        d.classList.add('dexp'); d.style.cssText='position:absolute;left:0;top:0;width:1210px;height:935px;overflow:visible;opacity:1;visibility:visible;transition:none';
        [...d.children].forEach(c=>{ if(!c.classList.contains('dta-scroll')) c.style.display='none'; });
        const sc=d.querySelector('.dta-scroll'); sc.style.cssText='position:static;overflow:visible;padding:0;width:1210px;height:935px';
        const f=doc.getElementById('dtafit'); f.style.cssText='position:relative;width:1210px;height:935px;margin:0';
        s.style.transform='none'; s.style.left='0'; s.style.top='0';
        const st=doc.createElement('style'); st.textContent='.ddiff,.hsug,.tip,.hx,.sk{display:none!important}.dsheet *{transition:none!important;animation:none!important}'+(editable?'[data-val]{visibility:hidden!important}input.dn,input.dtx{color:transparent!important}input::placeholder{color:transparent!important}.dfield.diffbox .dv{visibility:hidden}':'input::placeholder{color:transparent!important}');
        doc.head.appendChild(st);
        s.querySelectorAll('input').forEach(inp=>{
          if(inp.hidden){ return; }
          const sp=doc.createElement('div'); sp.className=inp.className; sp.setAttribute('data-val','');
          const cs=doc.defaultView.getComputedStyle(inp); sp.style.cssText='display:flex;align-items:center;justify-content:'+(inp.classList.contains('dn')?'center':'flex-start')+';white-space:nowrap;overflow:hidden;box-sizing:border-box;'
            +'font:'+cs.font+';color:'+cs.color+';padding:'+(inp.classList.contains('dn')?'0':'0 11px')+';border:0;background:transparent;';
          if(inp.classList.contains('dn')) sp.style.position='absolute',sp.style.left='0',sp.style.top='0',sp.style.width='100%',sp.style.height='100%'; else sp.style.width='100%',sp.style.height='100%';
          sp.textContent=inp.value||''; inp.parentNode.replaceChild(sp,inp);
        });
      }
    });
    const P=window.PDFLib, pdf=await P.PDFDocument.create(); pdf.setTitle('Dice Throne Adventures — Campaign Scoring Sheet'); pdf.setCreator('Dice Throne Compagnon');
    const page=pdf.addPage([792,612]);
    const jpg=await pdf.embedJpg(cv.toDataURL('image/jpeg',0.93)); page.drawImage(jpg,{x:0,y:0,width:792,height:612});
    if(editable){
      const form=pdf.getForm(), font=await pdf.embedFont(P.StandardFonts.HelveticaBold), k=792/1210, ok=s=>String(s).replace(/[^\x20-\x7E -ÿ]/g,'').replace(/−/g,'-');
      fields.forEach(f=>{
        const tf=form.createTextField(f.name);
        try{ tf.setText(ok(f.val)); }catch(e){}
        tf.addToPage(page,{x:f.x*k+(f.al==='l'?3:0),y:612-(f.y+f.h)*k,width:f.w*k-(f.al==='l'?6:0),height:f.h*k,borderWidth:0,font,textColor:P.rgb(0.04,0.23,0.27)});
        tf.acroField.getWidgets().forEach(w=>{ const ac=w.getOrCreateAppearanceCharacteristics(); ac.setBackgroundColor([]); ac.setBorderColor([]); });
        tf.setAlignment(f.al==='l'?P.TextAlignment.Left:P.TextAlignment.Center); tf.setFontSize(f.fs*k*1.05);
      });
      form.updateFieldAppearances(font);
    }
    const bytes=await pdf.save();
    const name='dta-scoring-sheet'+(editable?'-editable':'')+'-'+new Date().toISOString().slice(0,10)+'.pdf';
    const done=await dtaGive(name,new Blob([bytes],{type:'application/pdf'}),'dtamsg');
    dtaToast(done?(LANG==='en'?'PDF ready.':'PDF prêt.'):'', done?'ok':'');
  }catch(e){ console.warn('dta export',e); dtaToast(dtaT('ex:fail'),'err'); }
  btn.disabled=false;
}

/* ----- ouverture / fermeture ----- */
function dtaFit(){
  if(!dtaBuilt) return; const w=dtaEl.clientWidth, sc0=Math.max(.45,Math.min(1.6,(w-20)/1210)), cap=ptCap(1210,935,sc0), z=Math.max(1,Math.min(dtaR.z||1,cap/sc0)), sc=sc0*z; dtaR.z=z; dtaR.sc0=sc0; dtaR.cap=cap; dtaEl.classList.toggle('dz',ptHeavy(1210,935,sc0,z));
  { const zb=document.getElementById('dtazoom'); if(zb){ zb.hidden=cap/sc0<1.06; zb.querySelector('.zf').textContent=(Math.round(z*10)/10)+'×'; } }
  dtaR.fit.style.width=Math.round(1210*sc)+'px'; dtaR.fit.style.height=Math.round(935*sc+16)+'px'; dtaR.sheet.style.transform='scale('+sc+')'; dtaR.scale=sc;
}
/* hauteur réelle de la barre du haut (1 ou 2 rangées selon l'écran/la langue) → marge haute de la feuille */
{ const tb=dtaEl.querySelector('.dta-top'), upd=()=>{ dtaEl.style.setProperty('--dtatop',Math.max(0,tb.offsetHeight-14)+'px'); };
  if(window.ResizeObserver) new ResizeObserver(upd).observe(tb); window.addEventListener('resize',upd); upd(); }
function dtaSel(on){ tabs.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',on?(b.dataset.pane==='dta'?'true':'false'):(b.dataset.pane===dtaPrev?'true':'false'))); }
function openDTA(){
  if(dtaOpenF) return; dtaOpenF=true;
  const sel=tabs.querySelector('[aria-selected="true"]'); dtaPrev=sel&&sel.dataset.pane!=='dta'?sel.dataset.pane:'heroes';
  dtaBuild(); dtaSel(true); dtaRender(); dtaRefreshBar(); dtaFit();
  dtaEl.classList.add('on'); dtaEl.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  document.getElementById('dtaexit').focus({preventScroll:true});
}
function closeDTA(){
  if(!dtaOpenF) return; dtaOpenF=false; dtaKZoom(false); dtaCloseDD(); dtaCloseSave(); dtaEl.classList.remove('hasdock'); document.getElementById('dtalib').setAttribute('aria-pressed','false');
  dtaEl.classList.remove('on'); dtaEl.setAttribute('aria-hidden','true'); document.body.style.overflow=''; showPane(dtaPrev);
}
function dtaRefreshBar(){ const b=(id,k)=>{ const e=document.getElementById(id); if(e) e.textContent=dtaT(k); }; b('dtaexit','exit'); b('dtalib','lib'); b('dtapdf','pdf'); b('dtapdfe','pdfe'); b('dtasave','save'); b('dtawipe','wipe'); }
document.getElementById('dtaexit').addEventListener('click',closeDTA);
document.getElementById('dtalib').addEventListener('click',()=>{ const on=!dtaEl.classList.contains('hasdock'); dtaEl.classList.toggle('hasdock',on); document.getElementById('dtalib').setAttribute('aria-pressed',String(on)); if(!on){ dtaTarget=-1; dtaRender(); } });
document.getElementById('dtapdf').addEventListener('click',()=>dtaExport(false));
document.getElementById('dtapdfe').addEventListener('click',()=>dtaExport(true));
document.getElementById('dtasave').addEventListener('click',dtaOpenSave);
document.getElementById('dsvclose').addEventListener('click',dtaCloseSave);
document.getElementById('dsave').addEventListener('click',e=>{ if(e.target.id==='dsave') dtaCloseSave(); });
document.getElementById('dsvdl').addEventListener('click',()=>dtaGive('dta-sheet-'+new Date().toISOString().slice(0,10)+'.json',dtaExportJSON(),'dsvmsg'));
document.getElementById('dsvcopy').addEventListener('click',async()=>{
  const ta=document.getElementById('dsvout'); ta.value=dtaExportJSON();
  try{ await navigator.clipboard.writeText(ta.value); dtaMsg('dsvmsg',dtaT('sv:copied'),'ok'); }
  catch(e){ ta.focus(); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e2){} dtaMsg('dsvmsg',ok?dtaT('sv:copied'):dtaT('sv:copyfail'),ok?'ok':'err'); }
});
document.getElementById('dsvimp').addEventListener('click',dtaImport);
document.getElementById('dsvfile').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; let t=''; try{ t=await f.text(); }catch(err){ dtaMsg('dsvmsg',dtaT('sv:bad'),'err'); return; } document.getElementById('dsvin').value=t; dtaImport(); });
document.getElementById('dtawipe').addEventListener('click',()=>{
  const b=document.getElementById('dtawipe');
  if(!b.classList.contains('armed')){ b.classList.add('armed'); b.textContent=dtaT('wipe2'); clearTimeout(dtaWipeT); dtaWipeT=setTimeout(()=>{ b.classList.remove('armed'); b.textContent=dtaT('wipe'); },3200); return; }
  clearTimeout(dtaWipeT); b.classList.remove('armed'); b.textContent=dtaT('wipe'); dtaS=dtaDefault(); dtaTarget=-1; dtaSave(); dtaRender();
});
document.getElementById('ddsets').addEventListener('click',e=>{ const c=e.target.closest('[data-act=dset]'); if(!c) return; dtaLibSet=c.dataset.s; dtaDockSync(); });
let dtaNoClick=0;
document.getElementById('ddrow').addEventListener('click',e=>{ if(Date.now()<dtaNoClick){ e.preventDefault(); return; } const b=e.target.closest('[data-act=dhero]'); if(!b) return; dtaDockClick(b.dataset.id); });
function dtaDropIdx(x,y){ for(let i=0;i<dtaR.hs.length;i++){ const r=dtaR.hs[i].f.getBoundingClientRect(); if(x>=r.left-6&&x<=r.right+6&&y>=r.top-6&&y<=r.bottom+6) return i; } return -1; }
function dtaDragInit(el,heroes){
  let g=null;
  const clean=()=>{ document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); document.removeEventListener('pointercancel',cx);
    if(g){ el.classList.remove('grabbing'); if(g.ghost) g.ghost.remove(); if(g.src) g.src.classList.remove('dragsrc'); dtaR.hs.forEach(s=>s.f.classList.remove('dropt')); } g=null; };
  const mv=e=>{
    if(!g) return; const dx=e.clientX-g.x, dy=e.clientY-g.y;
    if(g.mode==='none'){
      if(Math.abs(dx)<6&&Math.abs(dy)<6) return;
      if(heroes&&g.btn&&Math.abs(dy)>Math.abs(dx)*1.2&&dtaDockOpenOK()){ g.mode='hero'; g.src=g.btn; g.src.classList.add('dragsrc');
        g.ghost=dE('div','dghost'); const im=dE('img',null,null,{alt:'',draggable:'false'}); im.src=g.btn.querySelector('img').src; g.ghost.appendChild(im); document.body.appendChild(g.ghost); }
      else if(e.pointerType==='mouse'||e.pointerType==='pen'){ g.mode='scroll'; el.classList.add('grabbing'); }
      else { return; }
    }
    if(g.mode==='scroll'){ el.scrollLeft=g.sl-dx; dtaNoClick=Date.now()+350; e.preventDefault(); }
    else if(g.mode==='hero'){ g.ghost.style.left=e.clientX+'px'; g.ghost.style.top=e.clientY+'px'; const i=dtaDropIdx(e.clientX,e.clientY); dtaR.hs.forEach((s,j)=>s.f.classList.toggle('dropt',j===i)); e.preventDefault(); }
  };
  const up=e=>{
    if(g&&g.mode!=='none'){ dtaNoClick=Date.now()+350;
      if(g.mode==='hero'){ const i=dtaDropIdx(e.clientX,e.clientY), id=g.btn.dataset.id; if(i>=0) dtaDropHero(i,id); } }
    clean();
  };
  const cx=()=>clean();
  el.addEventListener('pointerdown',e=>{
    if(e.button>0) return; clean();
    g={x:e.clientX,y:e.clientY,sl:el.scrollLeft,mode:'none',btn:heroes?e.target.closest('.hb'):null};
    document.addEventListener('pointermove',mv,{passive:false}); document.addEventListener('pointerup',up); document.addEventListener('pointercancel',cx);
  });
  el.addEventListener('dragstart',e=>e.preventDefault());
}
function dtaDockOpenOK(){ return dtaEl.classList.contains('hasdock'); }
function dtaDropHero(i,id){
  const at=dtaS.he.findIndex(h=>h.id===id);
  if(at===i) return;
  if(at>=0) dtaS.he[at]={id:null,t:''};
  dtaPick(i,id);
}
dtaDragInit(document.getElementById('ddrow'),true);
dtaDragInit(document.getElementById('ddsets'),false);
window.addEventListener('resize',()=>{ if(dtaOpenF) dtaFit(); });
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!dtaOpenF) return;
  if(dtaR.kz&&dtaR.kz.classList.contains('on')){ dtaKZoom(false); return; }
  if(!document.getElementById('dsave').hidden){ dtaCloseSave(); return; }
  if(dtaR.dd.classList.contains('on')){ dtaCloseDD(); return; }
  if(dtaEl.classList.contains('hasdock')){ dtaEl.classList.remove('hasdock'); document.getElementById('dtalib').setAttribute('aria-pressed','false'); return; }
  closeDTA();
});

/* ================= DTM Sheet : Perk Sheet interactive des Missions (récto / verso) ================= */
const DTM_GR=['mom','grit','lead','hero','feat'], DTM_ROWY=[165,325,515,722,925,1190];
const DTM_KEYS=[]; DTM_GR.forEach(g=>[1,2,3,4,5].forEach(d=>DTM_KEYS.push(g+d)));
const DTM_COL=[
  {c:'#2fe0ee',cd:'#0b7f8c',cg:'rgba(47,224,238,.8)'},{c:'#52e640',cd:'#18801a',cg:'rgba(82,230,64,.8)'},{c:'#f6e51c',cd:'#8d7f06',cg:'rgba(246,229,28,.8)'},
  {c:'#ffa91f',cd:'#9a5a05',cg:'rgba(255,169,31,.8)'},{c:'#ff5a2a',cd:'#a02a0a',cg:'rgba(255,90,42,.8)'}];
const DTM_BIT=[{b:1,c:'#58a8ff',k:'b:play'},{b:2,c:'#46e36a',k:'b:comp'},{b:4,c:'#ffd23a',k:'b:perf'}];
const DTM_D={
  'exit':['← Quitter','← Quitter','← Exit'],
  'flip:bk':['Voir le verso','Voir le verso','View the back'],'flip:fr':['Voir le recto','Voir le recto','View the front'],
  'pdf':['PDF','PDF','PDF'],'save':['Sauvegarde','Sauvegarde','Save'],'wipe':['Vider la feuille','Vider la feuille','Clear sheet'],'wipe2':['Confirmer ?','Confirmer ?','Sure?'],
  'player':['Joueur','Joueur','Player'],'add':['Nouvelle feuille','Nouvelle feuille','New sheet'],'max':['Maximum 8 feuilles.','Maximum 8 feuilles.','Maximum 8 sheets.'],
  'del':['Fermer cette feuille','Fermer cette feuille','Close this sheet'],'del2':['Clique encore pour supprimer','Clique encore pour supprimer','Click again to delete'],
  'name':['Nom du joueur','Nom du joueur','Player name'],
  'b:play':['Mission jouée','Mission jouée','Mission played'],'b:comp':['Mission complétée (les 2 faces)','Mission complétée (les 2 faces)','Mission completed (both sides)'],'b:perf':['Perfect (+1 PP)','Perfect (+1 PP)','Perfect (+1 PP)'],
  'tk:lock':['Remplis d’abord tous les cercles de ce Feat pour débloquer son Plot Token.','Remplis d’abord tous les cercles de ce Feat pour débloquer son Plot Token.','Fill all the circles of this Feat first to unlock its Plot Token.'],
  'tk:tip':['Plot Token : clique pour le poser / le retirer (le retirer = activer le Feat)','Plot Token : clique pour le poser / le retirer (le retirer = activer le Feat)','Plot Token: click to place / remove it (removing it = activating the Feat)'],
  'ng':['New Game+','New Game+','New Game+'],
  'sv:title':['Sauvegarde de la feuille active','Sauvegarde de la feuille active','Save / load the active sheet'],
  'sv:intro':['Exporte la feuille affichée en JSON pour la garder ou la partager, ou colle un export pour la recharger dans cette feuille. Seule la feuille active est concernée ; toutes les feuilles sont aussi enregistrées automatiquement dans ce navigateur.','Exporte la feuille affichée en JSON pour la garder ou la partager, ou colle un export pour la recharger dans cette feuille. Seule la feuille active est concernée ; toutes les feuilles sont aussi enregistrées automatiquement dans ce navigateur.','Export the displayed sheet as JSON to keep or share it, or paste an export to reload it into this sheet. Only the active sheet is affected; every sheet is also saved automatically in this browser.'],
  'sv:dl':['Télécharger .json','Télécharger .json','Download .json'],'sv:copy':['Copier','Copier','Copy'],'sv:import':['Importer','Importer','Import'],'sv:close':['Fermer','Fermer','Close'],
  'sv:paste':['Clique sur Importer pour choisir un fichier .json, ou colle un export ici…','Clique sur Importer pour choisir un fichier .json, ou colle un export ici…','Click Import to pick a .json file, or paste an export here…'],
  'sv:bad':['Ce contenu n’est pas une feuille DTM valide.','Ce contenu n’est pas une feuille DTM valide.','This is not a valid DTM sheet.'],
  'sv:imported':['Feuille importée.','Feuille importée.','Sheet imported.'],
  'ex:busy':['Génération du PDF…','Génération du PDF…','Generating the PDF…'],'ex:ok':['PDF prêt (la feuille y est jointe en JSON).','PDF prêt (la feuille y est jointe en JSON).','PDF ready (the sheet is attached as JSON).'],
  'ex:fail':['Impossible de générer le PDF ici (bibliothèque non chargée).','Impossible de générer le PDF ici (bibliothèque non chargée).','Could not generate the PDF here (library not loaded).']
};
function dtmT(k){ const a=DTM_D[k]; if(!a) return k; return LANG==='fr'?a[1]:(LANG==='en'?a[2]:a[0]); }
const dtmEl=document.getElementById('dtm'), dmFit=document.getElementById('dmfit'), dmTabs=document.getElementById('dmtabs'), dmTop=dtmEl.querySelector('.dtm-top'); const dmStage=document.getElementById('dmstage'), dmZoomBox=document.getElementById('dmzoom');
const dtmR={sheets:{},open:false,prev:'heroes',sc:1,z:1,hinted:false};
/* les images du sheet (p2, masques m1/m2/mc) sont référencées en dur dans le CSS : un url() base64 dans une variable CSS était re-parsé pour chaque élément (style recalc ≈ 1 ms/élément) */

/* ----- état ----- */
function dtmNew(){ return {id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),pn:'',side:0,c:{},tk:[0,0,0,0,0],ng:[0,0,0,0,0],m:new Array(20).fill(0)}; }
function dtmNormSheet(o,keepId){
  const d=dtmNew(); if(!o||typeof o!=='object') return d;
  if(keepId) d.id=keepId; else if(typeof o.id==='string'&&/^[\w-]{1,24}$/.test(o.id)) d.id=o.id;
  d.pn=typeof o.pn==='string'?o.pn.slice(0,40):''; d.side=o.side===1?1:0;
  DTM_KEYS.forEach(k=>{ const n=DTM_GEO.cells[k].length; if(!n) return; const v=parseInt(o.c&&o.c[k],10); if(v>0) d.c[k]=v&((1<<n)-1); });
  if(Array.isArray(o.ng)) for(let i=0;i<5;i++) d.ng[i]=o.ng[i]?1:0;
  if(Array.isArray(o.m)) for(let i=0;i<20;i++){ let v=(parseInt(o.m[i],10)||0)&7; if(v&4) v|=2; if(v&2) v|=1; d.m[i]=v; }
  if(Array.isArray(o.tk)) for(let i=0;i<5;i++) d.tk[i]=(o.tk[i]&&dtmGDone(d,'feat'+(i+1)))?1:0;
  return d;
}
function dtmLoad(){
  try{ const r=localStorage.getItem(DTM_KEY); if(r){ const o=JSON.parse(r), a=(Array.isArray(o.sh)?o.sh:[]).slice(0,DTM_MAXS).map(x=>dtmNormSheet(x)); if(a.length){ const seen={}; a.forEach(s=>{ while(seen[s.id]) s.id=s.id+'x'; seen[s.id]=1; }); return {v:1,act:Math.max(0,Math.min(a.length-1,parseInt(o.act,10)||0)),sh:a}; } } }catch(e){}
  return {v:1,act:0,sh:[dtmNew()]};
}
let dtmS=dtmLoad(), dtmWipeT=0;
function dtmSave(){ try{ localStorage.setItem(DTM_KEY,JSON.stringify(dtmS)); }catch(e){} }
function dtmCur(){ return dtmS.sh[dtmS.act]; }
function dtmName(sh,i){ return sh.pn||(dtmT('player')+' '+(i+1)); }
function dtmEmpty(sh){ return !sh.pn&&!Object.keys(sh.c).some(k=>sh.c[k])&&!sh.tk.some(x=>x)&&!sh.ng.some(x=>x)&&!sh.m.some(x=>x); }

/* ----- statut dérivé ----- */
function dtmGDone(sh,k){ const n=DTM_GEO.cells[k].length; return n===0||sh.c[k]===(1<<n)-1; }
function dtmStat(sh){
  const g={}; DTM_KEYS.forEach(k=>g[k]=dtmGDone(sh,k));
  const row=DTM_GR.map(r=>[1,2,3,4,5].every(d=>g[r+d])), col=[1,2,3,4,5].map(d=>DTM_GR.every(r=>g[r+d]));
  const mc=[1,2,3,4,5].map(d=>{ const ix=[]; DTM_GEO.missions.forEach((m,i)=>{ if(m.d===d) ix.push(i); }); return {all:ix.every(i=>sh.m[i]&2),perf:ix.every(i=>sh.m[i]&4)}; });
  return {g,row,col,ng:sh.ng.every(x=>x),mc};
}

/* ----- sons ----- */
let dtmNoise=null;
function dtmSnd(kind){
  if(!achState.snd) return; const c=audio(); if(!c) return;
  try{
    if(c.state==='suspended') c.resume();
    const t=c.currentTime+.004;
    const tone=(type,f0,f1,dur,vol,at)=>{ const o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f0,at); o.frequency.exponentialRampToValueAtTime(f1,at+dur);
      g.gain.setValueAtTime(.0001,at); g.gain.exponentialRampToValueAtTime(vol,at+.003); g.gain.exponentialRampToValueAtTime(.0001,at+dur); o.connect(g); g.connect(MASTER); o.start(at); o.stop(at+dur+.02); };
    if(kind==='tick') tone('square',2100,1250,.04,.07,t);
    else if(kind==='untick') tone('square',1100,700,.045,.05,t);
    else if(kind==='stamp'){ tone('sine',150,45,.22,.3,t+.05); tone('triangle',520,160,.09,.12,t+.05); }
    else if(kind==='unstamp') tone('triangle',420,160,.14,.1,t);
    else if(kind==='nope'){ tone('square',180,150,.09,.07,t); tone('square',150,120,.1,.07,t+.1); }
    else if(kind==='swoosh'){
      if(!dtmNoise){ const n=Math.floor(c.sampleRate*.9), b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; dtmNoise=b; }
      const s=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain(); s.buffer=dtmNoise; f.type='bandpass'; f.Q.value=.9;
      f.frequency.setValueAtTime(260,t); f.frequency.exponentialRampToValueAtTime(2600,t+.42); f.frequency.exponentialRampToValueAtTime(900,t+.8);
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.2,t+.2); g.gain.exponentialRampToValueAtTime(.0001,t+.8); s.connect(f); f.connect(g); g.connect(MASTER); s.start(t); s.stop(t+.9);
    }else if(kind==='group'){ [880,1318.51].forEach((f,i)=>bell(f,t+i*.06,.1,.8)); }
    else if(kind==='row'){ [659.25,880,1318.51].forEach((f,i)=>bell(f,t+i*.07,.15-i*.02,1.1)); for(let i=0;i<5;i++) ping(t+.15+i*.05,2600+Math.random()*2800,.04); }
    else if(kind==='col'){ [523.25,659.25,783.99,1046.5].forEach((f,i)=>bell(f,t+i*.08,.15,1.3)); for(let i=0;i<8;i++) ping(t+.2+i*.05,2400+Math.random()*3200,.04); }
    else if(kind==='mission'){ [783.99,1046.5].forEach((f,i)=>bell(f,t+i*.07,.13,1)); }
    else if(kind==='perfect'){ [659.25,880,1174.66,1567.98].forEach((f,i)=>bell(f,t+i*.07,.15,1.4)); for(let i=0;i<9;i++) ping(t+.18+i*.045+Math.random()*.03,2600+Math.random()*3600,.045); }
  }catch(e){}
}

/* ----- construction d'une feuille ----- */
const dtmE=(tag,cls,css)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(css) e.style.cssText=css; return e; };
const dtmBox=(cls,x0,y0,x1,y1,extra)=>dtmE('div',cls,'left:'+x0+'px;top:'+y0+'px;width:'+(x1-x0)+'px;height:'+(y1-y0)+'px;--l:'+x0+'px;--t:'+y0+'px;'+(extra||''));
const dtmCV=d=>{ const c=DTM_COL[d-1]; return '--c:'+c.c+';--cd:'+c.cd+';--cg:'+c.cg+';'; };
function dtmBuild(sh){
  const G=DTM_GEO, R={sh,cb:{},ft:[],ng:[],mb:[],rowSn:[],rowBar:[],colBar:[],colHdr:[],vh:[],mnm:[],msp:[],flip:false};
  const root=dtmE('div','dms'); root.dataset.id=sh.id; root.setAttribute('aria-hidden','true');
  const inn=dtmE('div','dms-in'); root.appendChild(inn);
  /* recto */
  const fr=dtmE('div','dmface fr'); const im1=dtmE('img','bg'); im1.src=DTM_A.p1; im1.alt=''; im1.draggable=false; fr.appendChild(im1);
  G.colx.forEach((cx,c)=>{ const h=dtmBox('dhdr',...G.hdr1[c],dtmCV(c+1)); fr.appendChild(h); R.colHdr.push(h); });
  G.colx.forEach((cx,c)=>{ const b=dtmBox('dbar vert',cx[0],165,cx[1],1190); b.addEventListener('animationend',()=>b.classList.remove('go')); fr.appendChild(b); R.colBar.push(b); });
  DTM_GR.forEach((g,r)=>{
    const b=dtmBox('dbar',G.colx[0][0],DTM_ROWY[r],G.colx[4][1],DTM_ROWY[r+1]); b.addEventListener('animationend',()=>b.classList.remove('go')); fr.appendChild(b); R.rowBar.push(b);
    const l=dtmBox('dsn m1',...G.labels[g],'--dl:'+(r*.7).toFixed(1)+'s;'); fr.appendChild(l); R.rowSn.push(l);
  });
  R.crown=dtmBox('dsn mc gold',...G.crown); fr.appendChild(R.crown);
  const nm=dtmE('input','dnm'); nm.type='text'; nm.maxLength=40; nm.autocomplete='off'; nm.spellcheck=false; nm.value=sh.pn; fr.appendChild(nm); R.nm=nm;
  DTM_KEYS.forEach(k=>{
    const d=+k.slice(-1); R.cb[k]=G.cells[k].map((p,i)=>{ const b=dtmE('button','dcb','left:'+p[0]+'px;top:'+p[1]+'px;'+dtmCV(d)); b.type='button'; b.dataset.k=k; b.dataset.i=i; b.appendChild(dtmE('i')); fr.appendChild(b); return b; });
  });
  G.ng.forEach((p,i)=>{ const b=dtmE('button','dcb ng','left:'+p[0]+'px;top:'+p[1]+'px;'+dtmCV(i+1)); b.type='button'; b.dataset.k='ng'; b.dataset.i=i; b.appendChild(dtmE('i')); fr.appendChild(b); R.ng.push(b); });
  G.feat.forEach((f,i)=>{
    const b=dtmE('button','dft','left:'+f[0]+'px;top:'+f[1]+'px;width:'+f[2]+'px;height:'+f[3]+'px;'+dtmCV(i+1)); b.type='button'; b.dataset.i=i;
    const im=dtmE('img','st'); im.src=DTM_A.plot; im.alt=''; im.draggable=false; b.appendChild(im);
    b.addEventListener('animationend',e=>{ if(e.target!==im) return; if(b.classList.contains('unstamp')){ b.classList.remove('unstamp','on'); } b.classList.remove('stamp'); });
    fr.appendChild(b); R.ft.push(b);
  });
  const cl=dtmE('button','dcurl r'); cl.type='button'; cl.dataset.a='flip'; fr.appendChild(cl); R.cl1=cl;
  /* verso */
  const bk=dtmE('div','dmface bk hid'); const im2=dtmE('img','bg'); im2.src=DTM_A.p2; im2.alt=''; im2.draggable=false; bk.appendChild(im2);
  G.hdr2.forEach((h,c)=>{ const e=dtmBox('dhdr',...h,dtmCV(c+1)); e.appendChild(dtmE('div','sw')); bk.appendChild(e); R.vh.push(e); });
  G.missions.forEach((m,i)=>{
    const n=dtmBox('dsn m2',...m.name,'--dl:'+((i*.37)%3).toFixed(2)+'s;'); bk.appendChild(n); R.mnm.push(n);
    const sp=dtmBox('dsp',...m.name); for(let j=0;j<9;j++){ const s=dtmE('i','','left:'+(4+Math.random()*92).toFixed(1)+'%;top:'+(Math.random()*100).toFixed(1)+'%;--dl:'+(Math.random()*2).toFixed(2)+'s;--du:'+(1.2+Math.random()*1.2).toFixed(2)+'s;'); sp.appendChild(s); } bk.appendChild(sp); R.msp.push(sp);
    R.mb.push(DTM_BIT.map((bt,j)=>{ const p=[m.play,m.comp,m.perf][j]; const b=dtmE('button','dmb','left:'+p[0]+'px;top:'+p[1]+'px;--c:'+bt.c+';--dl:'+((i*.12)%1.4).toFixed(2)+'s;'); b.type='button'; b.dataset.m=i; b.dataset.b=bt.b; b.style.setProperty('--x',(p[0]-18)+'px'); b.style.setProperty('--y',(p[1]-18)+'px'); bk.appendChild(b); return b; }));
  });
  const cl2=dtmE('button','dcurl l'); cl2.type='button'; cl2.dataset.a='flip'; bk.appendChild(cl2); R.cl2=cl2;
  inn.appendChild(fr); inn.appendChild(bk); R.root=root; R.inn=inn; R.fr=fr; R.bk=bk;
  /* événements */
  nm.addEventListener('input',()=>{ sh.pn=nm.value.slice(0,40); dtmSave(); dtmTabs(); });
  nm.addEventListener('keydown',e=>{ if(e.key==='Enter'){ nm.blur(); } e.stopPropagation(); });
  fr.addEventListener('click',e=>{
    const f=e.target.closest('.dft'); if(f){ dtmTokenClick(sh,R,+f.dataset.i); return; }
    const c=e.target.closest('.dcb'); if(c){ dtmBubble(sh,R,c); return; }
    if(e.target.closest('[data-a=flip]')) dtmFlip(sh);
  });
  bk.addEventListener('click',e=>{
    const b=e.target.closest('.dmb'); if(b){ dtmMission(sh,R,+b.dataset.m,+b.dataset.b); return; }
    if(e.target.closest('[data-a=flip]')) dtmFlip(sh);
  });
  dmFit.appendChild(root); dtmR.sheets[sh.id]=R; dtmI18n(R); dtmSide(sh); dtmPaint(sh,true);
  return R;
}
function dtmI18n(R){
  R.nm.placeholder=dtmT('name'); R.nm.setAttribute('aria-label',dtmT('name'));
  R.ft.forEach(b=>{ b.title=b.classList.contains('lock')?dtmT('tk:lock'):dtmT('tk:tip'); });
  R.mb.forEach(a=>a.forEach((b,j)=>{ b.title=dtmT(DTM_BIT[j].k); b.setAttribute('aria-label',dtmT(DTM_BIT[j].k)+' — '+DTM_GEO.missions[+b.dataset.m].n); }));
  const f=dtmT(R.sh.side?'flip:fr':'flip:bk'); R.cl1.title=R.cl2.title=f; R.cl1.setAttribute('aria-label',f); R.cl2.setAttribute('aria-label',f);
  R.ng.forEach((b,i)=>b.setAttribute('aria-label',dtmT('ng')+' '+(i+1)));
  DTM_KEYS.forEach(k=>R.cb[k].forEach((b,i)=>b.setAttribute('aria-label',k.slice(0,-1)+' '+k.slice(-1)+' · '+(i+1)+'/'+R.cb[k].length)));
}
function dtmSide(sh){ const R=dtmR.sheets[sh.id]; if(!R) return; R.fr.classList.toggle('hid',sh.side===1); R.bk.classList.toggle('hid',sh.side===0); }

/* ----- rendu déclaratif ----- */
function dtmPaint(sh,quiet){
  const R=dtmR.sheets[sh.id]; if(!R) return; const S=dtmStat(sh), G=DTM_GEO;
  DTM_KEYS.forEach(k=>R.cb[k].forEach((b,i)=>{ const on=!!((sh.c[k]||0)>>i&1); b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false'); }));
  R.ng.forEach((b,i)=>{ b.classList.toggle('on',!!sh.ng[i]); b.setAttribute('aria-pressed',sh.ng[i]?'true':'false'); });
  R.ft.forEach((b,i)=>{
    const un=S.g['feat'+(i+1)], on=!!sh.tk[i]&&un;
    b.classList.toggle('lock',!un); b.classList.toggle('unl',un&&!on);
    if(!b.classList.contains('unstamp')&&!b.classList.contains('stamp')) b.classList.toggle('on',on);
    b.setAttribute('aria-pressed',on?'true':'false'); b.title=un?dtmT('tk:tip'):dtmT('tk:lock');
  });
  R.rowSn.forEach((e,r)=>e.classList.toggle('on',S.row[r]));
  R.crown.classList.toggle('on',S.ng);
  R.mb.forEach((a,i)=>a.forEach((b,j)=>{ const on=!!(sh.m[i]&DTM_BIT[j].b); b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false'); }));
  G.missions.forEach((m,i)=>{ const v=sh.m[i]; R.mnm[i].classList.toggle('on',!!(v&2)); R.mnm[i].classList.toggle('gold',!!(v&4)); R.msp[i].classList.toggle('on',!!(v&4)); });
  R.vh.forEach((e,c)=>{ e.classList.toggle('keep',S.mc[c].all); e.classList.toggle('gold',S.mc[c].all&&S.mc[c].perf); });
}

/* ----- effets ponctuels ----- */
function dtmRestart(el,cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function dtmBurst(layer,x,y,col,n){
  if(still.matches) return; const b=dtmE('div','dbrst','left:'+x+'px;top:'+y+'px;--c:'+col+';');
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, d=26+Math.random()*50; b.appendChild(dtmE('i','','--dx:'+(Math.cos(a)*d).toFixed(0)+'px;--dy:'+(Math.sin(a)*d).toFixed(0)+'px;animation-delay:'+(Math.random()*.08).toFixed(2)+'s;')); }
  layer.appendChild(b); setTimeout(()=>b.remove(),1000);
}
function dtmCenter(k){ const c=DTM_GEO.cells[k]; return [c.reduce((s,p)=>s+p[0],0)/c.length,c.reduce((s,p)=>s+p[1],0)/c.length]; }
function dtmTransitions(sh,R,A,B){
  let snd=null;
  DTM_KEYS.forEach(k=>{ if(!A.g[k]&&B.g[k]&&DTM_GEO.cells[k].length){ const p=dtmCenter(k), d=+k.slice(-1); dtmBurst(R.fr,p[0],p[1],DTM_COL[d-1].c,14); snd=snd||'group'; } });
  B.row.forEach((v,r)=>{ if(v&&!A.row[r]){ dtmRestart(R.rowBar[r],'go'); snd='row'; } });
  B.col.forEach((v,c)=>{ if(v&&!A.col[c]){ dtmRestart(R.colBar[c],'go'); dtmRestart(R.colHdr[c],'flash'); R.colHdr[c].addEventListener('animationend',function f(){ R.colHdr[c].classList.remove('flash'); R.colHdr[c].removeEventListener('animationend',f); }); snd='col'; } });
  if(B.ng&&!A.ng){ dtmRestart(R.crown,'burst'); setTimeout(()=>R.crown.classList.remove('burst'),950); const c=DTM_GEO.crown; dtmBurst(R.fr,(c[0]+c[2])/2,(c[1]+c[3])/2,'#ffd23a',22); snd='col'; }
  return snd;
}
function dtmBubble(sh,R,btn){
  const k=btn.dataset.k, i=+btn.dataset.i, A=dtmStat(sh); let on;
  if(k==='ng'){ sh.ng[i]=sh.ng[i]?0:1; on=!!sh.ng[i]; }
  else{ const v=(sh.c[k]||0)^(1<<i); sh.c[k]=v; on=!!(v>>i&1); if(!dtmGDone(sh,k)){ const m=/^feat(\d)$/.exec(k); if(m&&sh.tk[+m[1]-1]){ sh.tk[+m[1]-1]=0; const f=R.ft[+m[1]-1]; if(f.classList.contains('on')){ f.classList.remove('stamp'); dtmRestart(f,'unstamp'); } } } }
  const B=dtmStat(sh); dtmPaint(sh);
  if(on){ const ic=btn.firstChild; dtmRestart(ic,'pop'); setTimeout(()=>ic.classList.remove('pop'),420); }
  dtmSnd(on?'tick':'untick'); const s=dtmTransitions(sh,R,A,B); if(s&&on) setTimeout(()=>dtmSnd(s),90);
  dtmSave();
}
function dtmTokenClick(sh,R,i){
  const b=R.ft[i];
  if(!dtmGDone(sh,'feat'+(i+1))){ dtmRestart(b,'nope'); setTimeout(()=>b.classList.remove('nope'),420); dtmSnd('nope'); dtmToast(dtmT('tk:lock'),'err'); return; }
  if(b.classList.contains('stamp')||b.classList.contains('unstamp')) return;
  if(sh.tk[i]){ sh.tk[i]=0; dtmRestart(b,'unstamp'); dtmSnd('unstamp'); }
  else{ sh.tk[i]=1; b.classList.add('on'); dtmRestart(b,'stamp'); setTimeout(()=>dtmSnd('stamp'),0); const f=DTM_GEO.feat[i]; setTimeout(()=>dtmBurst(R.fr,f[0]+f[2]/2,f[1]+f[3]/2,DTM_COL[i].c,12),240); }
  dtmPaint(sh); dtmSave();
}
function dtmMission(sh,R,i,bit){
  let v=sh.m[i]; const A=dtmStat(sh), was=v;
  if(v&bit){ if(bit===1) v=0; else if(bit===2) v&=1; else v&=3; } else{ v|=bit; if(bit===4) v|=3; else if(bit===2) v|=1; }
  sh.m[i]=v; const B=dtmStat(sh); dtmPaint(sh);
  const on=!!(v&bit);
  R.mb[i].forEach((b,jj)=>{ if((v^was)&DTM_BIT[jj].b&&(v&DTM_BIT[jj].b)){ dtmRestart(b,'pop'); setTimeout(()=>b.classList.remove('pop'),500); } });
  let snd=on?'tick':'untick';
  if(on&&bit>=2&&!(was&bit)){ const n=R.mnm[i]; dtmRestart(n,'burst'); setTimeout(()=>n.classList.remove('burst'),950); snd=bit===4?'perfect':'mission'; }
  const col=DTM_GEO.missions[i].d-1;
  if(B.mc[col].all&&!A.mc[col].all){ dtmRestart(R.vh[col],'flash'); R.vh[col].addEventListener('animationend',function f(){ R.vh[col].classList.remove('flash'); R.vh[col].removeEventListener('animationend',f); }); snd='col'; }
  dtmSnd(snd==='tick'||snd==='untick'?snd:'tick'); if(snd!=='tick'&&snd!=='untick') setTimeout(()=>dtmSnd(snd),90);
  dtmSave();
}

/* ----- tournage de page (pli depuis un coin) ----- */
function dtmClip(poly,n,k,ge){
  const out=[], f=p=>(p[0]*n[0]+p[1]*n[1]-k)*(ge?1:-1);
  for(let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length], fa=f(a), fb=f(b);
    if(fa>=0) out.push(a);
    if((fa>=0)!==(fb>=0)){ const t=fa/(fa-fb); out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]); }
  }
  return out;
}
const dtmPoly=p=>p.length<3?'polygon(0 0,0 0,0 0)':'polygon('+p.map(q=>q[0].toFixed(1)+'px '+q[1].toFixed(1)+'px').join(',')+')';
function dtmFlip(sh){
  const R=dtmR.sheets[sh.id]; if(!R||R.flip) return; R.flip=true;
  const to=sh.side?0:1, dir=to?1:-1, W=1650, H=1200, front=to?R.fr:R.bk, back=to?R.bk:R.fr, rect=[[0,0],[W,0],[W,H],[0,H]];
  R.root.classList.add('flipping'); dtmSnd('swoosh');
  back.classList.remove('hid'); front.classList.remove('hid'); front.style.zIndex=2; back.style.zIndex=1;
  const flap=dtmE('div','dflap'); const cl=back.cloneNode(true); cl.classList.remove('hid'); cl.style.zIndex=''; cl.querySelectorAll('input,button').forEach(x=>{ x.tabIndex=-1; x.removeAttribute('id'); }); cl.querySelectorAll('.dcurl').forEach(x=>x.remove());
  flap.appendChild(cl); const fsh=dtmE('div','dtsh'); flap.appendChild(fsh); flap.style.display='block'; flap.style.zIndex=3; R.inn.appendChild(flap);
  const bsh=dtmE('div','dbsh'); bsh.style.zIndex=1; back.after(bsh);
  const reduce=still.matches, dur=reduce?240:1250, t0=performance.now();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function frame(now){
    const t=Math.min(1,(now-t0)/dur), e=ease(t);
    const th=(42-34*e)*Math.PI/180, n=[dir*Math.cos(th),Math.sin(th)];
    const vals=rect.map(p=>p[0]*n[0]+p[1]*n[1]), kmax=Math.max(...vals), kmin=Math.min(...vals);
    const k=t>=1?kmin-4:kmax-(kmax-kmin+4)*e;
    const nf=dtmClip(rect,n,k,false), fo=dtmClip(rect,n,k,true);
    front.style.clipPath=dtmPoly(nf);
    flap.style.clipPath=dtmPoly(fo);
    const a=1-2*n[0]*n[0], b=-2*n[0]*n[1], d=1-2*n[1]*n[1];
    flap.style.transform='matrix('+a+','+b+','+b+','+d+','+(2*k*n[0])+','+(2*k*n[1])+')';
    /* ombrages */
    const L=W*Math.abs(n[0])+H*Math.abs(n[1]), ang=Math.atan2(n[0],-n[1])*180/Math.PI, f0=((k-(W/2*n[0]+H/2*n[1]))/L+.5)*100;
    fsh.style.background='linear-gradient('+ang.toFixed(1)+'deg,rgba(255,255,255,.38) '+f0.toFixed(2)+'%,rgba(255,255,255,0) '+(f0+5).toFixed(2)+'%,rgba(0,0,0,.16) '+(f0+14).toFixed(2)+'%,rgba(0,0,0,.34) 100%)';
    bsh.style.background='linear-gradient('+ang.toFixed(1)+'deg,rgba(0,0,0,0) '+(f0-1).toFixed(2)+'%,rgba(0,0,0,.5) '+f0.toFixed(2)+'%,rgba(0,0,0,0) '+(f0+150/L*100).toFixed(2)+'%)';
    bsh.style.clipPath=dtmPoly(fo);
    if(t<1) requestAnimationFrame(frame); else done();
  }
  function done(){
    sh.side=to; flap.remove(); bsh.remove(); front.style.clipPath=''; front.style.zIndex=''; back.style.zIndex=''; front.classList.add('hid');
    R.root.classList.remove('flipping'); R.flip=false; dtmSide(sh); dtmI18n(R); dtmSave(); if(dtmCur()===sh) dtmBar();
    if(to&&!dtmR.hinted&&sh.m.every(v=>!v)){ dtmR.hinted=true; R.root.classList.add('vhint'); setTimeout(()=>R.root.classList.remove('vhint'),6500); }
  }
  requestAnimationFrame(frame);
}

/* ----- onglets, barre, ajustement ----- */
function dtmTabs(){
  dmTabs.textContent='';
  dtmS.sh.forEach((sh,i)=>{
    const d=dtmE('div','dmt'+(i===dtmS.act?' on':'')); d.dataset.i=i; d.setAttribute('role','presentation');
    const l=dtmE('button','l'); l.type='button'; l.dataset.a='sel'; l.setAttribute('role','tab'); l.setAttribute('aria-selected',i===dtmS.act?'true':'false'); l.textContent=dtmName(sh,i); l.title=dtmName(sh,i);
    const x=dtmE('button','x'); x.type='button'; x.dataset.a='del'; x.textContent='×'; x.title=dtmT('del'); x.setAttribute('aria-label',dtmT('del')+' — '+dtmName(sh,i));
    d.appendChild(l); d.appendChild(x); dmTabs.appendChild(d);
  });
  const add=document.getElementById('dmadd'); add.disabled=dtmS.sh.length>=DTM_MAXS; add.title=dtmT('add'); add.setAttribute('aria-label',dtmT('add'));
}
function dtmBar(){
  const b=(id,k)=>{ const e=document.getElementById(id); if(e) e.textContent=dtmT(k); };
  b('dmexit','exit'); b('dmpdf','pdf'); b('dmsavebtn','save'); b('dmwipe','wipe');
  const sh=dtmCur(); document.getElementById('dmflip').textContent=dtmT(sh&&sh.side?'flip:fr':'flip:bk');
}
function dtmActivate(i,quiet){
  dtmS.act=Math.max(0,Math.min(dtmS.sh.length-1,i)); const cur=dtmCur();
  dtmS.sh.forEach(sh=>{ const R=dtmR.sheets[sh.id]||dtmBuild(sh), on=sh===cur; R.root.classList.toggle('act',on); R.root.inert=!on; R.root.setAttribute('aria-hidden',on?'false':'true'); });
  dtmTabs(); dtmBar(); dtmFit(); dtmSave();
}
function dtmGeo(){
  const w=dtmEl.clientWidth, h=dtmEl.clientHeight, top=Math.max(40,dmTop.offsetHeight-12), sc0=Math.max(.15,Math.min((w-24)/1650,(h-top-14)/1200,1.6));
  const cap=ptCap(1650,1200,sc0), z=Math.max(1,Math.min(dtmR.z||1,cap/sc0)), sc=sc0*z, W=Math.round(1650*sc), H=Math.round(1200*sc);
  return {w,h,top,sc0,cap,z,sc,W,H,L:W<=w?Math.round((w-W)/2):12};
}
function dtmFit(){
  if(!dtmR.open&&!dtmEl.classList.contains('on')) return;
  const g=dtmGeo(); dtmR.z=g.z; dtmR.sc=g.sc; dtmEl.classList.toggle('dz',ptHeavy(1650,1200,g.sc0,g.z));
  dmFit.style.cssText='position:absolute;left:'+g.L+'px;top:'+g.top+'px;width:'+g.W+'px;height:'+g.H+'px;';
  Object.keys(dtmR.sheets).forEach(id=>{ dtmR.sheets[id].root.style.transform='scale('+g.sc+')'; });
  dmZoomBox.hidden=g.cap/g.sc0<1.06; dmZoomBox.querySelector('.zf').textContent=(Math.round(g.z*10)/10)+'×';
}
function dtmZoomTo(nz,cx,cy){
  const r=dmStage.getBoundingClientRect(), o=dtmGeo(); if(cx==null){ cx=r.left+r.width/2; cy=r.top+r.height/2; }
  const ux=(dmStage.scrollLeft+cx-r.left-o.L)/o.sc, uy=(dmStage.scrollTop+cy-r.top-o.top)/o.sc;
  dtmR.z=Math.max(1,Math.min(nz,o.cap/o.sc0)); dtmFit();
  const n=dtmGeo(); dmStage.scrollLeft=ux*n.sc+n.L-(cx-r.left); dmStage.scrollTop=uy*n.sc+n.top-(cy-r.top);
}
function dtmToast(txt,kind){ const m=document.getElementById('dmmsg'); if(!m) return; m.textContent=txt; m.className='dmmsg'+(kind?' '+kind:''); m.hidden=!txt; clearTimeout(dtmToast.t); if(txt&&kind!=='busy') dtmToast.t=setTimeout(()=>{ m.hidden=true; },4200); }
function dtmRefresh(){ if(!Object.keys(dtmR.sheets).length) return; dtmTabs(); dtmBar(); Object.keys(dtmR.sheets).forEach(id=>dtmI18n(dtmR.sheets[id])); dtmSaveText(); }
function dtmSaveText(){
  const set=(id,k)=>{ const e=document.getElementById(id); if(e) e.textContent=dtmT(k); };
  set('dmsvtitle','sv:title'); set('dmsvintro','sv:intro'); set('dmsvdl','sv:dl'); set('dmsvcopy','sv:copy'); set('dmsvimp','sv:import'); set('dmsvclose','sv:close');
  const t=document.getElementById('dmsvin'); if(t) t.placeholder=dtmT('sv:paste');
}

/* ----- ajout / suppression ----- */
function dtmAdd(){
  if(dtmS.sh.length>=DTM_MAXS){ dtmToast(dtmT('max'),'err'); return; }
  const sh=dtmNew(); dtmS.sh.push(sh); dtmActivate(dtmS.sh.length-1);
}
function dtmDel(i,btn){
  const sh=dtmS.sh[i]; if(!sh) return; const tab=btn.closest('.dmt');
  if(!dtmEmpty(sh)&&!tab.classList.contains('arm')){
    tab.classList.add('arm'); btn.title=dtmT('del2'); btn.textContent='?'; clearTimeout(dtmDel.t); dtmDel.t=setTimeout(()=>{ tab.classList.remove('arm'); btn.textContent='×'; btn.title=dtmT('del'); },3200); return;
  }
  const R=dtmR.sheets[sh.id]; if(R){ R.root.remove(); delete dtmR.sheets[sh.id]; }
  dtmS.sh.splice(i,1); if(!dtmS.sh.length) dtmS.sh.push(dtmNew());
  dtmActivate(i<dtmS.act?dtmS.act-1:Math.min(dtmS.act,dtmS.sh.length-1));
}
function dtmResetCur(){
  const sh=dtmCur(), R=dtmR.sheets[sh.id]; if(R&&R.flip) return; const n=dtmNew(); n.id=sh.id; n.side=sh.side; Object.assign(sh,n); R.nm.value=''; dtmPaint(sh); dtmTabs(); dtmSave();
}

/* ----- sauvegarde JSON ----- */
function dtmClean(sh){ return {pn:sh.pn,side:sh.side,c:sh.c,tk:sh.tk,ng:sh.ng,m:sh.m}; }
function dtmExportJSON(){ return JSON.stringify({app:'dtdb-dtm',v:1,exported:new Date().toISOString().slice(0,10),sheet:dtmClean(dtmCur())},null,1); }
function dtmOpenSave(){
  const box=document.getElementById('dmsv'); document.getElementById('dmsvout').value=dtmExportJSON(); document.getElementById('dmsvin').value=''; dtaMsg('dmsvmsg','',''); dtmSaveText(); box.hidden=false; document.getElementById('dmsvclose').focus({preventScroll:true});
}
function dtmCloseSave(){ document.getElementById('dmsv').hidden=true; }
function dtmImport(){
  const txt=document.getElementById('dmsvin').value.trim(); if(!txt){ document.getElementById('dmsvfile').click(); return; }
  let o; try{ o=JSON.parse(txt); }catch(e){ dtaMsg('dmsvmsg',dtmT('sv:bad'),'err'); return; }
  const st=o&&typeof o==='object'?(o.sheet||o):null; if(!st||!Array.isArray(st.m)||typeof st.c!=='object'){ dtaMsg('dmsvmsg',dtmT('sv:bad'),'err'); return; }
  const sh=dtmCur(), R=dtmR.sheets[sh.id]; if(R.flip) return; const n=dtmNormSheet(st,sh.id); Object.assign(sh,n); R.nm.value=sh.pn; dtmSide(sh); dtmPaint(sh); dtmI18n(R); dtmTabs(); dtmBar(); dtmSave();
  document.getElementById('dmsvout').value=dtmExportJSON(); dtaMsg('dmsvmsg',dtmT('sv:imported'),'ok');
}

/* ----- export PDF (recto + verso, la feuille jointe en JSON) ----- */
const dtmImgs={};
function dtmImg(src){ return dtmImgs[src]||(dtmImgs[src]=new Promise((ok,ko)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=ko; i.src=src; })); }
async function dtmRender(sh,side,sc){
  const [p1,p2,pl]=await Promise.all([dtmImg(DTM_A.p1),dtmImg(DTM_A.p2),dtmImg(DTM_A.plot)]), G=DTM_GEO;
  const cv=document.createElement('canvas'); cv.width=Math.round(1650*sc); cv.height=Math.round(1200*sc); const x=cv.getContext('2d'); x.scale(sc,sc);
  x.drawImage(side?p2:p1,0,0,1650,1200);
  const dot=(px,py,d)=>{ const c=DTM_COL[d-1]; x.save(); x.shadowColor=c.cg; x.shadowBlur=10; const g=x.createRadialGradient(px-4,py-5,1,px,py,13.5); g.addColorStop(0,'#fff'); g.addColorStop(.1,'#fff'); g.addColorStop(.44,c.c); g.addColorStop(1,c.cd);
    x.fillStyle=g; x.beginPath(); x.arc(px,py,13.5,0,7); x.fill(); x.shadowBlur=0; x.lineWidth=2.5; x.strokeStyle=c.cd; x.stroke(); x.restore(); };
  if(!side){
    DTM_KEYS.forEach(k=>G.cells[k].forEach((p,i)=>{ if((sh.c[k]||0)>>i&1) dot(p[0],p[1],+k.slice(-1)); }));
    sh.ng.forEach((v,i)=>{ if(v) dot(G.ng[i][0],G.ng[i][1],i+1); });
    sh.tk.forEach((v,i)=>{ if(v&&dtmGDone(sh,'feat'+(i+1))){ const f=G.feat[i]; x.save(); x.shadowColor='rgba(0,0,0,.6)'; x.shadowBlur=8; x.shadowOffsetY=5; x.drawImage(pl,f[0]+f[2]/2-42,f[1]+f[3]/2-60.5,84,121); x.restore(); } });
    if(sh.pn){ x.save(); x.beginPath(); x.rect(1425,134,208,42); x.clip(); x.font='700 31px "Barlow Condensed","Arial Narrow",Arial,sans-serif'; x.fillStyle='#111827'; x.textBaseline='middle'; x.fillText(sh.pn,1431,156); x.restore(); }
  }else{
    const hasF='filter' in x;
    G.missions.forEach((m,i)=>[m.play,m.comp,m.perf].forEach((p,j)=>{
      const on=sh.m[i]&DTM_BIT[j].b; x.save(); x.beginPath(); x.arc(p[0],p[1],18,0,7);
      if(on){ x.shadowColor=DTM_BIT[j].c; x.shadowBlur=12; x.lineWidth=2.5; x.strokeStyle=DTM_BIT[j].c; x.stroke(); }
      else{ x.clip(); if(hasF){ x.filter='grayscale(1) brightness(.72) contrast(.85)'; x.drawImage(p2,0,0,1650,1200); } else{ x.fillStyle='rgba(60,66,78,.62)'; x.fill(); } }
      x.restore();
    }));
  }
  return cv;
}
async function dtmExport(){
  const btn=document.getElementById('dmpdf'); if(btn.disabled) return; btn.disabled=true; dtmToast(dtmT('ex:busy'),'busy');
  try{
    await dtaLoadScript(DTA_LIBS.pdf,()=>window.PDFLib);
    try{ if(document.fonts&&document.fonts.ready) await document.fonts.ready; }catch(e){}
    const sh=dtmCur(), P=window.PDFLib, pdf=await P.PDFDocument.create(); pdf.setTitle('Dice Throne Missions — Perk Sheet'+(sh.pn?' — '+sh.pn.replace(/[^\x20-\x7E]/g,'?'):'')); pdf.setCreator('Dice Throne Compagnon');
    for(let s=0;s<2;s++){ const cv=await dtmRender(sh,s,1.5), page=pdf.addPage([792,576]); const jpg=await pdf.embedJpg(cv.toDataURL('image/jpeg',0.92)); page.drawImage(jpg,{x:0,y:0,width:792,height:576}); }
    try{ await pdf.attach(new TextEncoder().encode(dtmExportJSON()),'dtm-perk-sheet.json',{mimeType:'application/json',description:'Dice Throne Missions perk sheet data'}); }catch(e){}
    const bytes=await pdf.save(), nm='dtm-perk-sheet'+(sh.pn?'-'+sh.pn.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):'')+'-'+new Date().toISOString().slice(0,10)+'.pdf';
    const done=await dtaGive(nm,new Blob([bytes],{type:'application/pdf'}),'dmmsg'); dtmToast(done?dtmT('ex:ok'):'',done?'ok':'');
  }catch(e){ console.warn('dtm export',e); dtmToast(dtmT('ex:fail'),'err'); }
  btn.disabled=false;
}

/* ----- ouverture / fermeture ----- */
function dtmSel(on){ tabs.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',on?(b.dataset.pane==='dtm'?'true':'false'):(b.dataset.pane===dtmR.prev?'true':'false'))); }
function openDTM(){
  if(dtmR.open) return; dtmR.open=true;
  const sel=tabs.querySelector('[aria-selected="true"]'); dtmR.prev=sel&&sel.dataset.pane!=='dtm'?sel.dataset.pane:'heroes';
  dtmEl.classList.add('on'); dtmEl.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; dtmSel(true);
  dtmActivate(dtmS.act); document.getElementById('dmexit').focus({preventScroll:true});
}
function closeDTM(){
  if(!dtmR.open) return; dtmR.open=false; dtmCloseSave(); dtmEl.classList.remove('on'); dtmEl.setAttribute('aria-hidden','true'); document.body.style.overflow=''; showPane(dtmR.prev);
}
document.getElementById('dmexit').addEventListener('click',closeDTM);
document.getElementById('dmadd').addEventListener('click',dtmAdd);
document.getElementById('dmflip').addEventListener('click',()=>dtmFlip(dtmCur()));
document.getElementById('dmpdf').addEventListener('click',dtmExport);
document.getElementById('dmsavebtn').addEventListener('click',dtmOpenSave);
document.getElementById('dmsvclose').addEventListener('click',dtmCloseSave);
document.getElementById('dmsv').addEventListener('click',e=>{ if(e.target.id==='dmsv') dtmCloseSave(); });
document.getElementById('dmsvdl').addEventListener('click',()=>dtaGive('dtm-perk-sheet-'+new Date().toISOString().slice(0,10)+'.json',dtmExportJSON(),'dmsvmsg'));
document.getElementById('dmsvcopy').addEventListener('click',async()=>{
  const ta=document.getElementById('dmsvout'); ta.value=dtmExportJSON();
  try{ await navigator.clipboard.writeText(ta.value); dtaMsg('dmsvmsg',dtaT('sv:copied'),'ok'); }
  catch(e){ ta.focus(); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e2){} dtaMsg('dmsvmsg',ok?dtaT('sv:copied'):dtaT('sv:copyfail'),ok?'ok':'err'); }
});
document.getElementById('dmsvimp').addEventListener('click',dtmImport);
document.getElementById('dmsvfile').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; let t=''; try{ t=await f.text(); }catch(err){ dtaMsg('dmsvmsg',dtmT('sv:bad'),'err'); return; } document.getElementById('dmsvin').value=t; dtmImport(); });
document.getElementById('dmwipe').addEventListener('click',()=>{
  const b=document.getElementById('dmwipe');
  if(!b.classList.contains('armed')){ b.classList.add('armed'); b.textContent=dtmT('wipe2'); clearTimeout(dtmWipeT); dtmWipeT=setTimeout(()=>{ b.classList.remove('armed'); b.textContent=dtmT('wipe'); },3200); return; }
  clearTimeout(dtmWipeT); b.classList.remove('armed'); b.textContent=dtmT('wipe'); dtmResetCur();
});
dmTabs.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return; const i=+b.closest('.dmt').dataset.i;
  if(b.dataset.a==='sel') dtmActivate(i); else if(b.dataset.a==='del') dtmDel(i,b);
});
window.addEventListener('resize',()=>{ if(dtmR.open) dtmFit(); });
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!dtmR.open) return;
  if(!document.getElementById('dmsv').hidden){ dtmCloseSave(); return; }
  closeDTM();
});

/* ----- zoom intégré (DTM + DTA) : le pinch natif du navigateur est bloqué (il faisait crasher l'app mobile : surfaces énormes),
   le zoom se fait ici, par un facteur plafonné en pixels réels ----- */
/* plafond d'échelle : au moins ×3 par rapport à l'ajustement (demande utilisateur), davantage si le budget de ~7 Mpx réels le permet ;
   au-delà du budget « confortable » on passe en mode léger (.dz : pas d'animations/filtres/ombres) pour ménager la mémoire graphique */
function ptBudget(w,h){ return Math.sqrt(7e6/(w*h))/(window.devicePixelRatio||1); }
function ptCap(w,h,base){ return Math.max(base*3, ptBudget(w,h)); }
function ptHeavy(w,h,sc0,z){ return sc0*z>ptBudget(w,h)*1.001; }
function ptPinch(root,api){
  let g=null, raf=0, last=null;
  const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)||1;
  root.addEventListener('touchstart',e=>{ g=e.touches.length===2?{d:dist(e.touches),z:api.z()}:null; },{passive:true});
  root.addEventListener('touchmove',e=>{
    if(e.touches.length<2) return;
    e.preventDefault(); const t=e.touches; if(!g) g={d:dist(t),z:api.z()};
    last=[g.z*dist(t)/g.d,(t[0].clientX+t[1].clientX)/2,(t[0].clientY+t[1].clientY)/2];
    if(!raf) raf=requestAnimationFrame(()=>{ raf=0; if(last&&root.classList.contains('on')) api.set(last[0],last[1],last[2]); });
  },{passive:false});
  root.addEventListener('touchend',e=>{ if(e.touches.length<2) g=null; },{passive:true});
  root.addEventListener('touchcancel',()=>{ g=null; },{passive:true});
  root.addEventListener('wheel',e=>{ if(!e.ctrlKey) return; e.preventDefault(); api.set(api.z()*Math.exp(-e.deltaY*.01),e.clientX,e.clientY); },{passive:false});
  ['gesturestart','gesturechange','gestureend'].forEach(n=>root.addEventListener(n,e=>e.preventDefault(),{passive:false}));
}
ptPinch(dtmEl,{z:()=>dtmR.z,set:dtmZoomTo});
dmZoomBox.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  dtmZoomTo(b.classList.contains('zm')?dtmR.z/1.35:b.classList.contains('zp')?dtmR.z*1.35:1);
});

/* DTA : même principe */
function dtaZoomTo(nz,cx,cy){
  if(!dtaBuilt) return; const sc=dtaEl.querySelector('.dta-scroll'), f=dtaR.fit, r=f.getBoundingClientRect(), o=dtaR.scale;
  if(cx==null){ const q=sc.getBoundingClientRect(); cx=q.left+q.width/2; cy=q.top+q.height/2; }
  const ux=(cx-r.left)/o, uy=(cy-r.top)/o; dtaR.z=Math.max(1,Math.min(nz,dtaR.cap/dtaR.sc0)); dtaFit();
  const r2=f.getBoundingClientRect(); sc.scrollLeft+=r2.left+ux*dtaR.scale-cx; sc.scrollTop+=r2.top+uy*dtaR.scale-cy;
}
ptPinch(dtaEl,{z:()=>dtaR.z||1,set:dtaZoomTo});
dtaEl.insertAdjacentHTML('beforeend','<div class="dtazoom" id="dtazoom"><button type="button" class="zbtn zm" aria-label="Zoom −">−</button><button type="button" class="zbtn zf" aria-label="Zoom 1×">1×</button><button type="button" class="zbtn zp" aria-label="Zoom +">+</button></div>');
document.getElementById('dtazoom').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return; const z=dtaR.z||1;
  dtaZoomTo(b.classList.contains('zm')?z/1.35:b.classList.contains('zp')?z*1.35:1);
});
