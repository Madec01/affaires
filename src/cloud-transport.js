/* Immutable per-record objects. One small manifest read; only missing hashes downloaded. */
(function(root){
 'use strict';
 const COLLECTIONS=['projects','tasks','pages','documents','captures','contacts','companies','elements','elementTypes'];
 const fail=(m,c='repere/format')=>Object.assign(Error(m),{code:c});
 async function encode(data){
  const normalized=JSON.parse(RepereSync.canonical(data)),header={...normalized,order:{}},records=[];
  for(const name of COLLECTIONS){header.order[name]=[];for(const item of normalized[name]||[]){const key=name+'~'+item.id;header.order[name].push(key);records.push([key,JSON.stringify(item)])}delete header[name]}
  records.push(['root',JSON.stringify(header)]);
  const entries=[],objects=new Map();
  for(const [key,raw] of records){const hash=await RepereSync.digest(raw),parts=RepereSync.split(raw);entries.push({key,hash,parts:parts.length});parts.forEach((text,i)=>objects.set(hash+'_'+i,text))}
  return {entries,objects,raw:RepereSync.canonical(data),hash:await RepereSync.digest(RepereSync.canonical(data))};
 }
 function manifest(m){
  if(!m||m.format!==2||!Number.isSafeInteger(m.revision)||m.revision<1||!/^[a-f0-9]{64}$/.test(m.hash||'')||typeof m.index!=='string'||new TextEncoder().encode(m.index).length>700000)throw fail('Format Firebase inconnu ou index trop volumineux. La copie locale est conservée.');
  const entries=JSON.parse(m.index),keys=new Set();if(!Array.isArray(entries)||!entries.length)throw fail('Index Firebase vide.');
  for(const e of entries){if(!e||typeof e.key!=='string'||keys.has(e.key)||!/^[a-f0-9]{64}$/.test(e.hash)||!Number.isInteger(e.parts)||e.parts<1||e.parts>RepereSync.MAX_CHUNKS)throw fail('Index Firebase invalide.');keys.add(e.key)}
  if(!keys.has('root'))throw fail('Index Firebase incomplet.');return {...m,entries};
 }
 async function decode(meta,read){
  const records=new Map();for(const e of meta.entries){let raw='';for(let i=0;i<e.parts;i++)raw+=await read(e.hash+'_'+i);if(await RepereSync.digest(raw)!==e.hash)throw fail('Le contrôle d’intégrité d’un élément Firebase a échoué.');records.set(e.key,JSON.parse(raw))}
  const header=records.get('root'),data={...header};delete data.order;
  if(!header?.order)throw fail('Ordre des éléments absent.');
  for(const name of COLLECTIONS){if(!Array.isArray(header.order[name]))throw fail('Collection Firebase invalide.');data[name]=header.order[name].map(key=>{if(!key.startsWith(name+'~')||!records.has(key))throw fail('Élément Firebase manquant.');return records.get(key)})}
  if(await RepereSync.digest(RepereSync.canonical(data))!==meta.hash)throw fail('Le contrôle d’intégrité de la base Firebase a échoué.');return data;
 }
 function create({sdk,fire,userId,cache,local,valid=x=>x,active=()=>true}){
  const ref=sdk.doc(fire,'users',userId,'sync','state'),part=id=>sdk.doc(ref,'objects',id);
  const check=()=>{if(!active())throw fail('Session interrompue.','repere/stopped')};
  const reserve=async(r,w)=>{check();await cache.reserve(r,w);check()};
  async function seed(){const bundle=await encode(local());check();await cache.setMany([...bundle.objects].map(([id,text])=>['object:'+id,text]));return bundle}
  async function read(){
   await seed();await reserve(1,0);const snapshot=await sdk.getDocFromServer(ref);check();if(!snapshot.exists())return null;
   const meta=manifest(snapshot.data());
   const data=await decode(meta,async id=>{
    let text=await cache.get('object:'+id);check();if(text!==null)return text;
    await reserve(1,0);const s=await sdk.getDocFromServer(part(id));check();if(!s.exists()||typeof s.data().text!=='string')throw fail('Copie Firebase incomplète.');text=s.data().text;await cache.set('object:'+id,text);return text;
   });valid(data);return {meta,data};
  }
  async function write(payload,expected){
   const bundle=await encode(JSON.parse(payload.raw)),index=JSON.stringify(bundle.entries);
   if(new TextEncoder().encode(index).length>700000)throw fail('L’index de synchronisation est trop volumineux. Exportez votre copie locale.','repere/size');
   const known=new Set();for(const e of expected?.entries||[])for(let i=0;i<e.parts;i++)known.add(e.hash+'_'+i);
   const staged=new Set((await cache.get('uploaded'))||[]),missing=[...bundle.objects].filter(([id])=>!known.has(id)&&!staged.has(id));
   for(let i=0;i<missing.length;i+=10){
    const batchRows=missing.slice(i,i+10);await reserve(0,batchRows.length);const batch=sdk.writeBatch(fire);for(const [id,text] of batchRows)batch.set(part(id),{text});await batch.commit();check();
    batchRows.forEach(([id])=>staged.add(id));await cache.set('uploaded',[...staged]);
   }
   await reserve(2,1); // At most two transaction attempts. Conservative reservation.
   const written=await sdk.runTransaction(fire,async tx=>{
    check();const s=await tx.get(ref),current=s.exists()?manifest(s.data()):null;
    if((current?.revision||0)!==(expected?.revision||0)||(current?.hash||'')!==(expected?.hash||''))throw fail('Une autre modification est arrivée sur Firebase.','repere/conflict');
    check();const meta={format:2,revision:(current?.revision||0)+1,hash:bundle.hash,index,updatedAt:new Date().toISOString()};tx.set(ref,meta);return manifest(meta);
   },{maxAttempts:2});
   check();await cache.setMany([...bundle.objects].map(([id,text])=>['object:'+id,text]));return written;
  }
  return {read,write,root:ref};
 }
 const api={create,encode,manifest,decode,COLLECTIONS};root.RepereTransport=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
