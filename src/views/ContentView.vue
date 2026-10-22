<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../supabase'

const levels = ref([])
const subjects = ref([])
const chapters = ref([])
const capsules = ref([])
const cards = ref([])

const section = ref('subjects')
const levelId = ref('')
const subjectId = ref('')
const chapterId = ref('')
const capsuleId = ref('')
const selectedId = ref(null)

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const search = ref('')
const form = ref({})
const editing = ref(false)

const definitions = {
  subjects: {
    label: 'Matières',
    singular: 'matière',
    table: 'subjects',
    fields: [
      { key: 'name', label: 'Nom de la matière', type: 'text', required: true },
      { key: 'emoji', label: 'Emoji (facultatif)', type: 'text' },
      { key: 'coefficient', label: 'Coefficient', type: 'number', min: 0.1, step: 0.1, required: true },
      { key: 'position', label: 'Ordre d’affichage', type: 'number', min: 0, step: 1, required: true },
      { key: 'is_active', label: 'Matière active', type: 'checkbox' }
    ]
  },
  chapters: {
    label: 'Chapitres',
    singular: 'chapitre',
    table: 'chapters',
    fields: [
      { key: 'title', label: 'Titre du chapitre', type: 'text', required: true },
      { key: 'position', label: 'Ordre d’affichage', type: 'number', min: 0, step: 1, required: true },
      { key: 'status', label: 'Statut', type: 'select', options: [
        { value: 'draft', label: 'Brouillon' },
        { value: 'published', label: 'Publié' }
      ]}
    ]
  },
  capsules: {
    label: 'Capsules',
    singular: 'capsule',
    table: 'capsules',
    fields: [
      { key: 'title', label: 'Titre de la capsule', type: 'text', required: true },
      { key: 'body', label: 'Contenu pédagogique', type: 'textarea', required: true },
      { key: 'minutes', label: 'Durée estimée (1 à 10 min)', type: 'number', min: 1, max: 10, step: 1, required: true },
      { key: 'position', label: 'Ordre d’affichage', type: 'number', min: 0, step: 1, required: true },
      { key: 'is_high_yield', label: 'Notion essentielle', type: 'checkbox' }
    ]
  },
  cards: {
    label: 'Cartes de révision',
    singular: 'carte',
    table: 'cards',
    fields: [
      { key: 'kind', label: 'Type de carte', type: 'select', options: [
        { value: 'flashcard', label: 'Flashcard' },
        { value: 'qcm', label: 'QCM' },
        { value: 'cloze', label: 'Texte à compléter' }
      ]},
      { key: 'front', label: 'Question / recto', type: 'textarea', required: true },
      { key: 'back', label: 'Réponse / verso', type: 'textarea' },
      { key: 'choicesText', label: 'Choix du QCM (un par ligne)', type: 'textarea' },
      { key: 'correct_index', label: 'Indice de la bonne réponse (0 à 3)', type: 'number', min: 0, max: 3, step: 1 },
      { key: 'explanation', label: 'Explication', type: 'textarea' },
      { key: 'is_high_yield', label: 'Notion essentielle', type: 'checkbox' },
      { key: 'position', label: 'Ordre d’affichage', type: 'number', min: 0, step: 1, required: true }
    ]
  }
}

const definition = computed(() => definitions[section.value])

const currentRows = computed(() => {
  const source = {
    subjects: subjects.value,
    chapters: chapters.value,
    capsules: capsules.value,
    cards: cards.value
  }[section.value] || []

  const q = search.value.trim().toLocaleLowerCase()
  if (!q) return source

  return source.filter((item) =>
    [item.name, item.title, item.front, item.back, item.body, item.kind, item.status]
      .some((v) => String(v ?? '').toLocaleLowerCase().includes(q))
  )
})

const currentLabel = (item) =>
  item.name || item.title || item.front || 'Sans titre'

function throwIf(result) {
  if (result.error) throw result.error
  return result
}

function reportError(e) {
  error.value = e?.message || String(e)
  notice.value = ''
}

function reportSuccess(message) {
  notice.value = message
  error.value = ''
}

function emptyForm() {
  if (section.value === 'subjects') {
    return { name: '', emoji: '', coefficient: 1, position: subjects.value.length, is_active: true }
  }
  if (section.value === 'chapters') {
    return { title: '', position: chapters.value.length, status: 'draft' }
  }
  if (section.value === 'capsules') {
    return { title: '', body: '', minutes: 3, position: capsules.value.length, is_high_yield: false }
  }
  return {
    kind: 'flashcard',
    front: '',
    back: '',
    choicesText: '',
    correct_index: 0,
    explanation: '',
    is_high_yield: false,
    position: cards.value.length
  }
}

