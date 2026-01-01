<template>
  <div class="header-notifications" v-if="notifications.length > 0">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="header-notification"
      @click="dismiss(notification.id)"
    >
      <div class="notification-content">
        <strong>{{ notification.name }}</strong>
        <span v-if="notification.description"> - {{ notification.description }}</span>
      </div>
      <span class="dismiss-hint">Click to dismiss</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { notificationStore } from '@/stores/notification'

const notifications = computed(() => notificationStore.headerNotifications)

function dismiss(id) {
  notificationStore.dismissNotification(id)
}
</script>

<style scoped>
.header-notifications {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.header-notification {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  transition: background 0.2s ease;
}

.header-notification:hover {
  background: linear-gradient(135deg, #2980b9, #1a5276);
}

.notification-content {
  flex: 1;
}

.notification-content strong {
  font-weight: 600;
}

.dismiss-hint {
  font-size: 0.8em;
  opacity: 0.8;
  margin-left: 20px;
}
</style>
