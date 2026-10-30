(async()=>{
 const output=document.getElementById('results'),ns='repere-test-'+Date.now().toString(36)+Math.random().toString(36).slice(2),a=RepereLocal.create(ns),b=RepereLocal.create(ns);let count=0;
 async function test(name,fn){try{await fn();count++;output.textContent+='PASS '+name+'\n'}catch(e){output.textContent+='FAIL '+name+' : '+e.stack+'\n';throw e}}
 const assert=(x,m)=>{if(!x)throw Error(m)},reject=async(fn,code)=>{try{await fn()}catch(e){assert(e.code===code,'Expected '+code+' got '+e.code);return}throw Error('Expected rejection')};
 await test('durable write, close and reopen',async()=>{await a.save({title:'persisted'},0);await a.close();assert((await a.get('workspace')).data.title==='persisted','reopen failed')});
 await test('atomic cross-tab compare-and-swap',async()=>{const r=await Promise.allSettled([a.save({title:'A'},1),b.save({title:'B'},1)]);assert(r.filter(x=>x.status==='fulfilled').length===1,'both writes won');assert((await a.get('workspace')).revision===2,'revision')});
 await test('previous data retained atomically',async()=>assert((await a.get('workspace')).previous.title==='persisted','previous missing'));
 await test('shared quota rejects parallel excess',async()=>{const r=await Promise.allSettled([a.reserve(150,150),b.reserve(150,150)]);assert(r.filter(x=>x.status==='fulfilled').length===1,'quota exceeded');assert((await a.get('budget')).reads===150,'counter wrong')});
 await test('quota survives reopen',async()=>{await a.close();await reject(()=>a.reserve(51,0),'repere/budget')});
 await test('one sync lease per workspace',async()=>{await a.acquire('a',false,1000000);await reject(()=>b.acquire('b',true,1000001),'repere/busy');await a.release('a');await reject(()=>b.acquire('b',true,1000002),'repere/cooldown');await b.acquire('b',true,1010001);await b.release('b')});
 await test('failed write leaves complete previous workspace',async()=>{const before=await a.get('workspace');await reject(()=>a.save({title:'lost'},0),'repere/tab');assert((await a.get('workspace')).data.title===before.data.title,'overwrote on failure')});
 await test('batched content cache persists Unicode',async()=>{await a.setMany([['object:a','é🙂'],['object:b','second']]);assert(await b.get('object:a')==='é🙂','Unicode corrupted')});
 output.textContent+='\n'+count+' TESTS PASSED';document.title=count+' IndexedDB tests passed';await a.close();await b.close();
})().catch(()=>{document.title='IndexedDB TEST FAILURE'});
