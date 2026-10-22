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

start()
