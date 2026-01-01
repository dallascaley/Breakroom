<template>
  <section>
    <h1>Manage Notifications</h1>

    <!-- Add Notification Type Form -->
    <form @submit.prevent="createNotificationType" class="create-form">
      <div class="form-row">
        <input v-model="newNotification.name" placeholder="Name" required />
        <select v-model="newNotification.display_type">
          <option value="header">Header</option>
          <option value="popup">Popup</option>
        </select>
        <select v-model="newNotification.event_id">
          <option :value="null">-- No Event Trigger --</option>
          <option v-for="et in eventTypes" :key="et.id" :value="et.id">
            {{ et.type }}
          </option>
        </select>
      </div>
      <div class="form-row">
        <textarea v-model="newNotification.description" placeholder="Description (max 1000 chars)" maxlength="1000"></textarea>
      </div>
      <div class="form-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="repeatForever" />
          Repeat Forever
        </label>
        <template v-if="!repeatForever">
          <label class="repeat-label">
            Show max
            <input type="number" v-model.number="repeatCount" min="1" class="repeat-input" />
            times per user
          </label>
        </template>
      </div>
      <div class="form-row">
        <label class="group-label">Target Groups:</label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="targetAllUsers" />
          All Users
        </label>
        <template v-if="!targetAllUsers">
          <label v-for="group in groups" :key="group.id" class="checkbox-label">
            <input type="checkbox" :value="group.id" v-model="selectedGroupIds" />
            {{ group.name }}
          </label>
        </template>
      </div>
      <div class="form-row">
        <label class="group-label">Target Individuals:</label>
        <label class="checkbox-label">
          <input type="checkbox" value="trigger_user" v-model="selectedTargetUsers" />
          Event Trigger User
        </label>
        <label class="checkbox-label">
          <input type="checkbox" value="trigger_user_friends" v-model="selectedTargetUsers" />
          Event Trigger User's Friends
        </label>
      </div>
      <button type="submit">Add Notification Type</button>
      <p v-if="formError" class="error">{{ formError }}</p>
    </form>

    <!-- Notification Types Table -->
    <DataFetcher :key="fetchKey" endpoint="/api/notification/notification-types" v-slot="{ data }">
      <template v-if="data && data.notificationTypes">
        <div v-show="false">{{ updateNotificationTypes(data.notificationTypes) }}</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Display</th>
              <th>Event</th>
              <th>Repeat</th>
              <th>Target Groups</th>
              <th>Target Individuals</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="nt in data.notificationTypes" :key="nt.id">
              <td>{{ nt.id }}</td>
              <td>{{ nt.name }}</td>
              <td>{{ nt.display_type }}</td>
              <td>{{ nt.event_type || '-' }}</td>
              <td>{{ nt.repeat_rule }}</td>
              <td>{{ formatGroups(nt) }}</td>
              <td>{{ formatTargetUsers(nt) }}</td>
              <td>{{ nt.is_active ? 'Yes' : 'No' }}</td>
              <td>
                <button @click="editNotificationType(nt)">Edit</button>
                <button @click="deleteNotificationType(nt.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </DataFetcher>

    <!-- Edit Notification Type Modal -->
    <div v-if="editingNotification" class="modal-overlay">
      <div class="modal">
        <h2>Edit Notification Type</h2>
        <form @submit.prevent="updateNotificationType">
          <label>Name:
            <input v-model="editingNotification.name" placeholder="Name" required />
          </label>
          <label>Description:
            <textarea v-model="editingNotification.description" placeholder="Description" maxlength="1000"></textarea>
          </label>
          <label>Display Type:
            <select v-model="editingNotification.display_type">
              <option value="header">Header</option>
              <option value="popup">Popup</option>
            </select>
          </label>
          <label>Event Trigger:
            <select v-model="editingNotification.event_id">
              <option :value="null">-- No Event Trigger --</option>
              <option v-for="et in eventTypes" :key="et.id" :value="et.id">
                {{ et.type }}
              </option>
            </select>
          </label>
          <div class="repeat-section">
            <label class="checkbox-label inline">
              <input type="checkbox" v-model="editRepeatForever" />
              Repeat Forever
            </label>
            <template v-if="!editRepeatForever">
              <label class="repeat-label">
                Show max
                <input type="number" v-model.number="editRepeatCount" min="1" class="repeat-input" />
                times per user
              </label>
            </template>
          </div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="editingNotification.is_active" />
            Active
          </label>
          <div class="group-section">
            <h4>Target Groups:</h4>
            <label class="checkbox-label">
              <input type="checkbox" v-model="editTargetAllUsers" />
              All Users
            </label>
            <template v-if="!editTargetAllUsers">
              <label v-for="group in groups" :key="group.id" class="checkbox-label">
                <input type="checkbox" :value="group.id" v-model="editSelectedGroupIds" />
                {{ group.name }}
              </label>
            </template>
          </div>
          <div class="group-section">
            <h4>Target Individuals:</h4>
            <label class="checkbox-label">
              <input type="checkbox" value="trigger_user" v-model="editSelectedTargetUsers" />
              Event Trigger User
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="trigger_user_friends" v-model="editSelectedTargetUsers" />
              Event Trigger User's Friends
            </label>
          </div>
          <div class="modal-buttons">
            <button type="submit">Save</button>
            <button type="button" @click="cancelEdit">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import DataFetcher from '@/components/DataFetcher.vue'

const newNotification = ref({
  name: '',
  description: '',
  display_type: 'header',
  event_id: null
})
const editingNotification = ref(null)
const existingNotificationTypes = ref([])
const eventTypes = ref([])
const groups = ref([])
const formError = ref('')
const fetchKey = ref(0)

