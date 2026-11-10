// Added to the generated service worker (`importScripts` in vite.config.ts).
//
// A page that was loaded without the service worker, after a hard refresh for
// example, isn't controlled by it. A newer version found then has no
// controlled page to wait for, so it would switch in at once, unasked. The page
// asks to be taken over instead, and a newer version waits for the player's
// go-ahead. (See src/lib/update.svelte.ts.)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLAIM') event.waitUntil(self.clients.claim())
})
