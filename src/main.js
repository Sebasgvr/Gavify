import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initAuth } from './services/auth'
import './styles.css'

const app = createApp(App)

app.use(router)
app.mount('#app')

initAuth()
