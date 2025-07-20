<template>
  <div>
    <slot v-if="data" :data="data" />
    <p v-else-if="loading">Loading...</p>
    <p v-else-if="error">Error: {{ error }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'

const props = defineProps({
  endpoint: {
    type: String,
    required: true
  }
})

const data = ref(null)
const error = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await axios.get(props.endpoint)
    data.value = res.data
  } catch (e) {
    error.value = e.message || 'Failed to load data'
  } finally {
    loading.value = false
  }
})
</script>