function startCreate() {
  selectedId.value = null
  editing.value = false
  form.value = emptyForm()
  error.value = ''
  notice.value = ''
}

function startEdit(item) {
  selectedId.value = item.id
  editing.value = true
  error.value = ''
  notice.value = ''

  const copy = { ...item }
  if (section.value === 'cards') {
    copy.choicesText = Array.isArray(copy.choices) ? copy.choices.join('\n') : ''
    copy.correct_index = copy.correct_index ?? 0
  }
  form.value = { ...emptyForm(), ...copy }
}

async function loadLevels() {
  const r = throwIf(await supabase
    .from('levels')
    .select('id,label,position,is_active')
    .order('position'))

  levels.value = r.data || []
  if (!levelId.value && levels.value.length) levelId.value = levels.value[0].id
}

async function loadSubjects() {
  if (!levelId.value) {
    subjects.value = []
    subjectId.value = ''
    return
  }

  const r = throwIf(await supabase
    .from('subjects')
    .select('*')
    .eq('level_id', levelId.value)
    .order('position'))

  subjects.value = r.data || []
  if (!subjects.value.some((s) => s.id === subjectId.value)) {
    subjectId.value = subjects.value[0]?.id || ''
  }
}

async function loadChapters() {
  if (!subjectId.value) {
    chapters.value = []
    chapterId.value = ''
    return
  }

  const r = throwIf(await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId.value)
    .order('position'))

  chapters.value = r.data || []
  if (!chapters.value.some((c) => c.id === chapterId.value)) {
    chapterId.value = chapters.value[0]?.id || ''
  }
}

async function loadCapsules() {
  if (!chapterId.value) {
    capsules.value = []
    capsuleId.value = ''
    return
  }

  const r = throwIf(await supabase
    .from('capsules')
    .select('*')
    .eq('chapter_id', chapterId.value)
    .order('position'))

  capsules.value = r.data || []
  if (!capsules.value.some((c) => c.id === capsuleId.value)) {
    capsuleId.value = ''
  }
}

async function loadCards() {
  if (!chapterId.value) {
    cards.value = []
    return
  }

  const r = throwIf(await supabase
    .from('cards')
    .select('*')
    .eq('chapter_id', chapterId.value)
    .order('position'))

  cards.value = r.data || []
}

async function reloadAll() {
  loading.value = true
  error.value = ''

  try {
    await loadLevels()
    await loadSubjects()
    await loadChapters()
    await loadCapsules()
    await loadCards()
    startCreate()
  } catch (e) {
    reportError(e)
  } finally {
    loading.value = false
  }
}

watch(levelId, async () => {
  subjectId.value = ''
  chapterId.value = ''
  capsuleId.value = ''
  await loadSubjectsSafely()
})

async function loadSubjectsSafely() {
  loading.value = true
  try {
    await loadSubjects()
    await loadChapters()
    await loadCapsules()
    await loadCards()
    startCreate()
  } catch (e) {
    reportError(e)
  } finally {
    loading.value = false
  }
}

watch(subjectId, async () => {
  chapterId.value = ''
  capsuleId.value = ''
  loading.value = true
  try {
    await loadChapters()
    await loadCapsules()
    await loadCards()
    startCreate()
  } catch (e) {
    reportError(e)
  } finally {
    loading.value = false
  }
})

watch(chapterId, async () => {
  capsuleId.value = ''
  loading.value = true
  try {
    await loadCapsules()
    await loadCards()
    startCreate()
  } catch (e) {
    reportError(e)
  } finally {
    loading.value = false
  }
})

watch(capsuleId, () => {
  if (!editing.value && section.value === 'cards') startCreate()
})

watch(section, () => {
  search.value = ''
  startCreate()
})

function missingParent() {
  if (section.value === 'subjects' && !levelId.value) return 'Sélectionne une classe.'
  if (section.value === 'chapters' && !subjectId.value) return 'Sélectionne une matière.'
  if (['capsules', 'cards'].includes(section.value) && !chapterId.value) return 'Sélectionne un chapitre.'
  return ''
}

