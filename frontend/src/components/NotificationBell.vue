<template>
  <div class="notification-bell" @click="toggleDropdown">
    <div class="bell-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span v-if="notifications.unreadCount > 0" class="badge">
        {{ notifications.unreadCount > 99 ? '99+' : notifications.unreadCount }}
      </span>
    </div>

    <div v-if="showDropdown" class="dropdown" @click.stop>
      <div class="dropdown-header">
        <h3>Notifications</h3>
        <button v-if="notifications.unreadCount > 0" @click="markAllRead" class="mark-all-read">
          Mark all read
        </button>
      </div>

      <div class="dropdown-content">
        <div v-if="notifications.loading" class="loading">Loading...</div>

        <div v-else-if="displayedNotifications.length === 0" class="empty">
          No notifications
        </div>

        <div v-else class="notification-list">
          <div
            v-for="notification in displayedNotifications"
            :key="notification.id"
            class="notification-item"
            :class="{ unread: !notification.read_at && !notification.dismissed_at }"
            @click="handleClick(notification)"
          >
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-preview">{{ truncate(notification.content, 60) }}</div>
              <div class="notification-time">{{ formatTime(notification.created_at) }}</div>
            </div>
            <button
              class="dismiss-btn"
              @click.stop="dismiss(notification.id)"
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { notifications } from '@/stores/notification'

const showDropdown = ref(false)

const displayedNotifications = computed(() => {
  // Show simple notifications only (modals are shown via modal component)
  return notifications.list
    .filter(n => n.display_mode === 'simple' && !n.dismissed_at)
    .slice(0, 10)
})

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function handleClick(notification) {
  if (!notification.read_at) {
    notifications.markAsRead(notification.id)
  }
}

function dismiss(notificationId) {
  notifications.dismiss(notificationId)
}

function markAllRead() {
  notifications.markAllAsRead()
}

function truncate(text, length) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

function formatTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

// Close dropdown when clicking outside
function handleClickOutside(e) {
  if (!e.target.closest('.notification-bell')) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.notification-bell {
  position: relative;
  cursor: pointer;
  padding: 0.5rem;
}

.bell-icon {
  position: relative;
  color: rgba(255, 255, 255, 0.85);
}

.bell-icon:hover {
  color: #42b983;
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #e74c3c;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.dropdown::before {
  content: '';
  position: absolute;
  top: -6px;
  right: 16px;
  width: 12px;
  height: 12px;
  background: white;
  transform: rotate(45deg);
  box-shadow: -2px -2px 4px rgba(0, 0, 0, 0.05);
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.mark-all-read {
  background: none;
  border: none;
  color: #42b983;
  font-size: 12px;
  cursor: pointer;
}

.mark-all-read:hover {
  text-decoration: underline;
}

.dropdown-content {
  max-height: 400px;
  overflow-y: auto;
}

.loading, .empty {
  padding: 24px;
  text-align: center;
  color: #888;
}

.notification-list {
  padding: 8px 0;
}

.notification-item {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.notification-item:hover {
  background-color: #f5f5f5;
}

.notification-item.unread {
  background-color: #f0f9f4;
}

.notification-item.unread:hover {
  background-color: #e0f3e8;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
}

.notification-preview {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 11px;
  color: #999;
}

.dismiss-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 8px;
}

.dismiss-btn:hover {
  color: #e74c3c;
}
</style>
