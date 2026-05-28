import { createApp, type App as VueApp } from "vue"
import { createPinia } from "pinia"

import App from "./App.vue"
import "../styles/base.scss"

const appInstances = new WeakMap<HTMLElement, VueApp>()

export function mountInboxApp(container: HTMLElement): VueApp {
  const existingApp = appInstances.get(container)
  if (existingApp) {
    return existingApp
  }

  const app = createApp(App)
  app.use(createPinia())
  app.mount(container)
  appInstances.set(container, app)
  return app
}
