import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('dist/sw.js', 'utf8');
const NativeRequest = Request;
const listeners = new Map();
const stored = new Map();
const deleted = [];
const fetchedPaths = [];
const previousCacheName = 'no-roulette-safari-v2-previous';
const previousCache = {
  async match(request) {
    return new URL(request.url).pathname === '/assets/previous.js'
      ? new Response('previous bundle', { headers: { 'content-type': 'text/javascript' } })
      : undefined;
  },
};
let claimed = false;
let skipped = false;

function redirectedResponse(body = '<!doctype html>') {
  const response = new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
  Object.defineProperty(response, 'redirected', { value: true });
  return response;
}

const cache = {
  async put(request, response) {
    stored.set(new URL(request.url).pathname, response);
  },
  async match(request) {
    const url = typeof request === 'string' ? new URL(request, 'https://example.test') : request;
    return stored.get(new URL(url.url ?? url).pathname);
  },
};

const context = vm.createContext({
  URL,
  Request: class extends NativeRequest {
    constructor(input, init) {
      super(new URL(input.url ?? input, 'https://example.test'), init);
    }
  },
  Response,
  Promise,
  console,
  fetch: async (request) => {
    fetchedPaths.push(new URL(request.url).pathname);
    return redirectedResponse();
  },
  caches: {
    async open(key) {
      return key === previousCacheName ? previousCache : cache;
    },
    async keys() {
      return ['no-roulette-old', 'no-roulette-safari-v2-old', previousCacheName, 'unrelated-cache'];
    },
    async delete(key) {
      deleted.push(key);
      return true;
    },
  },
  self: {
    location: { origin: 'https://example.test' },
    clients: {
      async claim() {
        claimed = true;
      },
    },
    async skipWaiting() {
      skipped = true;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
  },
});

vm.runInContext(source, context);

async function dispatchExtendable(type) {
  let work;
  listeners.get(type)({ waitUntil(promise) { work = promise; } });
  await work;
}

await dispatchExtendable('install');
if (!skipped) throw new Error('Service worker did not call skipWaiting during install.');
if (fetchedPaths.includes('/index.html') || !fetchedPaths.includes('/')) {
  throw new Error('App shell precache must fetch / directly and store it as /index.html.');
}
const shell = stored.get('/index.html');
if (!shell || shell.redirected) throw new Error('Precached app shell retained redirected=true.');

let navigation;
listeners.get('fetch')({
  request: { method: 'GET', mode: 'navigate', url: 'https://example.test/route' },
  respondWith(promise) { navigation = promise; },
});
const navigationResponse = await navigation;
if (navigationResponse.redirected) throw new Error('Navigation fallback returned redirected=true.');

await dispatchExtendable('activate');
if (!claimed) throw new Error('Service worker did not claim clients during activate.');
if (!deleted.includes('no-roulette-old') || !deleted.includes('no-roulette-safari-v2-old')) {
  throw new Error('Managed legacy caches were not deleted.');
}
if (deleted.includes('unrelated-cache')) throw new Error('Unrelated cache was deleted.');

if (deleted.includes(previousCacheName)) throw new Error('Previous build cache was deleted during activation.');
const fetchedBefore = fetchedPaths.length;
let previousAsset;
listeners.get('fetch')({
  request: { method: 'GET', mode: 'cors', url: 'https://example.test/assets/previous.js' },
  respondWith(promise) { previousAsset = promise; },
});
if (await (await previousAsset).text() !== 'previous bundle') {
  throw new Error('An in-flight old page cannot load its hashed bundle after activation.');
}
if (fetchedPaths.length !== fetchedBefore) throw new Error('Previous asset unnecessarily required the network.');
console.log('Service worker runtime verified: redirect-safe shell, bounded cleanup, previous-build fallback, skipWaiting, clients.claim.');
