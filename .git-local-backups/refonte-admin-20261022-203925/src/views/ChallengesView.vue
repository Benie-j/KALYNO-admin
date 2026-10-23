<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../supabase'
import QuestionEditor from '../components/QuestionEditor.vue'

const levels = ref([])
const levelId = ref('')
const challenges = ref([])
const selectedId = ref(null)
const questions = ref([])
const editTitle = ref('')
const editKind = ref('discovery')
const newTitle = ref('')
const newKind = ref('discovery')
const busy = ref(false)
const error = ref('')
const notice = ref('')

const selected = computed(() => challenges.value.find((c) => c.id === selectedId.value) || null)
const countOf = (c) => c.questions?.[0]?.count ?? 0

function fail(message) {
  error.value = message
  notice.value = ''
}
function ok(message) {
  notice.value = message
  error.value = ''
}
function throwIf(r) {
  if (r.error) throw r.error
  return r
}
async function run(fn) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await fn()
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}

async function loadLevels() {
  const r = throwIf(await supabase.from('levels').select('id,label,position').order('position'))
  levels.value = r.data
  if (!levelId.value && r.data.length) levelId.value = r.data[0].id
}

async function loadChallenges() {
  if (!levelId.value) return
  const r = throwIf(
    await supabase
      .from('challenges')
      .select('id,level_id,title,position,status,kind,questions(count)')
      .eq('level_id', levelId.value)
      .order('created_at', { ascending: false })
  )
  challenges.value = r.data
  if (selectedId.value && !r.data.some((c) => c.id === selectedId.value)) {
    selectedId.value = null
    questions.value = []
  }
}

async function loadQuestions() {
  if (!selectedId.value) {
    questions.value = []
    return
  }
  const r = throwIf(
    await supabase.from('questions').select('*').eq('challenge_id', selectedId.value).order('position')
  )
  questions.value = r.data
}

async function select(c) {
  selectedId.value = c.id
  editTitle.value = c.title
  editKind.value = c.kind
  await run(loadQuestions)
}

async function createChallenge() {
  if (!newTitle.value.trim()) return fail('Donne un titre au défi.')
  await run(async () => {
    const r = throwIf(
      await supabase
        .from('challenges')
        .insert({ level_id: levelId.value, title: newTitle.value.trim(), kind: newKind.value, status: 'draft' })
        .select()
        .single()
    )
    newTitle.value = ''
    await loadChallenges()
    const created = challenges.value.find((c) => c.id === r.data.id)
    if (created) {
      selectedId.value = created.id
      editTitle.value = created.title
      editKind.value = created.kind
      await loadQuestions()
    }
    ok('Défi créé en brouillon. Ajoute maintenant des questions.')
  })
}

async function saveInfo() {
  if (!editTitle.value.trim()) return fail('Le titre est vide.')
  await run(async () => {
    throwIf(
      await supabase
        .from('challenges')
        .update({ title: editTitle.value.trim(), kind: editKind.value })
        .eq('id', selectedId.value)
    )
    await loadChallenges()
    ok('Informations enregistrées.')
  })
}

function validQuestion(q) {
  return (
    !!q.id &&
    (q.prompt || '').trim() &&
    Array.isArray(q.choices) &&
    q.choices.length === 4 &&
    q.choices.every((c) => (c || '').trim()) &&
    q.correct_index >= 0 &&
    q.correct_index <= 3
  )
}

async function setStatus(status) {
  if (status === 'published') {
    if (!questions.value.length) return fail('Ajoute au moins une question avant de publier.')
    if (questions.value.some((q) => !q.id)) return fail('Enregistre toutes les questions avant de publier.')
    if (!questions.value.every(validQuestion)) return fail('Certaines questions sont incomplètes.')
  }
  await run(async () => {
    throwIf(await supabase.from('challenges').update({ status }).eq('id', selectedId.value))
    await loadChallenges()
    ok(status === 'published' ? 'Défi publié : les élèves de cette classe le voient maintenant.' : 'Défi repassé en brouillon.')
  })
}

async function deleteChallenge() {
  if (!window.confirm('Supprimer ce défi et toutes ses questions ? Cette action est définitive.')) return
  await run(async () => {
    throwIf(await supabase.from('challenges').delete().eq('id', selectedId.value))
    selectedId.value = null
    questions.value = []
    await loadChallenges()
    ok('Défi supprimé.')
  })
}

function addQuestion() {
  const last = questions.value.reduce((m, q) => Math.max(m, q.position ?? 0), 0)
  questions.value.push({
    id: null,
    position: last + 1,
    prompt: '',
    choices: ['', '', '', ''],
    correct_index: 0,
    explanation: null
  })
}

async function saveQuestion(q, payload) {
  await run(async () => {
    if (q.id) {
      throwIf(await supabase.from('questions').update(payload).eq('id', q.id))
    } else {
      throwIf(
        await supabase
          .from('questions')
          .insert({ ...payload, challenge_id: selectedId.value, position: q.position })
      )
    }
    await loadQuestions()
    await loadChallenges()
    ok('Question enregistrée.')
  })
}

