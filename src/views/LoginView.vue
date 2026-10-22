<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { refreshSession } from '../auth'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  const { error: e } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value
  })
  if (e) {
    loading.value = false
    error.value = 'E-mail ou mot de passe incorrect.'
    return
  }
  await refreshSession()
  loading.value = false
  router.replace({ name: 'overview' })
}
</script>

<template>
  <div class="login">
    <form class="login-card" @submit.prevent="submit">
      <div class="brand big">KALYNO <small>Admin</small></div>
      <p class="lead">Espace réservé aux administrateurs.</p>
      <label>E-mail
        <input v-model="email" type="email" autocomplete="username" required />
      </label>
      <label>Mot de passe
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="msg err">{{ error }}</p>
      <button class="btn" :disabled="loading">{{ loading ? 'Connexion…' : 'Se connecter' }}</button>
    </form>
  </div>
</template>
