<script setup>
import { ref, onMounted } from 'vue'
import { chat } from '@/stores/chat.js'
import InviteModal from './InviteModal.vue'

const showCreateModal = ref(false)
const showEditModal = ref(false)
const showInviteModal = ref(false)
const inviteRoomId = ref(null)
const newRoomName = ref('')
const newRoomDescription = ref('')
const editingRoom = ref(null)
const formError = ref('')

onMounted(() => {
  chat.fetchInvites()
})

// Switch to a room
const selectRoom = async (room) => {
  if (chat.currentRoom !== room.id) {
    chat.leaveRoom()
    await chat.joinRoom(room.id)
  }
}

// Create room modal handlers
const openCreateModal = () => {
  newRoomName.value = ''
  newRoomDescription.value = ''
  formError.value = ''
  showCreateModal.value = true
}

const createRoom = async () => {
  if (!newRoomName.value.trim()) {
    formError.value = 'Room name is required'
    return
  }

  try {
    const room = await chat.createRoom(newRoomName.value, newRoomDescription.value)
    showCreateModal.value = false
    await chat.joinRoom(room.id)
  } catch (err) {
    formError.value = err.message
  }
}

// Edit room modal handlers
const openEditModal = (room) => {
  editingRoom.value = { ...room }
  formError.value = ''
  showEditModal.value = true
}

const updateRoom = async () => {
  if (!editingRoom.value.name.trim()) {
    formError.value = 'Room name is required'
    return
  }

  try {
    await chat.updateRoom(editingRoom.value.id, editingRoom.value.name, editingRoom.value.description)
    showEditModal.value = false
  } catch (err) {
    formError.value = err.message
  }
}

// Delete room
const deleteRoom = async (room) => {
  if (!confirm(`Are you sure you want to delete "${room.name}"?`)) {
    return
  }

  try {
    await chat.deleteRoom(room.id)
  } catch (err) {
    alert(err.message)
  }
}

// Accept invite
const acceptInvite = async (invite) => {
  try {
    const room = await chat.acceptInvite(invite.room_id)
    await chat.joinRoom(room.id)
  } catch (err) {
    alert(err.message)
  }
}

// Decline invite
const declineInvite = async (invite) => {
  try {
    await chat.declineInvite(invite.room_id)
  } catch (err) {
    alert(err.message)
  }
}

// Open invite modal
const openInviteModal = (room) => {
  inviteRoomId.value = room.id
  showInviteModal.value = true
}
</script>

<template>
  <div class="chat-sidebar">
    <div class="sidebar-header">
      <h3>Rooms</h3>
      <button
        v-if="chat.canCreateRoom"
        @click="openCreateModal"
        class="create-btn"
      >
        + Create
      </button>
    </div>

    <!-- Pending Invites -->
    <div v-if="chat.invites.length > 0" class="invites-section">
      <div class="section-header">Pending Invites</div>
      <ul class="invite-list">
        <li v-for="invite in chat.invites" :key="invite.room_id" class="invite-item">
          <div class="invite-info">
            <span class="room-name"># {{ invite.room_name }}</span>
            <span class="invited-by">from {{ invite.invited_by_handle }}</span>
          </div>
          <div class="invite-actions">
            <button @click="acceptInvite(invite)" class="icon-btn accept" title="Accept">Yes</button>
            <button @click="declineInvite(invite)" class="icon-btn decline" title="Decline">No</button>
          </div>
        </li>
      </ul>
    </div>

    <ul class="room-list">
      <li
        v-for="room in chat.rooms"
        :key="room.id"
        :class="{ active: chat.currentRoom === room.id }"
        @click="selectRoom(room)"
      >
        <span class="room-name"># {{ room.name }}</span>
        <div v-if="chat.isRoomOwner(room)" class="room-actions" @click.stop>
          <button @click="openInviteModal(room)" class="icon-btn" title="Invite">
            <span>Inv</span>
          </button>
          <button @click="openEditModal(room)" class="icon-btn" title="Edit">
            <span>Edit</span>
          </button>
          <button @click="deleteRoom(room)" class="icon-btn delete" title="Delete">
            <span>Del</span>
          </button>
        </div>
      </li>
    </ul>

    <!-- Create Room Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h2>Create New Room</h2>
        <form @submit.prevent="createRoom">
          <input
            v-model="newRoomName"
            placeholder="Room name"
            maxlength="64"
            required
          />
          <textarea
            v-model="newRoomDescription"
            placeholder="Description (optional)"
          ></textarea>
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Create</button>
            <button type="button" class="btn-secondary" @click="showCreateModal = false">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Room Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <h2>Edit Room</h2>
        <form @submit.prevent="updateRoom">
          <input
            v-model="editingRoom.name"
            placeholder="Room name"
            maxlength="64"
            required
          />
          <textarea
            v-model="editingRoom.description"
            placeholder="Description (optional)"
          ></textarea>
          <p v-if="formError" class="error">{{ formError }}</p>
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Save</button>
            <button type="button" class="btn-secondary" @click="showEditModal = false">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Invite Modal -->
    <InviteModal
      v-if="showInviteModal"
      :room-id="inviteRoomId"
      @close="showInviteModal = false"
    />
  </div>
</template>

<style scoped>
.chat-sidebar {
  width: 220px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #34495e;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.create-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
}

.create-btn:hover {
  background: #3aa876;
}

.room-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
  overflow-y: auto;
}

.room-list li {
  padding: 12px 15px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 3px solid transparent;
}

.room-list li:hover {
  background: #34495e;
}

.room-list li.active {
  background: #34495e;
  border-left-color: #42b983;
}

.room-name {
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-actions {
  display: none;
  gap: 4px;
}

.room-list li:hover .room-actions {
  display: flex;
}

.icon-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  padding: 3px 8px;
  font-size: 0.75em;
  border-radius: 3px;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.icon-btn.delete:hover {
  background: #c0392b;
}

/* Modal styles */
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
  color: #333;
  padding: 25px;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
}

.modal h2 {
  margin-top: 0;
  margin-bottom: 20px;
}

.modal input,
.modal textarea {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
  box-sizing: border-box;
}

.modal textarea {
  height: 80px;
  resize: vertical;
}

.error {
  color: #c0392b;
  font-size: 0.9em;
  margin: 0 0 10px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 15px;
}

.btn-primary {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #3aa876;
}

.btn-secondary {
  background: #ddd;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #ccc;
}

/* Invites section */
.invites-section {
  border-bottom: 1px solid #34495e;
  padding-bottom: 10px;
}

.section-header {
  padding: 10px 15px 5px;
  font-size: 0.85em;
  color: #95a5a6;
  text-transform: uppercase;
}

.invite-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.invite-item {
  padding: 8px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(66, 185, 131, 0.1);
  border-left: 3px solid #42b983;
}

.invite-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.invited-by {
  font-size: 0.75em;
  color: #95a5a6;
}

.invite-actions {
  display: flex;
  gap: 4px;
}

.icon-btn.accept {
  background: #42b983;
}

.icon-btn.accept:hover {
  background: #3aa876;
}

.icon-btn.decline {
  background: #95a5a6;
}

.icon-btn.decline:hover {
  background: #7f8c8d;
}
</style>
