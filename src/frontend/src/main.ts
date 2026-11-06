import '@fontsource-variable/outfit'
import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import './lib/theme.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
