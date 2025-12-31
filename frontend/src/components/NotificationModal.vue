<template>
  <div v-if="notifications.currentModal" class="modal-overlay">
    <div class="notification-modal">
      <div class="modal-header">
        <span v-if="currentModal.type_name" class="type-badge">
          {{ currentModal.type_name }}
        </span>
        <h2>{{ currentModal.title }}</h2>
      </div>

      <div class="modal-body">
        <div class="content" v-html="formatContent(currentModal.content)"></div>
      </div>

      <div class="modal-footer">
        <span class="timestamp">{{ formatDate(currentModal.created_at) }}</span>
        <button @click="dismiss" class="dismiss-button">
          Acknowledge
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { notifications } from '@/stores/notification'

const currentModal = computed(() => notifications.currentModal)

function dismiss() {
  if (currentModal.value) {
    notifications.dismiss(currentModal.value.id)
  }
}

function formatContent(content) {
  if (!content) return ''
  // Basic markdown-like formatting and escape HTML
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.notification-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.type-badge {
  display: inline-block;
  background: #42b983;
  color: white;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.content {
  font-size: 15px;
  line-height: 1.6;
  color: #444;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timestamp {
  font-size: 12px;
  color: #888;
}

.dismiss-button {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}

.dismiss-button:hover {
  background: #369970;
}
</style>
