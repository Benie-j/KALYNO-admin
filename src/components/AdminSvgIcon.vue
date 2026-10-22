<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 }
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="admin-svg-icon"
  >
    <template v-if="name === 'layout-dashboard'">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </template>
    <template v-else-if="name === 'layers'">
      <path d="m12 3 9 5-9 5-9-5 9-5z"/>
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>
    </template>
    <template v-else-if="name === 'book-open'">
      <path d="M12 7v14M3 5h5a4 4 0 0 1 4 4v12a4 4 0 0 0-4-4H3z"/>
      <path d="M21 5h-5a4 4 0 0 0-4 4v12a4 4 0 0 1 4-4h5z"/>
    </template>
    <template v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="1"/>
    </template>
    <template v-else-if="name === 'log-out'">
      <path d="M10 17l5-5-5-5M15 12H3"/>
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M4 6h16M4 12h16M4 18h16"/>
    </template>
    <template v-else-if="name === 'chart-column'">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 8v8M8 12h8"/>
    </template>
  </svg>
</template>
