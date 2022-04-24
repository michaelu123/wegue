var CACHE_STATIC_NAME = "kiku-static-cache-v2";
var CACHE_DYNAMIC_NAME = "kiku-dynamic-cache-v2";
var urlsToCache = [
  "manifest.json",
  "sw.js",
  "zip-full.min.js",
  "app-conf.json",
  "fonts/MaterialIcons-Regular.fdac816.woff2",
  "fonts/materialdesignicons-webfont.7a44ea1.woff2",
  "data/kiku_Orte_nurPunkte.geojson",
  "data/kiku_Route.geojson",
  "icon/logo.png",
  "icon/logo-48.png",
  "icon/logo-96.png",
  "icon/logo-144.png",
  "icon/logo-192.png",
  "icon/logo-256.png",
  "icon/logo-512.png"
];

console.log("1sw", self);
self.importScripts("zip-full.min.js");
console.log("2sw");

self.addEventListener("install", function(event) {
  // Perform install steps
  console.log("sw install", event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(async function(cache) {
      console.log("Opened cache");
      let dataResp = await fetch("tiles/tiles.zip");
      if (dataResp) {
        console.log("2inst", dataResp);
        let blob = await dataResp.blob();
        console.log("3inst", blob);
        zip.configure({
          useWebWorkers: false
        });
        let br = new zip.BlobReader(blob);
        br.useWebWorkers = false;
        let zr = new zip.ZipReader(br);
        entries = await zr.getEntries();
        for (let entry of entries) {
          if (!entry.filename.endsWith(".png")) continue;
          let exists = await cache.match("/tiles/" + entry.filename);
          if (exists) {
            continue;
          }
          let data = await entry.getData(new zip.BlobWriter());
          caches.open(CACHE_STATIC_NAME).then(async function(cache) {
            let resp = new Response(data, {
              status: 200,
              statusText: "OK",
              headers: { "Content-Type": "image/png" }
            });
            await cache.put("/static/tiles/" + entry.filename, resp);
          });
        }
      }

      console.log("addAll1");
      await cache.addAll(urlsToCache);
      console.log("addAll2");
    })
  );
});
console.log("3sw");

self.addEventListener("activate", function(event) {
  console.log("sw activated", event);
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (
            cacheName.startsWith("kiku-") &&
            cacheName !== CACHE_STATIC_NAME &&
            cacheName !== CACHE_DYNAMIC_NAME
          ) {
            console.log("delete cache ", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

console.log("4sw");
self.addEventListener("fetch", function(event) {
  console.log("fetch1", event.request.url);
  event.respondWith(
    caches.match(event.request).then(function(response) {
      console.log("fetch2", response);
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request)
        .then(function(response) {
          console.log("fetch3", response);
          // Check if we received a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          // IMPORTANT: Clone the response. A response is a stream
          // and because we want the browser to consume the response
          // as well as the cache consuming the response, we need
          // to clone it so we have two streams.
          var responseToCache = response.clone();

          caches.open(CACHE_DYNAMIC_NAME).then(function(cache) {
            console.log("fetch4", event.request.url);
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(function(reason) {
          return null;
        });
    })
  );
});
console.log("5sw");
