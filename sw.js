// sw.js - в корне проекта
self.addEventListener('install', (event) => {
    console.log('Service Worker установлен');
});

self.addEventListener('fetch', (event) => {
    // Пропускаем аудиозапросы через кэш
    if (event.request.url.includes('/uploads/')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});