<script setup>
import { ref, onMounted } from 'vue'
import { breakroom } from '@/stores/breakroom.js'
import { chat } from '@/stores/chat.js'

const emit = defineEmits(['close', 'added'])

const blockType = ref('chat')
const selectedRoom = ref(null)
const blockWidth = ref(2)
const blockHeight = ref(2)
const customTitle = ref('')
const loading = ref(false)
const error = ref('')

// Fetch rooms when modal opens
onMounted(async () => {
  if (chat.rooms.length === 0) {
    await chat.fetchRooms()
  }
  if (chat.rooms.length > 0) {
    selectedRoom.value = chat.rooms[0].id
  }
})

const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    // Validate
    if (blockType.value === 'chat' && !selectedRoom.value) {
      throw new Error('Please select a chat room')
    }

    // Find next available position (simple: just put at y=0, x based on count)
    const nextX = breakroom.blocks.length % 5
    const nextY = Math.floor(breakroom.blocks.length / 5) * 2

    await breakroom.addBlock(
      blockType.value,
      blockType.value === 'chat' ? selectedRoom.value : null,
      {
        x: nextX,
        y: nextY,
        w: blockWidth.value,
        h: blockHeight.value,
        title: customTitle.value || null
      }
    )

    emit('added')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h2>Add Block</h2>

      <form @submit.prevent="handleSubmit">
        <!-- Block Type -->
        <div class="form-group">
          <label>Block Type</label>
          <div class="type-options">
            <label class="type-option" :class="{ selected: blockType === 'chat' }">
              <input type="radio" v-model="blockType" value="chat" />
              <span class="type-label">Chat Room</span>
              <span class="type-desc">Embed a chat room</span>
            </label>
            <label class="type-option" :class="{ selected: blockType === 'placeholder' }">
              <input type="radio" v-model="blockType" value="placeholder" />
              <span class="type-label">Placeholder</span>
              <span class="type-desc">Empty block for later</span>
            </label>
          </div>
        </div>

        <!-- Chat Room Selection -->
        <div v-if="blockType === 'chat'" class="form-group">
          <label for="room">Chat Room</label>
          <select id="room" v-model="selectedRoom" required>
            <option v-for="room in chat.rooms" :key="room.id" :value="room.id">
              # {{ room.name }}
            </option>
          </select>
        </div>

        <!-- Size Options -->
        <div class="form-row">
          <div class="form-group">
            <label for="width">Width</label>
            <select id="width" v-model="blockWidth">
              <option :value="1">1 column</option>
              <option :value="2">2 columns</option>
              <option :value="3">3 columns</option>
              <option :value="4">4 columns</option>
              <option :value="5">5 columns</option>
            </select>
          </div>
          <div class="form-group">
            <label for="height">Height</label>
            <select id="height" v-model="blockHeight">
              <option :value="1">1 row</option>
              <option :value="2">2 rows</option>
              <option :value="3">3 rows</option>
              <option :value="4">4 rows</option>
            </select>
          </div>
        </div>

        <!-- Custom Title -->
        <div class="form-group">
          <label for="title">Custom Title (optional)</label>
          <input
            id="title"
            type="text"
            v-model="customTitle"
            placeholder="Leave empty to use default"
            maxlength="64"
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="modal-actions">
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Adding...' : 'Add Block' }}
          </button>
          <button type="button" class="btn-secondary" @click="emit('close')">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 25px;
  border-radius: 10px;
  width: 450px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin: 0 0 20px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #444;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.type-options {
  display: flex;
  gap: 10px;
}

.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-option:hover {
  border-color: #42b983;
}

.type-option.selected {
  border-color: #42b983;
  background: #f0fff8;
}

.type-option input {
  display: none;
}

.type-label {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.type-desc {
  font-size: 0.8rem;
  color: #888;
}

select,
input[type="text"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}

select:focus,
input[type="text"]:focus {
  outline: none;
  border-color: #42b983;
}

.error {
  color: #c00;
  margin: 0 0 15px;
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-primary {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary:hover:not(:disabled) {
  background: #3aa876;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #ddd;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-secondary:hover {
  background: #ccc;
}
</style>
