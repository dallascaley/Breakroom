<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { chat } from '@/stores/chat.js'
import { user } from '@/stores/user.js'
import ChatSidebar from '@/components/ChatSidebar.vue'

const messageInput = ref('')
const messagesContainer = ref(null)
const typingTimeout = ref(null)

// Get current room info
const currentRoom = computed(() => {
  return chat.rooms.find(r => r.id === chat.currentRoom)
})

const currentRoomName = computed(() => {
  return currentRoom.value ? currentRoom.value.name : 'Chat'
})

const currentRoomDescription = computed(() => {
  return currentRoom.value ? currentRoom.value.description : null
})

// Auto-scroll to bottom when new messages arrive
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Watch for new messages
watch(() => chat.messages.length, () => {
  scrollToBottom()
})

// Handle sending a message
const sendMessage = () => {
  if (messageInput.value.trim()) {
    chat.sendMessage(messageInput.value)
    messageInput.value = ''
    chat.stopTyping()
  }
}

// Handle typing indicator
const handleTyping = () => {
  chat.startTyping()

  // Clear existing timeout
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }

  // Stop typing after 2 seconds of no input
  typingTimeout.value = setTimeout(() => {
    chat.stopTyping()
  }, 2000)
}

// Format timestamp
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Check if message is from current user
const isOwnMessage = (handle) => {
  return handle === user.username
}

onMounted(async () => {
  // Connect to socket
  chat.connect()

  // Fetch user info and permissions
  await Promise.all([
    chat.fetchCurrentUser(),
    chat.checkCreatePermission()
  ])

  // Fetch rooms and join the General room (id=1)
  await chat.fetchRooms()
  if (chat.rooms.length > 0) {
    await chat.joinRoom(chat.rooms[0].id)
    scrollToBottom()
  }
})

onUnmounted(() => {
  chat.leaveRoom()
  chat.disconnect()
})
</script>

<template>
  <main class="chat-page page-container">
    <div class="chat-layout">
      <ChatSidebar />
      <div class="chat-container">
        <div class="chat-header">
          <div class="room-info">
            <h2># {{ currentRoomName }}</h2>
            <p v-if="currentRoomDescription" class="room-description">{{ currentRoomDescription }}</p>
          </div>
          <span class="connection-status" :class="{ connected: chat.connected }">
            {{ chat.connected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>

      <div class="messages-container" ref="messagesContainer">
        <div v-if="chat.messages.length === 0" class="no-messages">
          No messages yet. Start the conversation!
        </div>

        <div
          v-for="msg in chat.messages"
          :key="msg.id"
          class="message"
          :class="{ own: isOwnMessage(msg.handle) }"
        >
          <div class="message-header">
            <span class="message-author">{{ msg.handle }}</span>
            <span class="message-time">{{ formatTime(msg.created_at) }}</span>
          </div>
          <div class="message-content">{{ msg.message }}</div>
        </div>
      </div>

      <div v-if="chat.typingUsers.length > 0" class="typing-indicator">
        {{ chat.typingUsers.join(', ') }} {{ chat.typingUsers.length === 1 ? 'is' : 'are' }} typing...
      </div>

      <div class="message-input-container">
        <input
          v-model="messageInput"
          @keyup.enter="sendMessage"
          @input="handleTyping"
          type="text"
          placeholder="Type a message..."
          maxlength="1000"
          :disabled="!chat.connected"
        />
        <button @click="sendMessage" :disabled="!chat.connected || !messageInput.trim()">
          Send
        </button>
      </div>

      <div v-if="chat.error" class="error-message">
        {{ chat.error }}
        <button @click="chat.clearError" class="dismiss-btn">Dismiss</button>
      </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.chat-page {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

.chat-layout {
  display: flex;
  height: calc(100vh - 120px);
  min-height: 500px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.chat-container {
  flex: 1;
  background: white;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.chat-header h2 {
  margin: 0;
  color: #333;
}

.room-description {
  margin: 4px 0 0 0;
  font-size: 0.85em;
  color: #666;
}

.connection-status {
  font-size: 0.8em;
  padding: 4px 10px;
  border-radius: 12px;
  background: #ff6b6b;
  color: white;
}

.connection-status.connected {
  background: #51cf66;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.no-messages {
  text-align: center;
  color: #999;
  margin-top: 40px;
}

.message {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 15px;
  background: #f0f0f0;
  align-self: flex-start;
}

.message.own {
  background: #42b983;
  color: white;
  align-self: flex-end;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 0.75em;
  opacity: 0.8;
}

.message-author {
  font-weight: bold;
}

.message-time {
  margin-left: 10px;
}

.message-content {
  word-wrap: break-word;
  line-height: 1.4;
}

.typing-indicator {
  padding: 5px 20px;
  font-size: 0.85em;
  color: #888;
  font-style: italic;
}

.message-input-container {
  display: flex;
  padding: 15px;
  border-top: 1px solid #eee;
  gap: 10px;
}

.message-input-container input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 25px;
  font-size: 1em;
  outline: none;
}

.message-input-container input:focus {
  border-color: #42b983;
}

.message-input-container input:disabled {
  background: #f5f5f5;
}

.message-input-container button {
  padding: 12px 25px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 1em;
}

.message-input-container button:hover:not(:disabled) {
  background: #3aa876;
}

.message-input-container button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  padding: 10px 20px;
  background: #ffe0e0;
  color: #c00;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
}

.dismiss-btn {
  background: none;
  border: none;
  color: #c00;
  cursor: pointer;
  text-decoration: underline;
}
</style>
