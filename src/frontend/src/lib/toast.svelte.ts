/** Brief, non-blocking messages, shown by <Toaster /> at the bottom of the screen. */

export interface Toast {
  id: number
  text: string
}

class Toasts {
  items = $state<Toast[]>([])
  #next = 0

  show(text: string, duration = 2600) {
    const id = ++this.#next
    this.items.push({ id, text })
    setTimeout(() => this.dismiss(id), duration)
  }

  dismiss(id: number) {
    this.items = this.items.filter((toast) => toast.id !== id)
  }
}

export const toasts = new Toasts()
