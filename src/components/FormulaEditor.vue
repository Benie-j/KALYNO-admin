<script setup>
import { ref, computed, nextTick } from 'vue'
import { renderRich } from '../rich'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  rows: { type: Number, default: 4 },
  placeholder: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const area = ref(null)
const group = ref(0)
const html = computed(() => renderRich(props.modelValue))

const GROUPS = [
  {
    name: 'Maths',
    items: [
      { label: 'a⁄b', title: 'Fraction', tex: '\\frac{}{}' },
      { label: '√', title: 'Racine carrée', tex: '\\sqrt{}' },
      { label: 'xⁿ', title: 'Puissance', tex: '^{}' },
      { label: 'xₙ', title: 'Indice', tex: '_{}' },
      { label: 'Σ', title: 'Somme', tex: '\\sum_{i=1}^{n}' },
      { label: '∫', title: 'Intégrale', tex: '\\int_{a}^{b} f(x)\\,dx' },
      { label: 'lim', title: 'Limite', tex: '\\lim_{x \\to a}' },
      { label: 'u⃗', title: 'Vecteur', tex: '\\vec{}' },
      { label: 'AB̅', title: 'Segment / barre', tex: '\\overline{}' },
      { label: 'ABC^', title: 'Angle', tex: '\\widehat{}' },
      { label: '|x|', title: 'Valeur absolue', tex: '\\left|{}\\right|' },
      { label: '( )', title: 'Parenthèses adaptatives', tex: '\\left({}\\right)' },
      { label: 'Cₙᵏ', title: 'Combinaison', tex: '\\binom{n}{k}' },
      { label: '{ système', title: 'Système', tex: '\\begin{cases} a \\\\ b \\end{cases}' },
      { label: 'ln', title: 'Logarithme népérien', tex: '\\ln' },
      { label: 'sin', title: 'Sinus', tex: '\\sin' }
    ]
  },
  {
    name: 'Symboles',
    items: [
      { label: '×', title: 'Multiplier', tex: '\\times' },
      { label: '÷', title: 'Diviser', tex: '\\div' },
      { label: '±', title: 'Plus ou moins', tex: '\\pm' },
      { label: '≤', title: 'Inférieur ou égal', tex: '\\leq' },
      { label: '≥', title: 'Supérieur ou égal', tex: '\\geq' },
      { label: '≠', title: 'Différent', tex: '\\neq' },
      { label: '≈', title: 'Environ', tex: '\\approx' },
      { label: '∞', title: 'Infini', tex: '\\infty' },
      { label: 'π', title: 'Pi', tex: '\\pi' },
      { label: 'α', title: 'Alpha', tex: '\\alpha' },
      { label: 'β', title: 'Bêta', tex: '\\beta' },
      { label: 'θ', title: 'Thêta', tex: '\\theta' },
      { label: 'λ', title: 'Lambda', tex: '\\lambda' },
      { label: 'Δ', title: 'Delta', tex: '\\Delta' },
      { label: 'Ω', title: 'Oméga', tex: '\\Omega' },
      { label: '∈', title: 'Appartient', tex: '\\in' },
      { label: 'ℝ', title: 'Réels', tex: '\\mathbb{R}' },
      { label: 'ℕ', title: 'Entiers naturels', tex: '\\mathbb{N}' },
      { label: '∀', title: 'Pour tout', tex: '\\forall' },
      { label: '∃', title: 'Il existe', tex: '\\exists' },
      { label: '∩', title: 'Intersection', tex: '\\cap' },
      { label: '∪', title: 'Réunion', tex: '\\cup' },
      { label: '→', title: 'Flèche', tex: '\\rightarrow' },
      { label: '⇒', title: 'Implique', tex: '\\Rightarrow' },
      { label: '⇔', title: 'Équivaut', tex: '\\Leftrightarrow' },
      { label: '°', title: 'Degré', tex: '^{\\circ}' }
    ]
  },
  {
    name: 'Physique-Chimie',
    items: [
      { label: 'H₂O', title: 'Formule chimique', tex: '\\mathrm{H_2O}' },
      { label: 'CO₂', title: 'Dioxyde de carbone', tex: '\\mathrm{CO_2}' },
      { label: 'Na⁺', title: 'Ion', tex: '\\mathrm{Na^{+}}' },
      { label: '⟶', title: 'Réaction', tex: '\\longrightarrow' },
      { label: '⇌', title: 'Équilibre', tex: '\\rightleftharpoons' },
      { label: '°C', title: 'Degré Celsius', tex: '^{\\circ}\\mathrm{C}' },
      { label: 'mol·L⁻¹', title: 'Concentration', tex: '\\mathrm{mol\\cdot L^{-1}}' },
      { label: 'm·s⁻²', title: 'Accélération', tex: '\\mathrm{m\\cdot s^{-2}}' },
      { label: 'ΔE', title: 'Variation', tex: '\\Delta E' },
      { label: 'F⃗', title: 'Force (vecteur)', tex: '\\vec{F}' },
      { label: 'ρ', title: 'Rho (masse volumique)', tex: '\\rho' },
      { label: 'μ', title: 'Mu', tex: '\\mu' }
    ]
  }
]

// Insère une formule à la position du curseur.
// Hors d'une formule, elle est entourée de $...$ automatiquement.
function insert(tex) {
  const el = area.value
  const value = props.modelValue
  const start = el.selectionStart
  const end = el.selectionEnd
  const before = value.slice(0, start)
  const inside = (before.replace(/\\\$/g, '').match(/\$/g) || []).length % 2 === 1
  const selected = value.slice(start, end)

  let snippet = tex
  if (selected && snippet.includes('{}')) snippet = snippet.replace('{}', '{' + selected + '}')

  const piece = inside ? snippet : '$' + snippet + '$'
  emit('update:modelValue', before + piece + value.slice(end))

  const hole = !selected && snippet.includes('{}') ? snippet.indexOf('{}') + 1 : snippet.length
  const pos = start + (inside ? 0 : 1) + hole
  nextTick(() => {
    el.focus()
    el.setSelectionRange(pos, pos)
  })
}

function insertBlock() {
  const el = area.value
  const value = props.modelValue
  const start = el.selectionStart
  const end = el.selectionEnd
  emit('update:modelValue', value.slice(0, start) + '\n$$\n\n$$\n' + value.slice(end))
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + 4, start + 4)
  })
}
</script>

<template>
  <div class="fe">
    <label v-if="label" class="fe-label">{{ label }}</label>
    <div class="fe-tabs">
      <button
        v-for="(g, i) in GROUPS"
        :key="g.name"
        type="button"
        :class="{ on: group === i }"
        @click="group = i"
      >{{ g.name }}</button>
      <button type="button" class="block" @click="insertBlock">Bloc centré</button>
    </div>
    <div class="fe-tools">
      <button
        v-for="it in GROUPS[group].items"
        :key="it.title"
        type="button"
        :title="it.title"
        @click="insert(it.tex)"
      >{{ it.label }}</button>
    </div>
    <textarea
      ref="area"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      @input="emit('update:modelValue', $event.target.value)"
    ></textarea>
    <div v-if="modelValue.trim()" class="fe-preview" v-html="html"></div>
    <p class="hint">Formules : entre dollars dans la phrase, ou en bloc centré avec le bouton « Bloc centré ». Les boutons ajoutent les dollars tout seuls.</p>
  </div>
</template>
