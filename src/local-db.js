/* Durable local data, shared-tab compare-and-swap and request budgets. No network. */
(function(root){
 'use strict';
 const WINDOW=300000,READ_LIMIT=200,WRITE_LIMIT=200;
 const failure=(message,code,extra={})=>Object.assign(Error(message),{code,...extra});
 function budgetNext(old,reads,writes,now=Date.now()){
  const events=(old?.events||[]).filter(e=>e.at>now-WINDOW),r=events.reduce((s,e)=>s+e.reads,0),w=events.reduce((s,e)=>s+e.writes,0);
  if(r+reads>READ_LIMIT||w+writes>WRITE_LIMIT)throw failure('Pause du quota de sécurité : les données restent dans IndexedDB. Reprise possible dans quelques minutes.','repere/budget',{retryAt:(events[0]?.at||now)+WINDOW+100});
  if(reads||writes)events.push({at:now,reads,writes});return {events,reads:r+reads,writes:w+writes};
 }
 function create(namespace,factory=root.indexedDB){
  let opened;
  function open(){if(!opened)opened=new Promise((resolve,reject)=>{
   if(!factory){reject(failure('IndexedDB est indisponible. Exportez vos données et utilisez un navigateur autorisant le stockage local.','repere/local'));return}
   const q=factory.open('repere-indexeddb-v1',1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('kv'))q.result.createObjectStore('kv')};q.onerror=()=>{opened=null;reject(q.error)};q.onblocked=()=>reject(failure('Fermez les autres onglets Repère pour ouvrir IndexedDB.','repere/local'));
   q.onsuccess=()=>{q.result.onversionchange=()=>{q.result.close();opened=null};resolve(q.result)};
  });return opened}
  const key=k=>namespace+':'+k;
  async function tx(mode,operation){const db=await open();return new Promise((resolve,reject)=>{
   let t;try{t=db.transaction('kv',mode,{durability:'strict'})}catch{t=db.transaction('kv',mode)}
   let result,error;const store=t.objectStore('kv');
   t.oncomplete=()=>resolve(result);t.onabort=()=>reject(error||t.error||failure('Écriture IndexedDB interrompue.','repere/local'));t.onerror=()=>{};
   const done=v=>{result=v},fail=e=>{error=e;t.abort()};try{operation(store,done,fail)}catch(e){fail(e)}
  })}
  const get=k=>tx('readonly',(s,done)=>{const q=s.get(key(k));q.onsuccess=()=>done(q.result??null)});
  const set=(k,v)=>tx('readwrite',(s,done)=>{s.put(v,key(k));done(v)});
  const setMany=rows=>tx('readwrite',s=>{for(const [k,v] of rows)s.put(v,key(k))});
  const update=(k,fn)=>tx('readwrite',(s,done,fail)=>{const q=s.get(key(k));q.onsuccess=()=>{try{const v=fn(q.result??null);s.put(v,key(k));done(v)}catch(e){fail(e)}}});
  const save=(data,expected,keepPrevious=()=>true)=>update('workspace',old=>{
   if((old?.revision||0)!==expected)throw failure('Une autre fenêtre a modifié les données locales. Exportez cette session avant de recharger.','repere/tab');
   return {data,revision:expected+1,previous:old?.data&&keepPrevious(old.data,data)?old.data:(old?.previous||null),savedAt:Date.now()};
  });
  const reserve=(reads,writes,now=Date.now())=>update('budget',old=>budgetNext(old,reads,writes,now));
  const acquire=(owner,manual=false,now=Date.now())=>update('lease',old=>{
   if(old?.owner&&old.owner!==owner&&old.until>now)throw failure('Une autre fenêtre synchronise déjà cet espace.','repere/busy');
   if(old?.lastAt&&now-old.lastAt<(manual?10000:60000))throw failure('Les demandes rapprochées sont regroupées.','repere/cooldown',{retryAt:old.lastAt+(manual?10000:60000)});
   return {owner,until:now+120000,lastAt:now};
  });
  const renew=owner=>update('lease',old=>{if(old?.owner!==owner||old.until<Date.now())throw failure('La session de synchronisation a expiré.','repere/busy');return {...old,until:Date.now()+120000}});
  const release=owner=>update('lease',old=>old?.owner===owner?{...old,owner:null,until:0}:old);
  return {get,set,setMany,update,save,reserve,acquire,renew,release,close:async()=>{if(opened)(await opened).close();opened=null}};
 }
 const api={create,budgetNext,WINDOW,READ_LIMIT,WRITE_LIMIT};root.RepereLocal=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