async function removeQuestion(q, i) {
  if (!q.id) {
    questions.value.splice(i, 1)
    return
  }
  if (!window.confirm('Supprimer cette question ?')) return
  await run(async () => {
    throwIf(await supabase.from('questions').delete().eq('id', q.id))
    await loadQuestions()
    await loadChallenges()
    ok('Question supprimée.')
  })
}

async function moveQuestion(i, dir) {
  const a = questions.value[i]
  const b = questions.value[i + dir]
  if (!a || !b) return
  if (!a.id || !b.id) return fail('Enregistre les questions avant de les déplacer.')
  await run(async () => {
    // Trois étapes : la position est unique dans un défi
    throwIf(await supabase.from('questions').update({ position: -1 }).eq('id', a.id))
    throwIf(await supabase.from('questions').update({ position: a.position }).eq('id', b.id))
    throwIf(await supabase.from('questions').update({ position: b.position }).eq('id', a.id))
    await loadQuestions()
  })
}

watch(levelId, () => {
  selectedId.value = null
  questions.value = []
  run(loadChallenges)
})

onMounted(() =>
  run(async () => {
    await loadLevels()
    await loadChallenges()
  })
)
</script>

<template>
  <div>
    <h1>🎯 Défis de découverte</h1>
    <p class="lead">
      Le défi de découverte est le premier défi que voit un nouvel élève. Un défi publié est visible
      tout de suite dans l’appli, uniquement pour la classe concernée.
    </p>

    <div class="tabs">
      <button
        v-for="l in levels"
        :key="l.id"
        :class="{ on: l.id === levelId }"
        @click="levelId = l.id"
      >{{ l.label }}</button>
    </div>

    <p v-if="error" class="msg err">{{ error }}</p>
    <p v-if="notice" class="msg ok">{{ notice }}</p>

    <div class="cols">
      <section class="panel">
        <h2>Défis de cette classe</h2>
        <ul class="list">
          <li
            v-for="c in challenges"
            :key="c.id"
            :class="{ on: c.id === selectedId }"
            @click="select(c)"
          >
            <strong>{{ c.title }}</strong>
            <span class="badges">
              <span class="badge" :class="c.status">{{ c.status === 'published' ? 'Publié' : 'Brouillon' }}</span>
              <span class="badge kind">{{ c.kind === 'discovery' ? 'Découverte' : 'Standard' }}</span>
              <span class="badge">{{ countOf(c) }} question(s)</span>
            </span>
          </li>
          <li v-if="!challenges.length" class="empty">Aucun défi pour cette classe.</li>
        </ul>

        <div class="create">
          <input v-model="newTitle" placeholder="Titre du nouveau défi" />
          <select v-model="newKind">
            <option value="discovery">Découverte</option>
            <option value="standard">Standard (pas encore lu par l’appli)</option>
          </select>
          <button class="btn" :disabled="busy" @click="createChallenge">+ Créer</button>
        </div>
      </section>

      <section v-if="selected" class="panel wide">
        <h2>Défi sélectionné</h2>

        <div class="row">
          <input v-model="editTitle" class="grow" placeholder="Titre" />
          <select v-model="editKind">
            <option value="discovery">Découverte</option>
            <option value="standard">Standard</option>
          </select>
          <button class="btn ghost" :disabled="busy" @click="saveInfo">Enregistrer</button>
        </div>

        <div class="row status">
          <span class="badge" :class="selected.status">{{ selected.status === 'published' ? 'Publié' : 'Brouillon' }}</span>
          <button
            v-if="selected.status !== 'published'"
            class="btn"
            :disabled="busy"
            @click="setStatus('published')"
          >Publier</button>
          <button v-else class="btn ghost" :disabled="busy" @click="setStatus('draft')">Repasser en brouillon</button>
          <span class="grow"></span>
          <button class="btn danger" :disabled="busy" @click="deleteChallenge">Supprimer le défi</button>
        </div>

        <p v-if="selected.status === 'published'" class="msg warn">
          Ce défi est publié : chaque enregistrement est visible tout de suite par les élèves.
        </p>

        <QuestionEditor
          v-for="(q, i) in questions"
          :key="q.id || 'new-' + i"
          :question="q"
          :index="i"
          :total="questions.length"
          :busy="busy"
          @save="(payload) => saveQuestion(q, payload)"
          @remove="removeQuestion(q, i)"
          @move="(dir) => moveQuestion(i, dir)"
        />

        <button class="btn ghost" :disabled="busy" @click="addQuestion">+ Ajouter une question</button>
      </section>

      <section v-else class="panel wide muted">
        <p>Choisis un défi à gauche, ou crées-en un nouveau.</p>
      </section>
    </div>
  </div>
</template>
