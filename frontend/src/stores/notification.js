import { reactive } from 'vue'
import { io } from 'socket.io-client'
import { authFetch } from '../utilities/authFetch'

const state = reactive({
  socket: null,
  notifications: [],
  unreadCount: 0,
  pendingModals: [],
  silencedTypes: [],
  types: [],
  loading: false,
  error: null
})

// Get or create socket instance
function getSocket() {
  if (!state.socket) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
    state.socket = io(baseUrl, {
      withCredentials: true,
      autoConnect: false
    })

    state.socket.on('connect', () => {
      console.log('Notification socket connected')
    })

    state.socket.on('new_notification', (data) => {
      console.log('Received notification:', data)
      const notification = data.notification

      // Add to notifications if not already present
      const exists = state.notifications.some(n => n.id === notification.id)
      if (!exists) {
        state.notifications.unshift(notification)
        state.unreadCount++

        // If modal, add to pending modals
        if (notification.display_mode === 'modal') {
          state.pendingModals.push(notification)
        }
      }
    })

    state.socket.on('disconnect', () => {
      console.log('Notification socket disconnected')
    })
  }
  return state.socket
}

export const notifications = reactive({
  get list() {
    return state.notifications
  },
  get unreadCount() {
    return state.unreadCount
  },
  get pendingModals() {
    return state.pendingModals
  },
  get silencedTypes() {
    return state.silencedTypes
  },
  get types() {
    return state.types
  },
  get loading() {
    return state.loading
  },
  get error() {
    return state.error
  },
  get currentModal() {
    return state.pendingModals.length > 0 ? state.pendingModals[0] : null
  },

  // Connect to socket for real-time updates
  connect() {
    const socket = getSocket()
    if (!socket.connected) {
      socket.connect()
    }
  },

  disconnect() {
    if (state.socket) {
      state.socket.disconnect()
    }
  },

  // Fetch notifications from API
  async fetchNotifications() {
    state.loading = true
    try {
      const res = await authFetch('/api/notification/my')
      if (!res.ok) throw new Error('Failed to fetch notifications')
      const data = await res.json()
      state.notifications = data.notifications
      state.unreadCount = data.unread_count
      state.pendingModals = data.pending_modals
    } catch (err) {
      console.error('Error fetching notifications:', err)
      state.error = err.message
    } finally {
      state.loading = false
    }
  },

  // Fetch notification types
  async fetchTypes() {
    try {
      const res = await authFetch('/api/notification/types')
      if (!res.ok) throw new Error('Failed to fetch types')
      const data = await res.json()
      state.types = data.types
    } catch (err) {
      console.error('Error fetching notification types:', err)
    }
  },

  // Fetch silenced types
  async fetchSilencedTypes() {
    try {
      const res = await authFetch('/api/notification/silenced-types')
      if (!res.ok) throw new Error('Failed to fetch silenced types')
      const data = await res.json()
      state.silencedTypes = data.silenced_types
    } catch (err) {
      console.error('Error fetching silenced types:', err)
    }
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const res = await authFetch(`/api/notification/${notificationId}/read`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to mark as read')

      // Update local state
      const notification = state.notifications.find(n => n.id === notificationId)
      if (notification && !notification.read_at) {
        notification.read_at = new Date().toISOString()
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  },

  // Dismiss notification
  async dismiss(notificationId) {
    try {
      const res = await authFetch(`/api/notification/${notificationId}/dismiss`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to dismiss')

      // Update local state
      const notification = state.notifications.find(n => n.id === notificationId)
      if (notification) {
        notification.dismissed_at = new Date().toISOString()
        if (!notification.read_at) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      }

      // Remove from pending modals
      state.pendingModals = state.pendingModals.filter(n => n.id !== notificationId)
    } catch (err) {
      console.error('Error dismissing notification:', err)
    }
  },

  // Mark all as read
  async markAllAsRead() {
    try {
      const res = await authFetch('/api/notification/read-all', {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to mark all as read')

      // Update local state
      state.notifications.forEach(n => {
        if (!n.read_at) {
          n.read_at = new Date().toISOString()
        }
      })
      state.unreadCount = 0
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  },

  // Silence a notification type
  async silenceType(typeId) {
    try {
      const res = await authFetch(`/api/notification/type/${typeId}/silence`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to silence type')
      await this.fetchSilencedTypes()
    } catch (err) {
      console.error('Error silencing type:', err)
    }
  },

  // Unsilence a notification type
  async unsilenceType(typeId) {
    try {
      const res = await authFetch(`/api/notification/type/${typeId}/silence`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to unsilence type')
      await this.fetchSilencedTypes()
    } catch (err) {
      console.error('Error unsilencing type:', err)
    }
  },

  // Clear error
  clearError() {
    state.error = null
  },

  // Reset state (for logout)
  reset() {
    state.notifications = []
    state.unreadCount = 0
    state.pendingModals = []
    state.silencedTypes = []
    state.types = []
    state.error = null
    if (state.socket) {
      state.socket.disconnect()
      state.socket = null
    }
  }
})
