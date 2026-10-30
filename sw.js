/* Cache only the public application shell. Business data stays in IndexedDB. */
const VERSION='1.28';
const BASE=self.registration.scope;
const PREFIX='repere-shell-'+new URL(BASE).pathname+'-';
const CACHE=PREFIX+VERSION;
const APP=new URL('Repere_Affaires_V1.html',BASE).href;
const FILES=['Repere_Affaires_V1.html','index.html','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png','assets/icon-maskable.png'].map(p=>new URL(p,BASE).href);
const SDK=['app','auth','firestore'].map(name=>'https://www.gstatic.com/firebasejs/13.1.0/firebase-'+name+'.js');
const STATIC=new Set([...FILES,...SDK]);
function appNavigation(url){return url.origin===new URL(BASE).origin&&[new URL(BASE).pathname,new URL(APP).pathname,new URL('index.html',BASE).pathname].includes(url.pathname)}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll([...FILES,...SDK].map(url=>new Request(url,{cache:'reload'})))} )()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET')return;
 if(req.mode==='navigate'&&appNavigation(url)){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   // The cached shell belongs to this worker version. Updates activate together,
   // only after the user's local edits have been saved.
   const cached=await cache.match(APP);if(cached)return cached;
   return fetch(req);
  })());return;
 }
 if(!STATIC.has(url.href))return; // Never intercept Firestore, Authentication or document links.
 event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(req);if(cached)return cached;const response=await fetch(req);if(response.ok&&response.type!=='opaque')await cache.put(req,response.clone());return response})());
});
