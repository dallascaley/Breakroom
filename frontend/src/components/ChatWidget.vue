<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { io } from 'socket.io-client'

const props = defineProps({
  roomId: {
    type: Number,
    required: true
  }
})

// Local state for this widget
const messages = ref([])
const newMessage = ref('')
const typingUsers = ref([])
const loading = ref(true)
const error = ref(null)
const messagesContainer = ref(null)

// Socket reference
let socket = null
let typingTimeout = null

// Scroll to bottom of messages
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Fetch messages via REST
const fetchMessages = async () => {
  try {
    loading.value = true
    const res = await fetch(`/api/chat/rooms/${props.roomId}/messages?limit=50`, {
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to fetch messages')
    const data = await res.json()
    messages.value = data.messages
    scrollToBottom()
  } catch (err) {
    console.error('ChatWidget: Error fetching messages:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Send message
const sendMessage = async () => {
  if (!newMessage.value.trim()) return

  const messageText = newMessage.value.trim()
  newMessage.value = ''

  // Stop typing indicator
  if (socket && socket.connected) {
    socket.emit('typing_stop', props.roomId)
  }

  try {
    // Try socket first
    if (socket && socket.connected) {
      socket.emit('send_message', {
        roomId: props.roomId,
        message: messageText
      })
    } else {
      // Fallback to REST
      const res = await fetch(`/api/chat/rooms/${props.roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: messageText })
      })
      if (!res.ok) throw new Error('Failed to send message')
      const data = await res.json()
      // Add message locally since we won't get socket event
      const exists = messages.value.some(m => m.id === data.message.id)
      if (!exists) {
        messages.value.push(data.message)
        scrollToBottom()
      }
    }
  } catch (err) {
    console.error('ChatWidget: Error sending message:', err)
    error.value = err.message
  }
}

// Handle typing
const onInput = () => {
  if (socket && socket.connected) {
    socket.emit('typing_start', props.roomId)

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Stop typing after 2 seconds of no input
    typingTimeout = setTimeout(() => {
      if (socket && socket.connected) {
        socket.emit('typing_stop', props.roomId)
      }
    }, 2000)
  }
}

// Format timestamp
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Setup socket connection
const setupSocket = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  socket = io(baseUrl, {
    withCredentials: true,
    autoConnect: true
  })

  socket.on('connect', () => {
    console.log(`ChatWidget[${props.roomId}]: Socket connected`)
    socket.emit('join_room', props.roomId)
  })

  socket.on('new_message', (data) => {
    if (data.roomId === props.roomId) {
      const exists = messages.value.some(m => m.id === data.message.id)
      if (!exists) {
        messages.value.push(data.message)
        scrollToBottom()
      }
    }
  })

  socket.on('user_typing', (data) => {
    if (!typingUsers.value.includes(data.user)) {
      typingUsers.value.push(data.user)
    }
  })

  socket.on('user_stopped_typing', (data) => {
    typingUsers.value = typingUsers.value.filter(u => u !== data.user)
  })

  socket.on('error', (data) => {
    console.error(`ChatWidget[${props.roomId}]: Socket error:`, data.message)
    error.value = data.message
  })
}

// Cleanup socket
const cleanupSocket = () => {
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }
  if (socket) {
    socket.emit('leave_room', props.roomId)
    socket.disconnect()
    socket = null
  }
}

onMounted(() => {
  fetchMessages()
  setupSocket()
})

onUnmounted(() => {
  cleanupSocket()
})

// If roomId changes, rejoin
watch(() => props.roomId, (newRoomId, oldRoomId) => {
  if (oldRoomId && socket && socket.connected) {
    socket.emit('leave_room', oldRoomId)
  }
  messages.value = []
  typingUsers.value = []
  fetchMessages()
  if (socket && socket.connected) {
    socket.emit('join_room', newRoomId)
  }
})
</script>

<template>
  <div class="chat-widget">
    <div v-if="loading" class="loading">
      Loading messages...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <template v-else>
      <div ref="messagesContainer" class="messages">
        <div v-if="messages.length === 0" class="no-messages">
          No messages yet. Start the conversation!
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message"
        >
          <div class="message-header">
            <span class="username">{{ msg.username }}</span>
            <span class="time">{{ formatTime(msg.created_at) }}</span>
          </div>
          <div class="message-content">{{ msg.message }}</div>
        </div>
      </div>

      <div v-if="typingUsers.length > 0" class="typing-indicator">
        {{ typingUsers.join(', ') }} {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...
      </div>

      <form class="input-area" @submit.prevent="sendMessage">
        <input
          v-model="newMessage"
          type="text"
          placeholder="Type a message..."
          maxlength="2000"
          @input="onInput"
        />
        <button type="submit" :disabled="!newMessage.trim()">
          Send
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.chat-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f9f9f9;
}

.loading,
.error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 0.9rem;
  padding: 20px;
}

.error {
  color: #c00;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 0.85rem;
  text-align: center;
}

.message {
  background: white;
  padding: 8px 10px;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.username {
  font-weight: 600;
  font-size: 0.8rem;
  color: #2e86de;
}

.time {
  font-size: 0.7rem;
  color: #aaa;
}

.message-content {
  font-size: 0.85rem;
  color: #333;
  word-wrap: break-word;
}

.typing-indicator {
  padding: 4px 10px;
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
  background: #f0f0f0;
}

.input-area {
  display: flex;
  gap: 6px;
  padding: 8px;
  background: white;
  border-top: 1px solid #eee;
}

.input-area input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
}

.input-area input:focus {
  outline: none;
  border-color: #42b983;
}

.input-area button {
  padding: 8px 14px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}

.input-area button:hover:not(:disabled) {
  background: #3aa876;
}

.input-area button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