function payloadForSave() {
  const data = { ...form.value }

  if (section.value === 'subjects') {
    data.level_id = levelId.value
    data.name = String(data.name || '').trim()
    data.emoji = String(data.emoji || '').trim() || null
    data.coefficient = Number(data.coefficient)
    data.position = Number(data.position)
    data.is_active = Boolean(data.is_active)
  }

  if (section.value === 'chapters') {
    data.subject_id = subjectId.value
    data.title = String(data.title || '').trim()
    data.position = Number(data.position)
  }

  if (section.value === 'capsules') {
    data.chapter_id = chapterId.value
    data.title = String(data.title || '').trim()
    data.body = String(data.body || '').trim()
    data.minutes = Number(data.minutes)
    data.position = Number(data.position)
    data.is_high_yield = Boolean(data.is_high_yield)
  }

  if (section.value === 'cards') {
    data.chapter_id = chapterId.value
    data.capsule_id = capsuleId.value || null
    data.front = String(data.front || '').trim()
    data.back = String(data.back || '').trim() || null
    data.explanation = String(data.explanation || '').trim() || null
    data.position = Number(data.position)
    data.is_high_yield = Boolean(data.is_high_yield)

    if (data.kind === 'qcm') {
      data.choices = String(data.choicesText || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      data.correct_index = Number(data.correct_index)
    } else {
      data.choices = null
      data.correct_index = null
    }
  }

  delete data.id
  delete data.updated_at
  delete data.choicesText
  return data
}

function validate(data) {
  if (section.value === 'subjects' && !data.name) return 'Le nom de la matière est obligatoire.'
  if (section.value === 'chapters' && !data.title) return 'Le titre du chapitre est obligatoire.'
  if (section.value === 'capsules' && !data.title) return 'Le titre de la capsule est obligatoire.'
  if (section.value === 'capsules' && !data.body) return 'Le contenu de la capsule est obligatoire.'
  if (section.value === 'cards' && !data.front) return 'Le recto de la carte est obligatoire.'

  if (section.value === 'cards' && data.kind === 'qcm') {
    if (!data.choices || data.choices.length !== 4) return 'Un QCM doit avoir exactement quatre choix non vides.'
    if (!Number.isInteger(data.correct_index) || data.correct_index < 0 || data.correct_index > 3) {
      return 'Choisis une bonne réponse entre les indices 0 et 3.'
    }
  }

  if (section.value === 'capsules' && (data.minutes < 1 || data.minutes > 10)) {
    return 'La durée doit être comprise entre 1 et 10 minutes.'
  }

  return ''
}

async function loadSectionData() {
  if (section.value === 'subjects') return loadSubjects()
  if (section.value === 'chapters') return loadChapters()
  if (section.value === 'capsules') return loadCapsules()
  if (section.value === 'cards') return loadCards()
}

async function saveItem() {
  const parentError = missingParent()
  if (parentError) return reportError(parentError)

  const data = payloadForSave()
  const validationError = validate(data)
  if (validationError) return reportError(validationError)

  saving.value = true
  error.value = ''
  notice.value = ''

  try {
    let result

    if (editing.value && selectedId.value) {
      result = await supabase
        .from(definition.value.table)
        .update(data)
        .eq('id', selectedId.value)
    } else {
      result = await supabase
        .from(definition.value.table)
        .insert(data)
    }

    throwIf(result)
    await loadSectionData()
    startCreate()
    reportSuccess(`${definition.value.singular.charAt(0).toUpperCase()}${definition.value.singular.slice(1)} enregistrée avec succès.`)
  } catch (e) {
    reportError(e)
  } finally {
    saving.value = false
  }
}

async function deleteItem(item) {
  const label = currentLabel(item)
  if (!window.confirm(`Supprimer « ${label} » ? Si des contenus y sont liés, Supabase peut refuser cette suppression.`)) return

  saving.value = true
  error.value = ''
  notice.value = ''

  try {
    throwIf(await supabase
      .from(definition.value.table)
      .delete()
      .eq('id', item.id))

    if (selectedId.value === item.id) startCreate()
    await loadSectionData()
    reportSuccess('Élément supprimé.')
  } catch (e) {
    reportError(e)
  } finally {
    saving.value = false
  }
}

onMounted(reloadAll)
</script>

<template>
  <section class="content-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">ESPACE PÉDAGOGIQUE</p>
        <h1>Bibliothèque des contenus</h1>
        <p class="lead">Organise les contenus réellement utilisés par l’application KALYNO.</p>
      </div>
      <button class="btn ghost" :disabled="loading" @click="reloadAll">↻ Actualiser</button>
    </header>

    <div class="content-tabs">
      <button v-for="(d, key) in definitions" :key="key"
        :class="{ on: section === key }" @click="section = key">
        <span>{{ { subjects: '▦', chapters: '▤', capsules: '◈', cards: '▧' }[key] }}</span>
        {{ d.label }}
        <small>{{ { subjects: subjects.length, chapters: chapters.length, capsules: capsules.length, cards: cards.length }[key] }}</small>
      </button>
    </div>

    <div class="content-filters">
      <label>
        <span>Classe</span>
        <select v-model="levelId">
          <option value="">Choisir une classe</option>
          <option v-for="l in levels" :key="l.id" :value="l.id">{{ l.label }}</option>
        </select>
      </label>

      <label v-if="section !== 'subjects'">
        <span>Matière</span>
        <select v-model="subjectId" :disabled="!subjects.length">
          <option value="">Choisir une matière</option>
          <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.emoji || '📘' }} {{ s.name }}</option>
        </select>
      </label>

      <label v-if="['capsules', 'cards'].includes(section)">
        <span>Chapitre</span>
        <select v-model="chapterId" :disabled="!chapters.length">
          <option value="">Choisir un chapitre</option>
          <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
      </label>

      <label v-if="section === 'cards'">
        <span>Capsule associée (facultatif)</span>
        <select v-model="capsuleId">
          <option value="">Aucune capsule spécifique</option>
          <option v-for="c in capsules" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
      </label>
    </div>

    <p v-if="error" class="msg err">{{ error }}</p>
    <p v-if="notice" class="msg ok">{{ notice }}</p>

    <div v-if="loading" class="loading-line">Chargement des données Supabase…</div>

    <div v-else class="content-layout">
      <section class="content-list panel">
        <div class="list-heading">
          <div>
            <h2>{{ definition.label }}</h2>
            <p>{{ currentRows.length }} élément(s)</p>
          </div>
          <button class="btn" :disabled="!!missingParent()" @click="startCreate">+ Ajouter</button>
        </div>

        <input v-model="search" class="search-input" placeholder="Rechercher dans les contenus…" />

        <button v-for="item in currentRows" :key="item.id"
          class="content-item" :class="{ selected: selectedId === item.id }"
          @click="startEdit(item)">
          <span class="content-item-icon">
            {{ section === 'subjects' ? (item.emoji || '📘') : section === 'chapters' ? '▤' : section === 'capsules' ? '◈' : '▧' }}
          </span>
          <span class="content-item-main">
            <strong>{{ currentLabel(item) }}</strong>
            <small v-if="section === 'subjects'">Coefficient {{ item.coefficient }} · {{ item.is_active ? 'Active' : 'Inactive' }}</small>
            <small v-else-if="section === 'chapters'">{{ item.status === 'published' ? 'Publié' : 'Brouillon' }}</small>
            <small v-else-if="section === 'capsules'">{{ item.minutes }} min · {{ item.is_high_yield ? 'Notion essentielle' : 'Capsule' }}</small>
            <small v-else>{{ { flashcard: 'Flashcard', qcm: 'QCM', cloze: 'Texte à compléter' }[item.kind] || item.kind }}</small>
          </span>
          <span class="item-arrow">›</span>
        </button>

        <p v-if="!currentRows.length" class="empty-state">
          Aucun contenu enregistré pour cette sélection.
        </p>
      </section>

      <section class="content-editor panel">
        <div class="editor-heading">
          <div>
            <p class="eyebrow">{{ editing ? 'MODIFICATION' : 'NOUVEAU CONTENU' }}</p>
            <h2>{{ editing ? currentLabel(form) : `Créer ${definition.singular}` }}</h2>
          </div>
          <span class="badge" :class="editing ? 'published' : 'draft'">
            {{ editing ? 'En édition' : 'Non enregistré' }}
          </span>
        </div>

        <form class="editor-form" @submit.prevent="saveItem">
          <template v-for="field in definition.fields" :key="field.key">
            <label v-if="field.type !== 'checkbox'" class="field">
              <span>{{ field.label }} <b v-if="field.required">*</b></span>

              <select v-if="field.type === 'select'" v-model="form[field.key]" :required="field.required">
                <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>

              <textarea v-else-if="field.type === 'textarea'"
                v-model="form[field.key]" rows="5" :required="field.required"
                :placeholder="field.label"></textarea>

              <input v-else v-model="form[field.key]" :type="field.type"
                :min="field.min" :max="field.max" :step="field.step"
                :required="field.required" :placeholder="field.label" />
            </label>

            <label v-else class="check-field">
              <input v-model="form[field.key]" type="checkbox" />
              <span>{{ field.label }}</span>
            </label>
          </template>

          <p v-if="section === 'cards' && form.kind === 'qcm'" class="hint">
            Écris quatre choix, un par ligne. L’indice de la bonne réponse commence à 0 :
            0 = premier choix, 1 = deuxième, 2 = troisième, 3 = quatrième.
          </p>

          <p v-if="section === 'cards'" class="hint">
            La carte sera liée au chapitre sélectionné et, si choisi, à la capsule sélectionnée.
          </p>

          <div class="editor-actions">
            <button class="btn" type="submit" :disabled="saving || !!missingParent()">
              {{ saving ? 'Enregistrement…' : editing ? 'Enregistrer les modifications' : 'Créer le contenu' }}
            </button>
            <button class="btn ghost" type="button" @click="startCreate">Annuler</button>
            <button v-if="editing" class="btn danger" type="button" :disabled="saving"
              @click="deleteItem(currentRows.find(x => x.id === selectedId) || form)">
              Supprimer
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>
