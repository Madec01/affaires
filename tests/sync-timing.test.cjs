const {test}=require('node:test'),assert=require('node:assert/strict');
const {environment}=require('./app-harness.cjs');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r))};
function clock(){
 let now=1000000,id=0;const timers=new Map();
 const set=(fn,delay=0,interval=0)=>{const key=++id;timers.set(key,{fn,at:now+delay,interval});return key};
 class DateFake extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 return {now:()=>now,runtime:{Date:DateFake,setTimeout:(fn,ms)=>set(fn,ms),clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>set(fn,ms,ms),clearInterval:id=>timers.delete(id)},
 next:id=>timers.get(id)?.at,
 async advance(ms){const end=now+ms;let iterations=0;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;if(++iterations>10000)throw Error('timer loop');const [key,t]=next;now=t.at;timers.delete(key);if(t.interval)timers.set(key,{...t,at:now+t.interval});await t.fn();await flush()}now=end;await flush()}}
}
async function fixture(){
 const c=clock(),e=environment('https:',c.runtime);await e.a.localLoad();e.a.cloudSetLocked(false);let calls=0;
 Object.assign(e.a.cloud,{user:{uid:e.a.owner},view:{status:'synced',pending:false,busy:false},controller:{changed(){e.a.cloud.view.status='pending';e.a.cloud.view.pending=true;e.a.cloudSchedule()},async run(){calls++;e.a.cloud.view={status:'synced',pending:false,busy:false};e.a.cloud.lastEditAt=0},stop(){}}});
 return {e,c,calls:()=>calls,async edit(text){const d=e.a.getData();d.captures=[{id:'test',text}];e.a.setData(d);await e.a.persist()}};
}
test('automatic upload occurs at 3 minutes, not earlier',async()=>{const f=await fixture();await f.edit('first');assert.equal(f.c.next(f.e.a.cloud.timer),f.c.now()+180000);await f.c.advance(179999);assert.equal(f.calls(),0);await f.c.advance(1);assert.equal(f.calls(),1)});
test('each business edit resets full inactivity period',async()=>{const f=await fixture();await f.edit('first');await f.c.advance(120000);await f.edit('second');await f.c.advance(179999);assert.equal(f.calls(),0);await f.c.advance(1);assert.equal(f.calls(),1)});
test('local theme/backup preferences do not postpone a pending business upload',async()=>{const f=await fixture();await f.edit('first');const due=f.c.next(f.e.a.cloud.timer);await f.c.advance(60000);f.e.a.getData().settings.theme='dark';await f.e.a.persist();assert.equal(f.c.next(f.e.a.cloud.timer),due);await f.c.advance(120000);assert.equal(f.calls(),1)});
test('automatic visibility/reconnect/manual-scheduler events cannot send early',async()=>{const f=await fixture();await f.edit('first');await f.c.advance(10000);for(let i=0;i<5;i++)await f.e.a.cloudRun(false);assert.equal(f.calls(),0);assert.equal(f.c.next(f.e.a.cloud.timer),1000000+180000);await f.c.advance(170000);assert.equal(f.calls(),1)});
test('explicit manual save bypasses the inactivity delay',async()=>{const f=await fixture();await f.edit('first');await f.c.advance(1000);await f.e.a.cloudRun(true);assert.equal(f.calls(),1);await f.c.advance(300000);assert.equal(f.calls(),1)});
test('inactivity timestamp survives IndexedDB reload',async()=>{const f=await fixture();await f.edit('first');const row=await f.e.a.localState.store.get('workspace');assert.equal(row.editedAt,f.c.now());await f.c.advance(60000);f.e.a.cloud.lastEditAt=0;await f.e.a.localLoad();assert.equal(f.e.a.cloud.lastEditAt,row.editedAt);f.e.a.cloudSchedule(0);assert.equal(f.c.next(f.e.a.cloud.timer),row.editedAt+180000)});
function listenSDK(){let callback,stopped=0,opened=0;return {sdk:{onSnapshot(ref,opts,next,error){opened++;callback=next;return ()=>stopped++}},emit(meta,{fromCache=false,hasPendingWrites=false}={}){callback({metadata:{fromCache,hasPendingWrites},exists:()=>!!meta,data:()=>meta})},stats:()=>({opened,stopped})}}
const meta=(revision=1)=>({format:2,revision,hash:String(revision).repeat(64),index:JSON.stringify([{key:'root',hash:'a'.repeat(64),parts:1}])});
test('one root listener ignores cache, metadata duplicates and own acknowledged version',async()=>{const f=await fixture(),l=listenSDK();Object.assign(f.e.a.cloud,{sdk:l.sdk,transport:{root:'root'},view:{status:'synced',pending:false,busy:false,base:{revision:1,hash:'1'.repeat(64)}}});await f.e.a.cloudWatchStart();await f.e.a.cloudWatchStart();assert.equal(l.stats().opened,1);l.emit(meta(1),{fromCache:true});l.emit(meta(1));l.emit(meta(1));await flush();assert.equal(f.e.a.cloud.remoteNotice,null);assert.equal((await f.e.a.localState.store.get('budget')).reads,1);await f.c.advance(300000);assert.equal(f.calls(),0);assert.equal(l.stats().opened,1)});
test('remote update triggers automatic reception without manual button',async()=>{const f=await fixture(),l=listenSDK();Object.assign(f.e.a.cloud,{sdk:l.sdk,transport:{root:'root'}});await f.e.a.cloudWatchStart();l.emit(meta(2));await flush();assert.equal(f.e.a.cloud.remoteNotice.meta.revision,2);await f.c.advance(0);assert.equal(f.calls(),1)});
test('remote notification cannot shorten the local 3-minute debounce',async()=>{const f=await fixture(),l=listenSDK();Object.assign(f.e.a.cloud,{sdk:l.sdk,transport:{root:'root'}});await f.edit('local');await f.e.a.cloudWatchStart();await f.c.advance(60000);l.emit(meta(2));await flush();assert.equal(f.c.next(f.e.a.cloud.timer),1000000+180000);await f.c.advance(119999);assert.equal(f.calls(),0);await f.c.advance(1);assert.equal(f.calls(),1)});
test('signout/hidden stop callbacks and failed budget detaches listener',async()=>{const f=await fixture(),l=listenSDK();Object.assign(f.e.a.cloud,{sdk:l.sdk,transport:{root:'root'}});await f.e.a.cloudWatchStart();f.e.a.cloudWatchStop();l.emit(meta());await flush();assert.equal(f.e.a.cloud.remoteNotice,null);assert.equal(l.stats().stopped,1);f.e.ctx.document.visibilityState='hidden';await f.e.a.cloudWatchStart();assert.equal(l.stats().opened,1);f.e.ctx.document.visibilityState='visible';await f.e.a.cloudWatchStart();l.emit(meta());await flush();f.e.a.localState.store.reserve=async()=>{throw Object.assign(Error('cap'),{code:'repere/budget',retryAt:f.c.now()+300000})};l.emit(meta(2));await flush();assert.equal(f.e.a.cloud.view.status,'paused');assert.equal(l.stats().stopped,2)});
function backend(){
 const docs=new Map(),listeners=new Set(),stats={reads:0,writes:0};
 const snapshot=ref=>({metadata:{fromCache:false,hasPendingWrites:false},exists:()=>docs.has(ref),data:()=>structuredClone(docs.get(ref))});
 const notify=ref=>{for(const l of listeners)if(l.ref===ref){stats.reads++;queueMicrotask(()=>{if(listeners.has(l))l.fn(snapshot(ref))})}};
 const commit=rows=>{for(const [ref,value] of rows){docs.set(ref,structuredClone(value));stats.writes++;notify(ref)}};
 const sdk={doc:(first,...args)=>typeof first==='string'?first+'/'+args.join('/'):args.join('/'),
 getDocFromServer:async ref=>{stats.reads++;return snapshot(ref)},
 onSnapshot:(ref,opts,fn)=>{const l={ref,fn};listeners.add(l);stats.reads++;queueMicrotask(()=>{if(listeners.has(l))fn(snapshot(ref))});return ()=>listeners.delete(l)},
 writeBatch:()=>{const rows=[];return {set:(ref,data)=>rows.push([ref,data]),commit:async()=>commit(rows)}},
 runTransaction:async(fire,fn)=>{const rows=[],result=await fn({get:async ref=>{stats.reads++;return snapshot(ref)},set:(ref,data)=>rows.push([ref,data])});commit(rows);return result},signOut:async()=>{}};
 return {sdk,stats,listeners};
}
test('two authenticated devices: save automatically after inactivity, receive and stay idle',async()=>{
 const c=clock(),server=backend(),a=environment('https:',c.runtime),b=environment('https:',c.runtime);
 for(const e of [a,b]){Object.assign(e.a.cloud,{sdk:server.sdk,fire:{},auth:{}});await e.a.cloudAuthChanged({uid:e.a.owner,email:'test@example.invalid'})}
 await c.advance(0);assert.equal(a.a.cloud.view.status,'synced');assert.equal(b.a.cloud.view.status,'synced');
 const d=a.a.getData();d.captures=[{id:'auto',text:'Reçu automatiquement'}];a.a.setData(d);await a.a.persist();
 await c.advance(120000);d.captures[0].text='Dernière modification';await a.a.persist();
 await c.advance(179999);assert.equal(b.a.getData().captures.length,0);assert.equal(server.stats.writes,0);
 await c.advance(1);assert.equal(a.a.cloud.view.status,'synced');assert.equal(b.a.cloud.view.status,'synced');assert.equal(b.a.getData().captures[0].text,'Dernière modification');
 const counts={...server.stats};await c.advance(300000);assert.deepEqual(server.stats,counts,'no idle reads or writes');
 for(const e of [a,b]){e.a.cloudWatchStop();e.a.cloud.controller.stop()}
});
test('delayed old server notification cannot replace a newer acknowledged revision',async()=>{const f=await fixture(),l=listenSDK();Object.assign(f.e.a.cloud,{sdk:l.sdk,transport:{root:'root'},view:{status:'synced',pending:false,busy:false,base:{revision:3,hash:'3'.repeat(64)}}});await f.e.a.cloudWatchStart();l.emit(meta(2));await flush();assert.equal(f.e.a.cloud.remoteNotice,null);await f.c.advance(100000);assert.equal(f.calls(),0)});
