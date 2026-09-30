// 스트레칭 타이머 오프라인 작동 파일
// 수정본을 올릴 때 VERSION 숫자를 올리면 휴대폰의 앱이 새 파일로 바뀝니다.
const VERSION = 'v10';
const APP_CACHE = 'stretch-timer-app-' + VERSION;
const FONT_CACHE = 'stretch-timer-fonts';
const APP_FILES = [
  './', './index.html', './images.js?v=10', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_FILES.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== APP_CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 글꼴: 저장된 것을 먼저 쓰고 뒤에서 갱신
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
        return r;
      }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 앱 화면: 인터넷이 되면 최신 파일, 안 되면 저장된 파일
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(r => {
        if (r.ok) { const copy = r.clone(); caches.open(APP_CACHE).then(c => c.put('./index.html', copy)); }
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 아이콘 등: 저장된 것 우선
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
