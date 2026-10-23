import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initAuth } from './auth'
import 'katex/dist/katex.min.css'
import './styles.css'

async function start() {
  await initAuth()
  createApp(App).use(router).mount('#app')
}

// Anti-clickjacking : le site refuse de s'afficher dans la page d'un autre site
if (window.top !== window.self) {
  document.documentElement.style.display = 'none'
  try {
    window.top.location = window.self.location
  } catch (e) {
    // navigation bloquée : la page reste masquée
  }
} else {
  start()
}
