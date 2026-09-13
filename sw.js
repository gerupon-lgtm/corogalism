/* コロガリズム: バージョン単位で全実行資材を保存。途中の資材で更新しない。 */
importScripts('./precache.js');
const CACHE = `corogalism-${self.PRECACHE_VERSION}`;
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(self.PRECACHE_FILES.map(path => new Request(path, {cache:'reload'})));
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  // 初回も制御を開始するが、ページ側は明示更新時以外リロードしない。
  for (const name of await caches.keys()) if (name.startsWith('corogalism-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'APPLY_UPDATE') return;
  event.waitUntil((async () => {
    const pages = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    if (pages.filter(c => c.url.startsWith(self.registration.scope)).length > 1) {
      event.source?.postMessage({type:'UPDATE_BLOCKED'}); return;
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache=await caches.open(CACHE);
    const root=new URL('./',self.registration.scope);
    const key = event.request.mode === 'navigate' && (url.pathname === root.pathname || url.pathname === root.pathname+'index.html')
      ? new URL('index.html', root).href : event.request;
    const saved=await cache.match(key);
    return saved || fetch(event.request);
  })());
});
