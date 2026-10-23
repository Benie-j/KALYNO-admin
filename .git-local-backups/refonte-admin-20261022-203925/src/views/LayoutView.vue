<script setup>
import { useRouter } from 'vue-router'
import { auth, refreshSession } from '../auth'
import { supabase } from '../supabase'

const router = useRouter()

async function logout() {
  await supabase.auth.signOut()
  await refreshSession()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div v-if="!auth.isAdmin" class="login">
    <div class="login-card">
      <h1>Accès refusé</h1>
      <p class="lead">Le compte {{ auth.user?.email }} n’a pas le rôle administrateur.</p>
      <button class="btn" @click="logout">Se déconnecter</button>
    </div>
  </div>

  <div v-else class="shell">
    <aside class="side">
      <div class="brand">KALYNO <small>Admin</small></div>
      <nav>
        <router-link :to="{ name: 'overview' }">📊 Vue d’ensemble</router-link>
        <router-link :to="{ name: 'challenges' }">🎯 Défis de découverte</router-link>
        <span class="soon">📚 Programme <em>bientôt</em></span>
        <span class="soon">👥 Élèves <em>bientôt</em></span>
      </nav>
      <div class="side-foot">
        <div class="who">{{ auth.user?.email }}</div>
        <button class="btn ghost" @click="logout">Se déconnecter</button>
      </div>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>
