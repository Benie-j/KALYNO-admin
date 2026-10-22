<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, refreshSession } from '../auth'
import { supabase } from '../supabase'

const router = useRouter()
const menuOpen = ref(false)
const signingOut = ref(false)
const error = ref('')

async function logout() {
  signingOut.value = true
  error.value = ''

  try {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError

    await refreshSession()
    await router.replace({ name: 'login' })
  } catch (e) {
    error.value = e.message || 'La déconnexion a échoué.'
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <div v-if="!auth.isAdmin" class="login">
    <div class="login-card">
      <h1>Accès refusé</h1>
      <p class="lead">Ce compte ne possède pas le rôle administrateur.</p>
      <p v-if="error" class="msg err">{{ error }}</p>
      <button class="btn" :disabled="signingOut" @click="logout">
        {{ signingOut ? 'Déconnexion…' : 'Se déconnecter' }}
      </button>
    </div>
  </div>

  <div v-else class="admin-shell">
    <aside class="admin-sidebar" :class="{ 'menu-open': menuOpen }">
      <router-link class="admin-brand" :to="{ name: 'overview' }" @click="menuOpen = false">
        <span class="brand-mark">K</span>
        <span class="brand-copy">
          <strong>KALYNO</strong>
          <small>STUDIO ADMIN</small>
        </span>
      </router-link>

      <div class="nav-label">ESPACE DE TRAVAIL</div>
      <nav class="admin-nav">
        <router-link :to="{ name: 'overview' }" @click="menuOpen = false">
          <span class="nav-icon">◫</span> Vue d’ensemble
        </router-link>
        <router-link :to="{ name: 'content' }" @click="menuOpen = false">
          <span class="nav-icon">▦</span> Contenus pédagogiques
        </router-link>
        <router-link :to="{ name: 'challenges' }" @click="menuOpen = false">
          <span class="nav-icon">◎</span> Défis et questions
        </router-link>
      </nav>

      <div class="sidebar-bottom">
        <div class="security-note">
          <span class="security-dot"></span>
          <div>
            <strong>Session sécurisée</strong>
            <small>Accès administrateur</small>
          </div>
        </div>
        <div class="admin-user">
          <span class="user-avatar">{{ (auth.user?.email || 'A').slice(0, 1).toUpperCase() }}</span>
          <div class="user-info">
            <strong>Administrateur</strong>
            <small>{{ auth.user?.email }}</small>
          </div>
        </div>
        <p v-if="error" class="msg err">{{ error }}</p>
        <button class="logout-button" :disabled="signingOut" @click="logout">
          ↪ {{ signingOut ? 'Déconnexion…' : 'Se déconnecter' }}
        </button>
      </div>
    </aside>

    <div v-if="menuOpen" class="mobile-scrim" @click="menuOpen = false"></div>

    <main class="admin-main">
      <header class="topbar">
        <button class="mobile-menu-button" aria-label="Ouvrir le menu" @click="menuOpen = !menuOpen">☰</button>
        <div class="topbar-context">
          <span>Administration</span>
          <span class="topbar-separator">/</span>
          <strong>KALYNO Studio</strong>
        </div>
        <div class="topbar-status"><span></span> Espace administrateur</div>
      </header>
      <div class="page-container">
        <router-view />
      </div>
    </main>
  </div>
</template>
