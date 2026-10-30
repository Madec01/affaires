const L=require('../src/local-db.js');
const clone=x=>x==null?x:structuredClone(x);
module.exports=function memoryStore(){
 const rows=new Map();let serial=Promise.resolve();
 const get=async k=>clone(rows.get(k)??null),set=async(k,v)=>{rows.set(k,clone(v));return clone(v)};
 const update=(k,fn)=>{const p=serial.then(async()=>set(k,fn(await get(k))));serial=p.catch(()=>{});return p};
 return {rows,get,set,update,setMany:async rows=>{for(const [k,v] of rows)await set(k,v)},
 save:(data,expected,keep=()=>true,editedAt)=>update('workspace',old=>{if((old?.revision||0)!==expected)throw Object.assign(Error('Une autre fenêtre'),{code:'repere/tab'});return {data,revision:expected+1,editedAt:editedAt===undefined?(old?.editedAt||0):editedAt,previous:old?.data&&keep(old.data,data)?old.data:old?.previous}}),
 reserve:(r,w)=>update('budget',old=>L.budgetNext(old,r,w)),
 acquire:async()=>{},renew:async()=>{},release:async()=>{}
 };
};
