import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : path.join(dir, e.name))),
    )
  ).flat();
}
const files = (await walk('dist')).filter((p) => !p.endsWith('sw.js')).sort();
const hash = createHash('sha256');
hash.update(await readFile(new URL(import.meta.url)));

for (const file of files) hash.update(await readFile(file));
const version = hash.digest('hex').slice(0, 16);
const urls = files.map((f) => '/' + path.relative('dist', f).split(path.sep).join('/'));
const coreUrls = urls.filter((url) => !url.startsWith('/effects/'));
const effectUrls = urls.filter((url) => url.startsWith('/effects/'));
await writeFile(
  'dist/sw.js',
  `/* Generated from every build asset, including replacement images and sounds. */
const CACHE_PREFIX='no-roulette-safari-v2-';
const LEGACY_CACHE_PREFIX='no-roulette-';
const CACHE=CACHE_PREFIX+'${version}';
const PRECACHE=${JSON.stringify(coreUrls)};
const EFFECTS=new Set(${JSON.stringify(effectUrls)});
function withoutRedirect(response){
  if(!response.redirected)return response;
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers});
}
async function fetchForCache(url){
  const request=new Request(url);
  const fetchUrl=url==='/index.html'?'/':url;
  const response=await fetch(new Request(fetchUrl,{cache:'reload',redirect:'follow'}));
  if(!response.ok)throw new Error('Precache failed: '+url+' ('+response.status+')');
  return [request,withoutRedirect(response)];
}
async function safeResponse(responsePromise){
  return withoutRedirect(await responsePromise);
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{
    const entries=await Promise.all(PRECACHE.map(fetchForCache));
    await Promise.all(entries.map(([request,response])=>cache.put(request,response)));
    await self.skipWaiting();
  }catch(error){
    await caches.delete(CACHE);
    throw error;
  }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const older=(await caches.keys()).filter(key=>key!==CACHE&&(key.startsWith(CACHE_PREFIX)||key.startsWith(LEGACY_CACHE_PREFIX)));
  const previous=older.filter(key=>key.startsWith(CACHE_PREFIX)).at(-1);
  await Promise.all(older.filter(key=>key!==previous).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const effectPath=url.pathname==='/effects/'?'/effects/index.html':url.pathname;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(EFFECTS.has(effectPath)){
      const key=new Request(effectPath);
      const cached=await cache.match(key);
      if(cached)return safeResponse(Promise.resolve(cached));
      try{
        const response=await safeResponse(fetch(event.request));
        if(response.ok){
          try{await cache.put(key,response.clone());}catch{/* Continue if storage is full. */}
        }
        return response;
      }catch(error){
        if(event.request.mode!=='navigate')throw error;
        return new Response('<!doctype html><meta charset="utf-8"><html lang="ja"><title>オフライン</title><p>演出プレビューはオンラインで一度開いてください。</p><a href="/">ルーレットに戻る</a></html>',{status:503,headers:{'content-type':'text/html; charset=utf-8'}});
      }
    }
    if(event.request.mode==='navigate'){
      const shell=await cache.match('/index.html');
      if(shell)return safeResponse(Promise.resolve(shell));
      return safeResponse(fetch(event.request));
    }
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return safeResponse(Promise.resolve(cached));
    // A page opened just before activation may still request the previous build's hashed files.
    const previous=(await caches.keys()).filter(key=>key!==CACHE&&key.startsWith(CACHE_PREFIX)).at(-1);
    if(previous){
      const prior=await (await caches.open(previous)).match(event.request,{ignoreSearch:true});
      if(prior)return safeResponse(Promise.resolve(prior));
    }
    return safeResponse(fetch(event.request));
  })());
});
`,
);
console.log('Offline cache:', coreUrls.length, 'files;', effectUrls.length, 'optional; version', version);
