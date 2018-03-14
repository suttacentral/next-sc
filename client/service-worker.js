const isProductionEnv = !self.location.hostname.match(/127.0.0.1|localhost|172[\d.]+/);

if (isProductionEnv) {
    importScripts('/node_modules/workbox-sw/build/importScripts/workbox-sw.prod.v2.1.2.js');
}
else {
    importScripts('/node_modules/workbox-sw/build/importScripts/workbox-sw.dev.v2.1.2.js');
}

const sw = new WorkboxSW();

// This has to remain empty, the Workbox CLI injects the list of precached files here:
sw.precache([]);

// Cache API requests
sw.router.registerRoute(
    new RegExp('http://localhost/api/(.*)'),
    sw.strategies.networkFirst()
);

sw.router.registerRoute(
    new RegExp('https://(?:staging.)suttacentral.net/api/(.*)'),
    sw.strategies.networkFirst()
);

// Cache assets (images and fonts)
sw.router.registerRoute(
    new RegExp('https://(?:staging.)suttacentral.net/(?:img|files)/(.*)'),
    sw.strategies.cacheFirst({
        cacheName: "assets",
        cacheExpiration: {
            maxAgeSeconds: 7 * 24 * 60 * 60
        },
        cacheableResponse: { statuses: [0, 200] }
    })
);

// Cache Google fonts
sw.router.registerRoute(
    new RegExp('^https://fonts.(?:googleapis|gstatic).com/(.*)'),
    sw.strategies.cacheFirst()
);

// Cache Stripe scripts
sw.router.registerRoute(
    new RegExp('^https://(?:js|m).stripe.com/(.*)'),
    sw.strategies.cacheFirst()
);

if (isProductionEnv) {
    // For the production version, register a base route for all offline navigation requests.
    // This returns the cached value for '/' (index.html) when the user requests a URL like suttacentral.net/home
    // instead of just looking for the cached match for suttacentral.net/home, which doesn't exist.
    caches.keys().then(keys => {
        const cacheName = keys.filter(name => name.includes('suttacentral'))[0];
        caches.open(cacheName).then(cache => {
            const cacheOptions = {
                blacklist: [
                    /^\/img\/.*/,
                    /^\/files\/.*/
                ]
            };
            if (cache.match('index.html')) {
                sw.router.registerNavigationRoute('index.html', cacheOptions);
            }
            else if (cache.match('/')) {
                sw.router.registerNavigationRoute('/', cacheOptions);
            }
        });
    });
}

