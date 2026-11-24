const CACHE='nexa-app-v085';
const SHELL=['/','/manifest.json','/icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nexa-app-')&&key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  // Tiles and all third-party resources bypass the service worker. This preserves
  // the browser's normal Referer behavior and avoids opaque cross-origin caching.
  if(url.origin!==self.location.origin || request.method!=='GET' || url.pathname.startsWith('/api/') || url.pathname==='/console' || /\.(html|js|css)$/.test(url.pathname)) return;
  event.respondWith(fetch(request).then(response=>{
    if(response && response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  }).catch(()=>caches.match(request).then(cached=>cached || caches.match('/'))));
});
