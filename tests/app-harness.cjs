const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),clone=x=>JSON.parse(JSON.stringify(x));
function environment(protocol='https:',runtime={}){
 const values=new Map(),nodes=new Map(),events={};
 function node(){return {innerHTML:'',childNodes:[],dataset:{},style:{},inert:false,hidden:false,classList:{toggle(){}},replaceChildren(){this.innerHTML=''},toggleAttribute(){},setAttribute(){},removeAttribute(){},addEventListener(){},getClientRects(){return []},matches(){return false},focus(){},append(){},remove(){}}}
 const doc={activeElement:null,visibilityState:'visible',body:node(),documentElement:node(),getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector:s=>s.startsWith('#')&&!s.includes(' ')?doc.getElementById(s.slice(1)):null,querySelectorAll:()=>[],addEventListener:(type,fn)=>{(events[type]??=[]).push(fn)},contains:()=>true,createElement:()=>node()};
 const ctx=vm.createContext({console,URL,Blob,TextEncoder,TextDecoder,crypto:require('node:crypto').webcrypto,location:{protocol},navigator:{onLine:true},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)},document:doc,window:{addEventListener(type,fn){(events['window:'+type]??=[]).push(fn)},getSelection(){return {rangeCount:0}}},setTimeout:()=>1,clearTimeout(){},clearInterval(){},setInterval:()=>1,innerWidth:1200,innerHeight:800,...runtime});
 let code=fs.readFileSync(path.join(root,'src/app.js'),'utf8').replace('/*CLOUD_CORE*/',fs.readFileSync(path.join(root,'src/cloud-core.js'),'utf8')).replace('/*LOCAL_DB*/',fs.readFileSync(path.join(root,'src/local-db.js'),'utf8')).replace('/*CLOUD_TRANSPORT*/',fs.readFileSync(path.join(root,'src/cloud-transport.js'),'utf8')).replace('/*CLOUD_UI*/',fs.readFileSync(path.join(root,'src/cloud-ui.js'),'utf8')).replace(/\ncloudInit\(\);\s*$/,'');
 // Keep real data, auth, save and transport functions. DOM rendering is checked in browser QA.
 code=code.replace("function render(){\n", "function render(){return;\n");
 vm.runInContext(code,ctx);
 vm.runInContext("cloudRefresh=()=>{};globalThis.api={cloud,cloudAuthChanged,cloudTransport,cloudApply,cloudPreserve,cloudReadMeta,cloudRun,cloudSchedule,cloudChanged,cloudWatchStart,cloudWatchStop,localLoad,localState,emptyDB,validateDB,prepareRecords,persist,exportData,backupFingerprint,autoExportTick,cloudSetLocked,getData:()=>db,setData:d=>{db=d;dirty=true},store:STORE,meta:CLOUD_META,owner:CLOUD_OWNER,S:RepereSync,isDirty:()=>dirty,isLocked:()=>cloud.locked,setConflict:()=>{conflict=true},setError:()=>{storageError='quota'}}",ctx);
 ctx.api.localState.store=require('./memory-store.cjs')();
 return {ctx,a:ctx.api,values,nodes,events,run:s=>vm.runInContext(s,ctx)};
}
function fakeSDK(){
 const docs=new Map(),stats={reads:0,commits:0,signOut:0},sdk={doc:(first,...args)=>typeof first==='string'?first+'/'+args.join('/'):args.join('/'),onSnapshot:()=>()=>{},signOut:async()=>{stats.signOut++},runTransaction:async(_,fn)=>{
  const writes=[];const result=await fn({get:async ref=>{stats.reads++;return {exists:()=>docs.has(ref),data:()=>clone(docs.get(ref))}},set:(ref,value)=>writes.push([ref,clone(value)]),delete:ref=>writes.push([ref,null])});
  for(const [ref,value] of writes){if(value===null)docs.delete(ref);else docs.set(ref,value)}if(writes.length)stats.commits++;return result;
 }};return {docs,stats,sdk};
}


module.exports={environment,fakeSDK};
