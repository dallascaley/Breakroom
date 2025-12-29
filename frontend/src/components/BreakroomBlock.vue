<script setup>
import { computed } from 'vue'
import ChatWidget from './ChatWidget.vue'

const props = defineProps({
  block: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['remove'])

// Determine block title
const blockTitle = computed(() => {
  if (props.block.title) {
    return props.block.title
  }
  if (props.block.block_type === 'chat' && props.block.content_name) {
    return `# ${props.block.content_name}`
  }
  if (props.block.block_type === 'placeholder') {
    return 'Placeholder'
  }
  return 'Block'
})

// Get block type icon/label
const blockTypeLabel = computed(() => {
  switch (props.block.block_type) {
    case 'chat': return 'Chat'
    case 'placeholder': return 'Empty'
    default: return props.block.block_type
  }
})
</script>

<template>
  <div class="breakroom-block">
    <div class="block-header">
      <span class="block-title">{{ blockTitle }}</span>
      <div class="block-actions">
        <span class="block-type">{{ blockTypeLabel }}</span>
        <button class="remove-btn" @click="emit('remove')" title="Remove block">
          &times;
        </button>
      </div>
    </div>
    <div class="block-content">
      <!-- Chat block -->
      <ChatWidget
        v-if="block.block_type === 'chat' && block.content_id"
        :room-id="block.content_id"
      />

      <!-- Placeholder block -->
      <div v-else-if="block.block_type === 'placeholder'" class="placeholder-content">
        <p>Empty Block</p>
        <p class="hint">This is a placeholder for future content</p>
      </div>

      <!-- Unknown block type -->
      <div v-else class="unknown-content">
        <p>Unknown block type: {{ block.block_type }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.breakroom-block {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #2c3e50;
  color: white;
  cursor: move;
  flex-shrink: 0;
}

.block-title {
  font-weight: 500;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.block-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.block-type {
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
}

.remove-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0.7;
  line-height: 1;
}

.remove-btn:hover {
  opacity: 1;
  color: #ff6b6b;
}

.block-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.placeholder-content,
.unknown-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #f9f9f9;
  color: #888;
  text-align: center;
  padding: 20px;
}

.placeholder-content p,
.unknown-content p {
  margin: 0;
}

.placeholder-content .hint {
  font-size: 0.85rem;
  margin-top: 8px;
  color: #aaa;
}
</style>
