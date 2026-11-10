/** UI state that more than one screen needs. */
class Ui {
  /** The settings fly-out (components/Settings.svelte, mounted once in App.svelte). */
  settingsOpen = $state(false)
}

export const ui = new Ui()
