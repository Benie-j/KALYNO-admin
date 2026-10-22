<script setup>
import { reactive, computed, watch } from 'vue'
import FormulaEditor from './FormulaEditor.vue'
import { renderRich } from '../rich'

const props = defineProps({
  question: { type: Object, required: true },
  index: { type: Number, default: 0 },
  total: { type: Number, default: 1 },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['save', 'remove', 'move'])

const snapshot = (q) => ({
  prompt: q.prompt ?? '',
  choices: [0, 1, 2, 3].map((i) => q.choices?.[i] ?? ''),
  correct_index: q.correct_index ?? 0,
  explanation: q.explanation ?? ''
})

const draft = reactive(snapshot(props.question))
watch(() => props.question, (q) => Object.assign(draft, snapshot(q)))

const dirty = computed(
  () => JSON.stringify(snapshot(draft)) !== JSON.stringify(snapshot(props.question))
)

const errors = computed(() => {
  const list = []
  if (!draft.prompt.trim()) list.push('L’énoncé est vide.')
  if (draft.choices.some((c) => !c.trim())) list.push('Les 4 propositions doivent être remplies.')
  return list
})

function save() {
  emit('save', {
    prompt: draft.prompt.trim(),
    choices: draft.choices.map((c) => c.trim()),
    correct_index: draft.correct_index,
    explanation: draft.explanation.trim() || null
  })
}
</script>

<template>
  <div class="qe" :class="{ dirty }">
    <div class="qe-head">
      <strong>Question {{ index + 1 }}</strong>
      <span v-if="!question.id" class="badge draft">Nouvelle</span>
      <span v-else-if="dirty" class="badge draft">Modifiée</span>
      <span class="grow"></span>
      <button class="btn ghost small" :disabled="busy || index === 0" @click="emit('move', -1)">↑</button>
      <button class="btn ghost small" :disabled="busy || index === total - 1" @click="emit('move', 1)">↓</button>
      <button class="btn danger small" :disabled="busy" @click="emit('remove')">Supprimer</button>
    </div>

    <FormulaEditor v-model="draft.prompt" label="Énoncé" :rows="3" placeholder="Écris la question…" />

    <div class="choices">
      <label class="fe-label">Propositions (coche la bonne réponse)</label>
      <div v-for="(c, i) in draft.choices" :key="i" class="choice">
        <input
          type="radio"
          :name="'ok-' + (question.id || 'new-' + index)"
          :value="i"
          v-model="draft.correct_index"
        />
        <span class="letter">{{ 'ABCD'[i] }}</span>
        <div class="choice-body">
          <input v-model="draft.choices[i]" :placeholder="'Proposition ' + 'ABCD'[i]" />
          <div v-if="c.includes('$')" class="inline-prev" v-html="renderRich(c, true)"></div>
        </div>
      </div>
    </div>

    <FormulaEditor
      v-model="draft.explanation"
      label="Explication (facultatif, affichée au verso de la carte)"
      :rows="2"
    />

    <ul v-if="errors.length" class="errs">
      <li v-for="e in errors" :key="e">{{ e }}</li>
    </ul>
    <div class="qe-foot">
      <button class="btn" :disabled="busy || !dirty || errors.length > 0" @click="save">
        Enregistrer la question
      </button>
    </div>
  </div>
</template>
