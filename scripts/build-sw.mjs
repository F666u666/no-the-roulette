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
await writeFile(
  'dist/sw.js',
  `/* Generated from every build asset, including replacement images and sounds. */
const CACHE_PREFIX='no-roulette-safari-v2-';
const LEGACY_CACHE_PREFIX='no-roulette-';
const CACHE=CACHE_PREFIX+'${version}';
const PRECACHE=${JSON.stringify(urls)};
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
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
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
console.log('Offline cache:', urls.length, 'files; version', version);
