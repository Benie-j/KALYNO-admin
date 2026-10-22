<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { refreshSession } from '../auth'

const router = useRouter()
const loading = ref(false)
const error = ref('')

async function logout() {
  loading.value = true
  error.value = ''

  try {
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) throw signOutError

    await refreshSession()
    await router.replace({ name: 'login' })
  } catch {
    error.value = 'La déconnexion a échoué. Réessaie.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login">
    <section class="login-card">
      <h1>Accès refusé</h1>
      <p class="lead">
        Ce compte ne possède pas les autorisations nécessaires
        pour accéder à l’espace KALYNO Admin.
      </p>
      <p v-if="error" class="msg err">{{ error }}</p>
      <button class="btn" :disabled="loading" @click="logout">
        {{ loading ? 'Déconnexion…' : 'Se déconnecter' }}
      </button>
    </section>
  </main>
</template>
