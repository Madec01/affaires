/* Repère cloud protocol: incremental transport and explicit conflict resolution. */
(function(root){
 'use strict';
 const MAX_BYTES=16*1024*1024, CHUNK_CHARS=120000, MAX_CHUNKS=140;
 function canonical(data){
  const copy={...data,settings:{...data.settings}};
  delete copy.updatedAt;delete copy.lastExport;
  delete copy.settings.autoExportMinutes;delete copy.settings.warnUnexported;delete copy.settings.theme;delete copy.settings.elementSections;
  const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,stable(v[k])])):v;
  return JSON.stringify(stable(copy));
 }
 async function digest(text){const bytes=new TextEncoder().encode(text);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('')}
 function split(raw){
  if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Object.assign(Error('La synchronisation accepte jusqu’à 16 Mio de données. Vos données locales sont conservées et restent exportables.'),{code:'repere/size'});
  const chunks=[];for(let i=0;i<raw.length;){let end=Math.min(i+CHUNK_CHARS,raw.length);if(end<raw.length&&/[\uD800-\uDBFF]/.test(raw[end-1]))end--;chunks.push(raw.slice(i,end));i=end}return chunks;
 }
 function validMeta(m){
  if(!m||m.format!==1||!Number.isSafeInteger(m.revision)||m.revision<1||!Number.isInteger(m.chunks)||m.chunks<1||m.chunks>MAX_CHUNKS||!/^[a-f0-9]{64}$/.test(m.hash||''))throw Object.assign(Error('Le format des données synchronisées est inconnu. Aucune donnée ne sera remplacée.'),{code:'repere/format'});
  return m;
 }
 function decide(localHash,base,remote,hasContent){
  if(base&&remote&&remote.revision<base.revision)return 'conflict';
  if(remote&&remote.hash===localHash)return 'ack';
  if(!base){if(remote)return hasContent?'conflict':'pull';return hasContent?'initial':'empty'}
  if(!remote){if(base.revision>0)return 'conflict';return localHash===base.hash?'empty':'push'}
  if(remote.revision===base.revision&&remote.hash===base.hash)return localHash===base.hash?'ack':'push';
  if(localHash===base.hash)return 'pull';
  if(remote.hash===base.hash)return 'push';
  return 'conflict';
 }
 function createController(io){
  let base=io.base||null,stopped=false,busy=false,again=false,status='loading',remote=null,error='',pending=true,resumeChoice=null;
  const view=()=>({status,base,remote,error,busy,pending});
  function emit(next,message=''){status=next;error=message;io.onState(view())}
  async function ack(meta,hash){base={revision:meta?.revision||0,hash};await io.saveMeta(base)}
  async function run(){
   if(stopped)return;
   if(resumeChoice&&!busy){const choice=resumeChoice;resumeChoice=null;status=remote?'conflict':'initial';return resolve(choice.direction,choice.observed)}
   if(busy){again=true;return}
   if(io.blocked()){pending=true;emit('blocked');return}
   if(!io.online()){emit('offline');return}
   busy=true;again=false;emit('syncing');
   try{
    const next=await io.read();if(stopped)return;remote=next;
    // Capture local state AFTER the network read: edits made during the read count.
    const data=io.local(),raw=canonical(data),hash=await digest(raw);if(stopped)return;
    if(canonical(io.local())!==raw){again=true;return}
    const choice=decide(hash,base,next?.meta||null,io.hasContent(data));
    pending=!['ack','empty','pull'].includes(choice);
    if(choice==='conflict'||choice==='initial'){pending=true;emit(choice);return}
    if(choice==='pull'){
     if(io.editing()){pending=true;emit('remote');return}
     if(io.blocked()||canonical(io.local())!==raw){again=true;return}
     // Local durable commit must finish before acknowledging remote data.
     await io.apply(next.data);if(stopped)return;await ack(next.meta,next.meta.hash);pending=false;emit('synced');return;
    }
    if(choice==='ack'||choice==='empty'){await ack(next?.meta,hash);pending=canonical(io.local())!==raw;if(pending)again=true;emit(pending?'pending':'synced');return}
    const chunks=split(raw),expected=next?.meta||null;
    const written=await io.write({raw,chunks,hash},expected);if(stopped)return;
    await ack(written,hash);
    pending=canonical(io.local())!==raw;
    if(pending)again=true;emit(pending?'pending':'synced');
   }catch(e){
    if(stopped)return;
    pending=true;
    if(e.code==='repere/budget'){emit('paused',io.errorText(e));io.schedule(Math.max(10000,e.retryAt-Date.now()))}
    else if(e.code==='repere/conflict'){again=true;emit('pending')}
    else emit(!io.online()||['unavailable','deadline-exceeded'].includes(e.code)?'offline':'error',io.errorText(e));
   }finally{busy=false;if(!stopped){io.onState(view());if(again)io.schedule()}}
  }
  async function resolve(direction,observed){
   if(stopped||busy||!['conflict','initial'].includes(status))return false;
   // The user chose the displayed revision. Do not silently accept a newer one.
   const expected=observed===undefined?(remote?.meta||null):observed;
   if(!io.online()){emit('offline');return false}
   if(io.blocked()){emit('blocked');return false}
   busy=true;emit('syncing');
   try{
    const next=await io.read();if(stopped)return false;
    if((next?.meta.revision||0)!==(expected?.revision||0)||(next?.meta.hash||'')!==(expected?.hash||'')){remote=next;emit('conflict','Une autre modification est arrivée. Comparez à nouveau les deux versions.');return false}
    const data=io.local(),raw=canonical(data),hash=await digest(raw);if(stopped)return false;
    if(canonical(io.local())!==raw){emit('conflict','Votre version locale a changé. Recommencez le choix.');return false}
    if(direction==='remote'){
     if(!next)throw Error('La copie en ligne a été supprimée. Exportez votre copie locale avant de décider de la republier.');
     await io.preserve(data,'local');if(stopped)return false;if(io.blocked()||canonical(io.local())!==raw)throw Error('La copie locale a changé. Recommencez le choix.');await io.apply(next.data);if(stopped)return;await ack(next.meta,next.meta.hash);pending=false;emit('synced');
    }else if(direction==='local'){
     if(next)await io.preserve(next.data,'remote');if(stopped)return false;
     const chunks=split(raw),written=await io.write({raw,chunks,hash},expected);if(stopped)return false;
     await ack(written,hash);pending=canonical(io.local())!==raw;emit(pending?'pending':'synced');if(pending)again=true;
    }else throw Error('Choix de résolution inconnu.');
    return true;
   }catch(e){if(!stopped){pending=true;if(e.code==='repere/budget'){resumeChoice={direction,observed:expected};emit('paused',io.errorText(e));io.schedule(Math.max(10000,e.retryAt-Date.now()))}
    else if(e.code==='repere/conflict'){again=true;emit('pending')}else emit('error',io.errorText(e))}return false}
   finally{busy=false;if(!stopped){io.onState(view());if(again)io.schedule()}}
  }
  return {run,resolve,view,stop(){stopped=true},changed(){if(stopped)return;pending=true;if(!['conflict','initial'].includes(status))emit('pending');io.schedule()}};
 }
 const api={canonical,digest,split,validMeta,decide,createController,MAX_BYTES,MAX_CHUNKS};
 root.RepereSync=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
