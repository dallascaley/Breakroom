import { reactive, ref } from 'vue'
import { io } from 'socket.io-client'

const state = reactive({
  socket: null,
  connected: false,
  currentRoom: null,
  rooms: [],
  messages: [],
  typingUsers: [],
  error: null
})

// Get the socket instance, creating if needed
function getSocket() {
  if (!state.socket) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
    state.socket = io(baseUrl, {
      withCredentials: true,
      autoConnect: false
    })

    // Connection events
    state.socket.on('connect', () => {
      console.log('Socket connected')
      state.connected = true
      state.error = null

      // Auto-join current room if one is set
      if (state.currentRoom) {
        console.log('Auto-joining room:', state.currentRoom)
        state.socket.emit('join_room', state.currentRoom)
      }
    })

    state.socket.on('disconnect', () => {
      console.log('Socket disconnected')
      state.connected = false
    })

    state.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
      state.error = err.message
      state.connected = false
    })

    // Chat events
    state.socket.on('new_message', (data) => {
      if (data.roomId === state.currentRoom) {
        // Prevent duplicates by checking if message ID already exists
        const exists = state.messages.some(m => m.id === data.message.id)
        if (!exists) {
          state.messages.push(data.message)
        }
      }
    })

    state.socket.on('user_joined', (data) => {
      console.log(`${data.user} joined the room`)
    })

    state.socket.on('user_left', (data) => {
      console.log(`${data.user} left the room`)
    })

    state.socket.on('user_typing', (data) => {
      if (!state.typingUsers.includes(data.user)) {
        state.typingUsers.push(data.user)
      }
    })

    state.socket.on('user_stopped_typing', (data) => {
      state.typingUsers = state.typingUsers.filter(u => u !== data.user)
    })

    state.socket.on('error', (data) => {
      console.error('Socket error:', data.message)
      state.error = data.message
    })
  }
  return state.socket
}

export const chat = reactive({
  get connected() {
    return state.connected
  },
  get currentRoom() {
    return state.currentRoom
  },
  get rooms() {
    return state.rooms
  },
  get messages() {
    return state.messages
  },
  get typingUsers() {
    return state.typingUsers
  },
  get error() {
    return state.error
  },

  // Connect to the socket server
  connect() {
    const socket = getSocket()
    if (!socket.connected) {
      socket.connect()
    }
  },

  // Disconnect from the socket server
  disconnect() {
    if (state.socket) {
      state.socket.disconnect()
    }
  },

  // Fetch available rooms via REST API
  async fetchRooms() {
    try {
      const res = await fetch('/api/chat/rooms', {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch rooms')
      const data = await res.json()
      state.rooms = data.rooms
    } catch (err) {
      console.error('Error fetching rooms:', err)
      state.error = err.message
    }
  },

  // Fetch messages for a room via REST API
  async fetchMessages(roomId, limit = 50, before = null) {
    try {
      let url = `/api/chat/rooms/${roomId}/messages?limit=${limit}`
      if (before) {
        url += `&before=${before}`
      }
      const res = await fetch(url, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      return data.messages
    } catch (err) {
      console.error('Error fetching messages:', err)
      state.error = err.message
      return []
    }
  },

  // Join a chat room
  async joinRoom(roomId) {
    // Fetch initial messages via REST
    const messages = await this.fetchMessages(roomId)
    state.messages = messages
    state.currentRoom = roomId
    state.typingUsers = []

    // Join via socket for real-time updates
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('join_room', roomId)
    }
  },

  // Leave current room
  leaveRoom() {
    if (state.currentRoom) {
      const socket = getSocket()
      if (socket.connected) {
        socket.emit('leave_room', state.currentRoom)
      }
      state.currentRoom = null
      state.messages = []
      state.typingUsers = []
    }
  },

  // Send a message
  sendMessage(message) {
    if (!state.currentRoom || !message.trim()) return

    const socket = getSocket()
    console.log('sendMessage - socket.connected:', socket.connected, 'currentRoom:', state.currentRoom)
    if (socket.connected) {
      console.log('Sending via socket')
      socket.emit('send_message', {
        roomId: state.currentRoom,
        message: message.trim()
      })
    } else {
      // Fallback to REST API
      console.log('Sending via REST (socket not connected)')
      this.sendMessageREST(message)
    }
  },

  // Send message via REST API (fallback)
  async sendMessageREST(message) {
    if (!state.currentRoom) return

    try {
      const res = await fetch(`/api/chat/rooms/${state.currentRoom}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ message: message.trim() })
      })
      if (!res.ok) throw new Error('Failed to send message')
      const data = await res.json()
      // Add message to local state since we won't get socket event
      state.messages.push(data.message)
    } catch (err) {
      console.error('Error sending message:', err)
      state.error = err.message
    }
  },

  // Typing indicators
  startTyping() {
    if (state.currentRoom) {
      const socket = getSocket()
      if (socket.connected) {
        socket.emit('typing_start', state.currentRoom)
      }
    }
  },

  stopTyping() {
    if (state.currentRoom) {
      const socket = getSocket()
      if (socket.connected) {
        socket.emit('typing_stop', state.currentRoom)
      }
    }
  },

  // Clear error
  clearError() {
    state.error = null
  }
})
