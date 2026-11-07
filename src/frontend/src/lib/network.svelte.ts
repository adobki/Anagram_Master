/** Whether the browser thinks it's online. Games need the server; the app shell doesn't. */
class Network {
  online = $state(navigator.onLine)

  constructor() {
    addEventListener('online', () => (this.online = true))
    addEventListener('offline', () => (this.online = false))
  }
}

export const network = new Network()
