importScripts('/node_modules/workbox-sw/build/importScripts/workbox-sw.dev.v2.1.2.js');
importScripts('/sw-generated.js');

const sw = new WorkboxSW();

// Cache API requests
sw.router.registerRoute(
    new RegExp('http://localhost/api/(.*)'),
    sw.strategies.networkFirst()
);

sw.router.registerRoute(
    new RegExp('https://next.suttacentral.com/api/(.*)'),
    sw.strategies.networkFirst()
);

// Cache Google fonts
sw.router.registerRoute(
  new RegExp('^https://fonts.(?:googleapis|gstatic).com/(.*)'),
  sw.strategies.cacheFirst()
);