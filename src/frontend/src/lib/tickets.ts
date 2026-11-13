/**
 * The feedback this device has sent. Each ticket has a private token (from the server) that opens a read-only
 * page with its status and any reply, so the player can come back to it. Only the token and a short preview are
 * kept, in `am-tickets` (listed in `data.ts`, so "Clear my data" forgets them).
 */
const KEY = 'am-tickets'
const MAX_KEPT = 20

export interface StoredTicket {
  /** The ticket's token: the address of its page is /v1/feedback/<id>. */
  id: string
  /** When it was sent (ms since 1970). */
  at: number
  /** The start of the message, so the list is recognisable. */
  text: string
  rating?: number
}

export function loadTickets(): StoredTicket[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list)
      ? list.filter((t) => t && typeof t.id === 'string' && typeof t.at === 'number' && typeof t.text === 'string')
      : []
  } catch {
    return []
  }
}

export function saveTicket(ticket: StoredTicket) {
  try {
    const list = [ticket, ...loadTickets().filter((t) => t.id !== ticket.id)].slice(0, MAX_KEPT)
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage is blocked: the ticket is sent, it just isn't listed on this device.
  }
}

/** The address of a ticket's own read-only page. */
export const ticketUrl = (id: string) => `/v1/feedback/${encodeURIComponent(id)}`
