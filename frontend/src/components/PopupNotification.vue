<template>
  <div class="popup-overlay" v-if="notification">
    <div class="popup-modal">
      <h2 class="popup-title">{{ notification.name }}</h2>
      <div class="popup-description" v-if="notification.description">
        {{ notification.description }}
      </div>
      <button class="popup-button" @click="acknowledge">Acknowledge</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { notificationStore } from '@/stores/notification'

const notification = computed(() => notificationStore.currentPopup)

function acknowledge() {
  if (notification.value) {
    notificationStore.dismissNotification(notification.value.id)
  }
}
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.popup-modal {
  background: white;
  padding: 30px 40px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.popup-title {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.popup-description {
  color: #555;
  margin-bottom: 25px;
  line-height: 1.6;
  text-align: left;
  white-space: pre-wrap;
}

.popup-button {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.popup-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
}

.popup-button:active {
  transform: translateY(0);
}
</style>
