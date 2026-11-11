/** UI state that more than one screen needs. */
class Ui {
  /** The settings fly-out (components/Settings.svelte, mounted once in App.svelte). */
  settingsOpen = $state(false)

  /**
   * Set by Settings while it is open. Asked before anything closes it from outside (the back button):
   * returns false, after showing its own warning, when something unsaved would be lost.
   */
  settingsGuard: (() => boolean) | null = null

  /** Close Settings, unless it has unsaved changes it wants to warn about. Returns whether it closed. */
  closeSettings() {
    if (!this.settingsOpen) return true // nothing to close, so nothing to warn about
    if (this.settingsGuard && !this.settingsGuard()) return false
    this.settingsOpen = false
    return true
  }
}

export const ui = new Ui()
