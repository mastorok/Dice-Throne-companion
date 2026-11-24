/* Dice Throne Versus : transport pair à pair (WebRTC) pour jouer en ligne hors de claude.ai.
   Même interface que la capacité `room` de claude.ai : join(nom) rend une salle avec
   on, emit, presence, onPeers, onConnection, connected, leave.
   La signalisation passe par des brokers MQTT publics (bibliothèque Trystero, vendor/) ;
   une fois les navigateurs reliés, les données de jeu circulent directement de l'un à l'autre.
   Personne n'est hôte : la salle existe tant qu'au moins un joueur garde la page ouverte. */
(function(){
'use strict';
const CFG0={ appId:'dicethrone-companion-versus-1', lib:'vendor/trystero-mqtt.min.js', relayUrls:null, rtcConfig:null, turnConfig:null, openTimeoutMs:20000 };
const cfg=()=>Object.assign({},CFG0,window.DTVS_CFG||{});
const TOPICS={cells:1,sync:1};
const PKEYS=['r','n','s','c','a','x','y','wx','wy','v','k'];
const active=new Map();   /* nom de salle -> promesse de fin de départ (Trystero refuse deux fois la même salle) */
let libP=null;

function loadLib(){
  if(window.Trystero&&window.Trystero.joinRoom) return Promise.resolve(window.Trystero);
  if(libP) return libP;
  libP=new Promise((res,rej)=>{
    const s=document.createElement('script'); s.src=cfg().lib; s.async=true;
    s.onload=()=>window.Trystero&&window.Trystero.joinRoom?res(window.Trystero):rej(new Error('lib'));
    s.onerror=()=>rej(new Error('lib')); document.head.appendChild(s);
  });
  libP.catch(()=>{ libP=null; });
  return libP;
}
/* présence reçue d'un pair : clés connues seulement, valeurs simples et courtes */
function cleanPresence(p){
  const o={}; if(!p||typeof p!=='object') return o;
  PKEYS.forEach(k=>{
    if(!(k in p)) return; const v=p[k];
    if(v===null) o[k]=null; else if(typeof v==='number'&&isFinite(v)) o[k]=v; else if(typeof v==='string') o[k]=v.slice(0,40);
  });
  return o;
}

async function join(name){
  const T=await loadLib(); name=String(name).slice(0,64);
  if(active.has(name)) await active.get(name);
  const c=cfg(), conf={appId:c.appId};
  if(c.relayUrls) conf.relayUrls=c.relayUrls; if(c.rtcConfig) conf.rtcConfig=c.rtcConfig; if(c.turnConfig) conf.turnConfig=c.turnConfig;
  const rm=T.joinRoom(conf,name);
  const act=rm.makeAction('dtvs'), send=act[0], recv=act[1];
  const me={id:T.selfId,isMe:true,kind:'viewer',presence:{}};
  const peers=new Map(), subs={cells:new Set(),sync:new Set()}, peerCbs=new Set(), connCbs=new Set(), errCbs=new Set();
  let conn=false, dead=false, acc=null, accT=null; const t0=Date.now();
  const safe=(f,a)=>{ try{ f(a); }catch(e){ try{ console.error(e); }catch(_){} } };
  const view=(joined,left)=>({peers:[me].concat([...peers.values()]),joined:joined||[],left:left||[]});
  const notify=(joined,left)=>{ if(dead) return; const v=view(joined,left); peerCbs.forEach(f=>safe(f,v)); };
  const sendTo=(msg,target)=>{ if(dead) return Promise.resolve(); try{ return Promise.resolve(send(msg,target||null)).catch(()=>{}); }catch(e){ return Promise.resolve(); } };
  const relayOpen=()=>{ try{ return Object.values(T.getRelaySockets()||{}).some(s=>s&&s.readyState===1); }catch(e){ return false; } };
  function updConn(){ const n=relayOpen()||peers.size>0; if(n===conn) return; conn=n; connCbs.forEach(f=>safe(f,conn)); }
  const peerOf=id=>{ let p=peers.get(id); if(!p){ p={id:id,isMe:false,kind:'viewer',presence:{},seen:false}; peers.set(id,p); } return p; };
  function flushPres(){ accT=null; if(!acc) return; const p=acc; acc=null; sendTo({k:'p',p:p}); }

  rm.onPeerJoin(id=>{ if(dead) return; peerOf(id); updConn(); sendTo({k:'p',p:Object.assign({},me.presence)},id); });
  rm.onPeerLeave(id=>{ if(dead) return; const p=peers.get(id); peers.delete(id); updConn(); notify([],p?[p]:[]); });
  recv((m,id)=>{
    if(dead||!m||typeof m!=='object') return;
    if(m.k==='p'){
      const p=peerOf(id), first=!p.seen; p.seen=true; Object.assign(p.presence,cleanPresence(m.p)); notify(first?[p]:[],[]);
    } else if(m.k==='e'&&typeof m.t==='string'&&TOPICS[m.t]){
      const ev={data:m.d,sameTab:false,from:id}; subs[m.t].forEach(f=>safe(f,ev));
    }
  });
  const poll=setInterval(()=>{
    updConn();
    if(!conn&&Date.now()-t0>c.openTimeoutMs) errCbs.forEach(f=>safe(f,{code:'relay_failed',message:'Aucun relais de signalisation joignable.'}));
  },1000);

  const room={
    id:me.id,
    on(topic,cb,errCb){ const s=subs[topic]; if(!s) return ()=>{}; s.add(cb); if(errCb) errCbs.add(errCb); return ()=>{ s.delete(cb); if(errCb) errCbs.delete(errCb); }; },
    emit(topic,data){ if(!TOPICS[topic]) return Promise.reject(new Error('topic')); return sendTo({k:'e',t:topic,d:data}); },
    presence(patch){ const p=cleanPresence(patch); Object.assign(me.presence,p); acc=Object.assign(acc||{},p); if(!accT) accT=setTimeout(flushPres,40); return Promise.resolve(); },
    onPeers(cb,errCb){
      peerCbs.add(cb); if(errCb) errCbs.add(errCb);
      Promise.resolve().then(()=>{ if(!dead&&peerCbs.has(cb)) safe(cb,view([],[])); });
      return ()=>{ peerCbs.delete(cb); if(errCb) errCbs.delete(errCb); };
    },
    onConnection(cb,errCb){ connCbs.add(cb); if(errCb) errCbs.add(errCb); return ()=>{ connCbs.delete(cb); if(errCb) errCbs.delete(errCb); }; },
    connected:()=>conn,
    leave(){
      if(dead) return Promise.resolve();
      clearTimeout(accT); flushPres(); dead=true; clearInterval(poll);
      peerCbs.clear(); connCbs.clear(); errCbs.clear(); subs.cells.clear(); subs.sync.clear();
      /* délai avant un éventuel retour dans la même salle : les autres pairs doivent d'abord oublier l'ancienne connexion (même identifiant de pair) */
      const done=new Promise(res=>setTimeout(()=>{ try{ rm.leave(); }catch(e){} setTimeout(()=>{ active.delete(name); res(); },2400); },150));
      active.set(name,done); return done;
    }
  };
  room.debug=()=>({peers:Object.keys(rm.getPeers()),map:[...peers.keys()],conn:conn,sockets:Object.values(T.getRelaySockets()).map(x=>x.readyState)});
  updConn();
  window.DTVS_P2P.last=room;
  return room;
}

window.DTVS_P2P={ ok:()=>typeof RTCPeerConnection==='function', join:join };
})();