// Repeat rule state for create form
const repeatForever = ref(true)
const repeatCount = ref(1)

// Repeat rule state for edit form
const editRepeatForever = ref(true)
const editRepeatCount = ref(1)

// Target groups state
const targetAllUsers = ref(true)
const selectedGroupIds = ref([])
const editTargetAllUsers = ref(true)
const editSelectedGroupIds = ref([])

// Target individuals state
const selectedTargetUsers = ref([])
const editSelectedTargetUsers = ref([])

// Computed repeat_rule for create form
const computedRepeatRule = computed(() => {
  return repeatForever.value ? 'forever' : String(repeatCount.value)
})

// Computed repeat_rule for edit form
const computedEditRepeatRule = computed(() => {
  return editRepeatForever.value ? 'forever' : String(editRepeatCount.value)
})

// Format target users for display
function formatTargetUsers(nt) {
  if (!nt.target_users || nt.target_users.length === 0) return '-'
  return nt.target_users.map(t => {
    if (t === 'trigger_user') return 'Trigger User'
    if (t === 'trigger_user_friends') return "Trigger User's Friends"
    return t
  }).join(', ')
}

// Format groups for display
function formatGroups(nt) {
  if (nt.target_users && nt.target_users.length > 0) return '-'
  if (nt.groups.length === 0) return 'All Users'
  return nt.groups.map(g => g.name).join(', ')
}

onMounted(async () => {
  // Fetch event types
  try {
    const res = await fetch('/api/notification/event-types')
    if (res.ok) {
      const data = await res.json()
      eventTypes.value = data.eventTypes
    }
  } catch (err) {
    console.error('Failed to fetch event types:', err)
  }

  // Fetch groups
  try {
    const res = await fetch('/api/group/all')
    if (res.ok) {
      const data = await res.json()
      groups.value = data.groups
    }
  } catch (err) {
    console.error('Failed to fetch groups:', err)
  }
})

function updateNotificationTypes(types) {
  existingNotificationTypes.value = types
  return ''
}

async function createNotificationType() {
  const { name } = newNotification.value

  if (!name) {
    formError.value = 'Name is required.'
    return
  }

  formError.value = ''

  try {
    const payload = {
      ...newNotification.value,
      repeat_rule: computedRepeatRule.value,
      group_ids: targetAllUsers.value ? [] : selectedGroupIds.value,
      target_users: selectedTargetUsers.value
    }

    const res = await fetch('/api/notification/notification-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error('Failed to create notification type')
    }

    // Reset form
    newNotification.value = {
      name: '',
      description: '',
      display_type: 'header',
      event_id: null
    }
    repeatForever.value = true
    repeatCount.value = 1
    targetAllUsers.value = true
    selectedGroupIds.value = []
    selectedTargetUsers.value = []
    fetchKey.value++
  } catch (err) {
    console.error(err)
    formError.value = 'An error occurred while creating the notification type.'
  }
}

function editNotificationType(nt) {
  editingNotification.value = { ...nt }

  // Set repeat rule state
  if (nt.repeat_rule === 'forever') {
    editRepeatForever.value = true
    editRepeatCount.value = 1
  } else {
    editRepeatForever.value = false
    editRepeatCount.value = parseInt(nt.repeat_rule, 10) || 1
  }

  // Set group selection state
  if (nt.groups.length === 0) {
    editTargetAllUsers.value = true
    editSelectedGroupIds.value = []
  } else {
    editTargetAllUsers.value = false
    editSelectedGroupIds.value = nt.groups.map(g => g.id)
  }

  // Set target users state
  editSelectedTargetUsers.value = nt.target_users || []
}

function cancelEdit() {
  editingNotification.value = null
}

async function updateNotificationType() {
  const nt = editingNotification.value

  try {
    const payload = {
      ...nt,
      repeat_rule: computedEditRepeatRule.value,
      group_ids: editTargetAllUsers.value ? [] : editSelectedGroupIds.value,
      target_users: editSelectedTargetUsers.value
    }

    const res = await fetch(`/api/notification/notification-types/${nt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error('Failed to update notification type')
    }

    editingNotification.value = null
    fetchKey.value++
  } catch (err) {
    console.error(err)
  }
}

async function deleteNotificationType(id) {
  if (!confirm('Are you sure you want to delete this notification type?')) return

  try {
    const res = await fetch(`/api/notification/notification-types/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!res.ok) {
      throw new Error('Failed to delete notification type')
    }

    fetchKey.value++
  } catch (err) {
    console.error(err)
  }
}
</script>

<style scoped>
.create-form {
  margin-bottom: 20px;
}

.form-row {
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.form-row input,
.form-row select {
  padding: 8px;
}

.form-row textarea {
  width: 100%;
  min-height: 60px;
  padding: 8px;
}

.group-label {
  font-weight: bold;
  margin-right: 10px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 15px;
}

.checkbox-label.inline {
  display: inline-flex;
}

.repeat-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.repeat-input {
  width: 70px;
  padding: 6px;
}

.repeat-section {
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.error {
  color: red;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}

thead {
  background-color: #f4f4f4;
}

button {
  margin-right: 5px;
}

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
  padding: 20px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal input,
.modal textarea,
.modal select {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.modal .repeat-input {
  width: 70px;
}

.modal label {
  display: block;
  margin-bottom: 10px;
}

.group-section {
  margin: 15px 0;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
}

.group-section h4 {
  margin: 0 0 10px 0;
}

.modal-buttons {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}
</style>
