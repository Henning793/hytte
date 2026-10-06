// Push-varsler. Lastes inn i service workeren som Workbox lager (se vite.config.ts).

self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hytta', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      lang: 'nb',
      data: { url: data.url || '/' },
    }),
  )
})

// Trykk på varselet: bruk appen som er åpen, ellers åpne den.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      for (const client of list) {
        if (new URL(client.url).origin !== self.location.origin) continue
        await client.focus()
        if ('navigate' in client) return client.navigate(url)
        return
      }
      return self.clients.openWindow(url)
    }),
  )
})
