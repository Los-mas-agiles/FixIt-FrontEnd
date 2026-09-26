<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <svg class="ic" aria-hidden="true" focusable="false"><use :href="`#i-${name}`" /></svg>
</template>
