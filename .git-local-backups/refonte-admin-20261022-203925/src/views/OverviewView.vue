<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'

const loading = ref(true)
const error = ref('')
const stats = ref(null)
const perLevel = ref([])

async function count(table, build) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (build) q = build(q)
  const { count: n, error: e } = await q
  if (e) throw e
  return n ?? 0
}

onMounted(async () => {
  try {
    const [challenges, questions, subjects, chapters, capsules, cards, students, admins] =
      await Promise.all([
        count('challenges'),
        count('questions'),
        count('subjects'),
        count('chapters'),
        count('capsules'),
        count('cards'),
        count('profiles', (q) => q.eq('role', 'student')),
        count('profiles', (q) => q.eq('role', 'admin'))
      ])
    stats.value = { challenges, questions, subjects, chapters, capsules, cards, students, admins }

    const lv = await supabase.from('levels').select('id,label,position').order('position')
    if (lv.error) throw lv.error
    const ch = await supabase.from('challenges').select('level_id,status,kind')
    if (ch.error) throw ch.error

    perLevel.value = lv.data.map((l) => {
      const mine = ch.data.filter((c) => c.level_id === l.id)
      return {
        id: l.id,
        label: l.label,
        demo: mine.filter((c) => c.kind === 'discovery' && c.status === 'published').length,
        drafts: mine.filter((c) => c.status === 'draft').length
      }
    })
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1>📊 Vue d’ensemble</h1>
    <p class="lead">L’état de l’application en un coup d’œil.</p>

    <p v-if="loading">Chargement…</p>
    <p v-if="error" class="msg err">{{ error }}</p>

    <template v-if="stats">
      <div class="kpis">
        <div class="kpi"><b>{{ stats.students }}</b><span>Élèves avec compte</span></div>
        <div class="kpi"><b>{{ stats.admins }}</b><span>Administrateurs</span></div>
        <div class="kpi"><b>{{ stats.challenges }}</b><span>Défis</span></div>
        <div class="kpi"><b>{{ stats.questions }}</b><span>Questions de défi</span></div>
        <div class="kpi"><b>{{ stats.subjects }}</b><span>Matières</span></div>
        <div class="kpi"><b>{{ stats.chapters }}</b><span>Chapitres</span></div>
        <div class="kpi"><b>{{ stats.capsules }}</b><span>Micro-capsules</span></div>
        <div class="kpi"><b>{{ stats.cards }}</b><span>Cartes de révision</span></div>
      </div>

      <h2>Couverture par classe</h2>
      <table class="table">
        <thead>
          <tr><th>Classe</th><th>Démo publiée</th><th>Brouillons</th><th>Effet dans l’appli</th></tr>
        </thead>
        <tbody>
          <tr v-for="l in perLevel" :key="l.id">
            <td>{{ l.label }}</td>
            <td><span class="badge" :class="l.demo ? 'published' : 'draft'">{{ l.demo }}</span></td>
            <td>{{ l.drafts }}</td>
            <td class="muted">
              {{ l.demo ? 'Les nouveaux élèves voient un défi de découverte.' : 'Aucune démo : ils arrivent directement sur le tableau de bord.' }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="hint">Les élèves qui n’ont pas de compte Google ne sont pas comptés. Les statistiques d’usage (élèves actifs, séries, rétention) arriveront avec le Dojo.</p>
    </template>
  </div>
</template>
